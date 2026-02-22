/**
 * GameSimulator — Headless game loop for balance testing
 * Re-implements main.js game rules without any browser dependencies.
 */

import { RunState, CHARACTER_STATS, CHAPTER_CONFIG } from '../web/js/game/run-state.js';
import { loadDungeon } from '../web/js/game/grid.js';
import { Agent } from '../web/js/game/agent.js';
import { TileType, isPassable, isLethal } from '../web/js/game/tiles.js';
import {
    CHARACTERS, DUNGEON_CONFIG, DUNGEON_ORDER, BASE_OP_COST,
    MAX_EPISODES, CONVERGENCE_WINDOW, CONVERGENCE_THRESHOLD,
    createAlgorithm, getDungeonLevel, getOperatingCost
} from '../web/js/game/game-config.js';

// HP-aware BFS pathfinder: finds shortest path from start to goal
// Returns { path: [{x,y},...], steps, finalHp } or null if unreachable
function findPath(grid, maxHp) {
    const start = grid.startPos;
    if (!start) return null;

    // State: (x, y, hp) — hp in multiples of 10
    const hpBucket = (hp) => Math.floor(hp / 10);
    const maxBucket = hpBucket(maxHp);
    const key = (x, y, hb) => `${x},${y},${hb}`;

    const visited = new Set();
    const queue = [{ x: start.x, y: start.y, hp: maxHp, path: [{ x: start.x, y: start.y }] }];
    visited.add(key(start.x, start.y, maxBucket));

    const deltas = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (queue.length > 0) {
        const cur = queue.shift();

        for (const [dx, dy] of deltas) {
            const nx = cur.x + dx, ny = cur.y + dy;
            if (!grid.isValidPosition(nx, ny)) continue;

            const tile = grid.getTile(nx, ny);
            if (!isPassable(tile)) continue;
            if (isLethal(tile)) continue; // skip pits

            let newHp = cur.hp;
            if (tile === TileType.TRAP) newHp -= 10;
            else if (tile === TileType.MONSTER) newHp -= 30;
            else if (tile === TileType.HEAL) newHp = Math.min(newHp + 10, maxHp);

            if (newHp <= 0) continue; // would die

            const hb = hpBucket(newHp);
            const k = key(nx, ny, hb);
            if (visited.has(k)) continue;
            visited.add(k);

            const newPath = [...cur.path, { x: nx, y: ny }];

            if (tile === TileType.GOAL) {
                return { path: newPath, steps: newPath.length - 1, finalHp: newHp };
            }

            queue.push({ x: nx, y: ny, hp: newHp, path: newPath });
        }
    }

    return null; // no safe path
}

// Human imperfection: extra step multiplier (exploration, backtracking)
const HUMAN_STEP_MULTIPLIER = 1.3;

// Estimate manual play cost (food = steps, food costs 1G each)
export function estimateManualCost(grid, maxHp) {
    const result = findPath(grid, maxHp);
    if (!result) return null;
    const humanSteps = Math.ceil(result.steps * HUMAN_STEP_MULTIPLIER);
    // Estimate success rate for the strategy to make informed decisions
    let successRate = 0.95;
    if (result.steps > 20) successRate -= (result.steps - 20) * 0.002;
    const hpLost = maxHp - result.finalHp;
    successRate -= (hpLost / 10) * 0.03;
    if (grid.slippery) successRate *= 0.4;
    successRate = Math.max(0.05, Math.min(successRate, 0.95));
    return { steps: result.steps, humanSteps, goldCost: humanSteps, finalHp: result.finalHp, successRate };
}

export class GameSimulator {
    constructor(strategy) {
        this.runState = new RunState();
        this.strategy = strategy;
        this.log = [];
        this.turnNumber = 0;
        this.grids = {};  // cached grids per dungeon
        // Reset strategy state for new playthrough
        if (strategy._manualFailCounts) {
            strategy._manualFailCounts = {};
        }
    }

    // Get or load a dungeon grid (cached)
    getGrid(dungeonId) {
        if (!this.grids[dungeonId]) {
            const grid = loadDungeon(dungeonId);
            const config = DUNGEON_CONFIG[dungeonId];
            if (config && config.maxSteps) {
                grid.suggestedMaxSteps = config.maxSteps;
            }
            if (config && config.slippery) {
                grid.slippery = true;
            }
            this.grids[dungeonId] = grid;
        }
        return this.grids[dungeonId];
    }

    // Run a full playthrough, returns stats
    runPlaythrough(maxTurns = 500) {
        while (this.turnNumber < maxTurns) {
            const action = this.executeTurn();
            if (!action) break; // strategy says done or stuck
            if (this.runState.isAllDungeonsCleared()) break;
        }
        return this.getStats();
    }

    // Execute one turn: ask strategy, perform action, log
    executeTurn() {
        const state = this._getState();
        const decision = this.strategy.decide(state);

        if (!decision) return null;

        this.turnNumber++;
        let entry = { turn: this.turnNumber, type: decision.type, goldBefore: this.runState.gold };

        switch (decision.type) {
            case 'train': {
                const result = this.trainDungeon(decision.dungeonId, decision.charName);
                entry.dungeon = decision.dungeonId;
                entry.charName = decision.charName;
                entry.converged = result.converged;
                entry.episodes = result.episodes;
                entry.goldSpent = result.goldSpent;
                entry.firstClear = result.firstClear;
                break;
            }
            case 'farm': {
                const result = this._executeFarmingRound();
                entry.income = result.totalIncome;
                entry.farms = result.farms;
                break;
            }
            case 'hire': {
                const success = this.runState.hireCharacter(decision.charName);
                entry.charName = decision.charName;
                entry.success = success;
                break;
            }
            case 'upgrade': {
                const success = this.runState.upgradeCharacter(decision.charName);
                entry.charName = decision.charName;
                entry.success = success;
                break;
            }
            case 'mapSell': {
                const earned = this.runState.sellMap(decision.dungeonId, DUNGEON_CONFIG);
                entry.dungeon = decision.dungeonId;
                entry.earned = earned;
                this._pendingMapChoice = null;
                break;
            }
            case 'mapKeep': {
                this.runState.keepMap(decision.dungeonId);
                entry.dungeon = decision.dungeonId;
                this._pendingMapChoice = null;
                break;
            }
            case 'assignFarm': {
                this.runState.assignFarming(decision.charName, decision.dungeonId, DUNGEON_CONFIG);
                entry.charName = decision.charName;
                entry.dungeon = decision.dungeonId;
                break;
            }
            case 'removeFarm': {
                this.runState.removeFarming(decision.charName);
                entry.charName = decision.charName;
                break;
            }
            case 'buyFood': {
                const amount = decision.amount || 50;
                const success = this.runState.buyFood(amount);
                entry.amount = amount;
                entry.success = success;
                break;
            }
            case 'manual': {
                const result = this.manualPlayDungeon(decision.dungeonId);
                entry.dungeon = decision.dungeonId;
                entry.success = result.success;
                entry.reason = result.reason;
                entry.foodUsed = result.foodUsed;
                entry.steps = result.steps;
                entry.firstClear = result.firstClear;
                // Track manual failures for strategy adaptation
                if (!result.success && result.reason === 'player_failed') {
                    if (this.strategy._manualFailCounts) {
                        this.strategy._manualFailCounts[decision.dungeonId] =
                            (this.strategy._manualFailCounts[decision.dungeonId] || 0) + 1;
                    }
                }
                break;
            }
            case 'done':
                return null;
            default:
                return null;
        }

        entry.goldAfter = this.runState.gold;
        this.log.push(entry);
        return entry;
    }

    // Train a dungeon with a character (instant training, re-implements main.js logic)
    trainDungeon(dungeonId, charName) {
        const config = DUNGEON_CONFIG[dungeonId] || {};
        const grid = this.getGrid(dungeonId);
        const opCost = getOperatingCost(charName, dungeonId);

        // Apply agility multiplier
        const agilityMul = this.runState.getAgilityMultiplier(charName);
        const epsilonDecay = Math.pow(0.995, agilityMul);

        const algo = createAlgorithm(charName, grid, config, {
            alpha: 0.1,
            gamma: 0.99,
            epsilon: 1.0,
            epsilonMin: 0.01,
            epsilonDecay
        });

        let episode = 0;
        const recentResults = [];
        let goldSpent = 0;
        let converged = false;

        while (episode < MAX_EPISODES) {
            // Check gold
            if (this.runState.gold < opCost) break;

            const result = algo.runEpisode();
            this.runState.totalSteps += (result.steps || 0);

            // Deduct operating cost
            this.runState.gold -= opCost;
            goldSpent += opCost;

            episode++;
            recentResults.push(result.success);
            if (recentResults.length > CONVERGENCE_WINDOW) {
                recentResults.shift();
            }

            // Check convergence
            if (recentResults.length >= CONVERGENCE_WINDOW) {
                const successCount = recentResults.filter(r => r).length;
                if (successCount / recentResults.length >= CONVERGENCE_THRESHOLD) {
                    converged = true;
                    break;
                }
            }
        }

        // Reconstruct answer path if converged
        let firstClear = false;
        if (converged) {
            const answerPath = this._reconstructAnswerPath(algo, grid, charName);
            if (answerPath) {
                this.runState.recordAnswerPath(dungeonId, answerPath.actions, answerPath.steps, charName);
            }

            // Record serpa clear
            this.runState.recordSerpaClear(charName);

            // First clear handling
            if (!this.runState.clearedDungeons.has(dungeonId)) {
                firstClear = true;
                this.runState.clearedDungeons.add(dungeonId);

                // Give first clear reward
                this.runState.gold += config.firstReward || 0;

                // Unlock next dungeon
                const currentIndex = DUNGEON_ORDER.indexOf(dungeonId);
                if (currentIndex >= 0 && currentIndex < DUNGEON_ORDER.length - 1) {
                    const nextDungeon = DUNGEON_ORDER[currentIndex + 1];
                    this.runState.unlockedDungeons.add(nextDungeon);
                }

                // Map choice: delegate to strategy via pending decision
                this._pendingMapChoice = dungeonId;
            } else {
                // Repeat clear reward
                this.runState.gold += config.repeatReward || 0;
            }
        }

        return { converged, episodes: episode, goldSpent, firstClear };
    }

    // Simulate manual play: human player navigates dungeon using BFS path
    // Models human imperfection: longer paths, slippery grids, and damage reduce success rate
    manualPlayDungeon(dungeonId) {
        const config = DUNGEON_CONFIG[dungeonId] || {};
        const grid = this.getGrid(dungeonId);
        const maxHp = 100;

        const pathResult = findPath(grid, maxHp);
        if (!pathResult) {
            return { success: false, reason: 'no_safe_path', foodUsed: 0 };
        }

        // Human imperfection model: success probability decreases with difficulty
        const baseSuccessRate = 0.95;
        let successRate = baseSuccessRate;

        // Longer paths = more room for error (lose ~2% per 10 steps beyond 20)
        if (pathResult.steps > 20) {
            successRate -= (pathResult.steps - 20) * 0.002;
        }

        // HP damage reduces confidence (lose ~3% per 10 HP lost)
        const hpLost = maxHp - pathResult.finalHp;
        successRate -= (hpLost / 10) * 0.03;

        // Slippery grids are much harder to manually navigate
        if (grid.slippery) {
            successRate *= 0.4; // only 40% as likely
        }

        successRate = Math.max(0.05, Math.min(successRate, 0.95));

        // Human takes extra steps (exploration, backtracking)
        const humanSteps = Math.ceil(pathResult.steps * HUMAN_STEP_MULTIPLIER);
        const foodNeeded = humanSteps;

        // Check food
        if (this.runState.food < foodNeeded) {
            return { success: false, reason: 'not_enough_food', foodNeeded, foodHave: this.runState.food };
        }

        // Consume food (whether success or failure — failed attempt still costs food)
        this.runState.food -= foodNeeded;
        this.runState.totalSteps += humanSteps;

        // Roll for success
        if (Math.random() > successRate) {
            return { success: false, reason: 'player_failed', foodUsed: foodNeeded, successRate };
        }

        // Generate answer path
        const actions = [];
        for (let i = 1; i < pathResult.path.length; i++) {
            const prev = pathResult.path[i - 1];
            const curr = pathResult.path[i];
            const dx = curr.x - prev.x, dy = curr.y - prev.y;
            if (dy === -1) actions.push(0);
            else if (dy === 1) actions.push(1);
            else if (dx === -1) actions.push(2);
            else actions.push(3);
        }

        this.runState.recordAnswerPath(dungeonId, actions, pathResult.steps, 'player');

        let firstClear = false;
        if (!this.runState.clearedDungeons.has(dungeonId)) {
            firstClear = true;
            this.runState.clearedDungeons.add(dungeonId);
            this.runState.gold += config.firstReward || 0;

            const currentIndex = DUNGEON_ORDER.indexOf(dungeonId);
            if (currentIndex >= 0 && currentIndex < DUNGEON_ORDER.length - 1) {
                this.runState.unlockedDungeons.add(DUNGEON_ORDER[currentIndex + 1]);
            }
            this._pendingMapChoice = dungeonId;
        } else {
            this.runState.gold += config.repeatReward || 0;
        }

        return { success: true, steps: pathResult.steps, humanSteps, foodUsed: foodNeeded, firstClear, successRate };
    }

    // Reconstruct answer path (greedy run, epsilon=0)
    _reconstructAnswerPath(algo, grid, charName) {
        const startPos = grid.startPos;
        if (!startPos) return null;

        const maxSteps = grid.suggestedMaxSteps || 200;
        const maxHp = this.runState.getMaxHp(charName);
        const agent = new Agent(startPos.x, startPos.y, maxHp, maxHp);

        const savedEpsilon = algo.epsilon;
        algo.epsilon = 0;

        let steps = 0;
        let success = false;

        while (steps < maxSteps) {
            const action = algo.chooseAction
                ? algo.chooseAction(agent.x, agent.y, agent.hp)
                : algo.stepAction(agent.x, agent.y, agent.hp);

            const result = agent.move(action, grid);
            steps++;

            if (result.done) {
                if (agent.hp > 0 && grid.getTile(agent.x, agent.y) === TileType.GOAL) {
                    success = true;
                }
                break;
            }
        }

        algo.epsilon = savedEpsilon;

        if (success) {
            return { actions: agent.actionHistory, steps };
        }
        return null;
    }

    // Execute one round of farming for all assigned characters
    _executeFarmingRound() {
        let totalIncome = 0;
        const farms = [];

        for (const [charName, dungeonId] of Object.entries(this.runState.farmingAssignments)) {
            const result = this.runState.executeFarming(charName, DUNGEON_CONFIG);
            totalIncome += result.gold;
            farms.push({ charName, dungeonId, gold: result.gold });
        }

        return { totalIncome, farms };
    }

    // Check if there's a pending map choice
    hasPendingMapChoice() {
        return !!this._pendingMapChoice;
    }

    // Get pending map choice dungeon
    getPendingMapChoice() {
        const d = this._pendingMapChoice;
        this._pendingMapChoice = null;
        return d;
    }

    // Build state object for strategy
    _getState() {
        // List available (free or hired) characters
        const availableChars = Object.keys(CHARACTERS).filter(
            name => this.runState.isCharacterAvailable(name)
        );

        // List hireable characters (locked but not hidden)
        const hireableChars = Object.keys(CHARACTERS).filter(
            name => this.runState.isCharacterLocked(name)
        );

        // Next uncleared dungeon
        const nextUncleared = DUNGEON_ORDER.find(
            id => this.runState.unlockedDungeons.has(id) && !this.runState.clearedDungeons.has(id)
        );

        // Cheapest available character for a given dungeon
        const getCheapestChar = (dungeonId) => {
            let best = null;
            let bestCost = Infinity;
            for (const charName of availableChars) {
                if (this.runState.isFarming(charName)) continue;
                const cost = getOperatingCost(charName, dungeonId);
                if (cost < bestCost) {
                    bestCost = cost;
                    best = charName;
                }
            }
            return best;
        };

        return {
            gold: this.runState.gold,
            food: this.runState.food,
            clearedDungeons: new Set(this.runState.clearedDungeons),
            unlockedDungeons: new Set(this.runState.unlockedDungeons),
            availableChars,
            hireableChars,
            answerPaths: this.runState.answerPaths,
            farmingAssignments: { ...this.runState.farmingAssignments },
            mapStatus: { ...this.runState.mapStatus },
            characterLevels: { ...this.runState.characterLevels },
            turnNumber: this.turnNumber,
            nextUncleared,
            getCheapestChar,
            pendingMapChoice: this._pendingMapChoice || null,
            currentChapter: this.runState.getCurrentChapter(),
            clearedCount: this.runState.getClearedCount(),
            totalDungeons: DUNGEON_ORDER.length,
            dungeonConfig: DUNGEON_CONFIG,
            dungeonOrder: DUNGEON_ORDER,
            getOperatingCost,
            getStrength: (name) => this.runState.getStrength(name),
            canUpgrade: (name) => this.runState.canUpgradeCharacter(name),
            canFarm: (charName, dungeonId) => this.runState.canFarm(charName, dungeonId, DUNGEON_CONFIG),
            isFarming: (charName) => this.runState.isFarming(charName),
            getHireCost: (name) => this.runState.getHireCost(name),
            // Manual play helpers
            getManualCost: (dungeonId) => {
                const grid = this.getGrid(dungeonId);
                return estimateManualCost(grid, 100);
            },
        };
    }

    // Collect stats
    getStats() {
        const trainLogs = this.log.filter(l => l.type === 'train');
        const farmLogs = this.log.filter(l => l.type === 'farm');
        const manualLogs = this.log.filter(l => l.type === 'manual');

        // Dungeon-level training cost breakdown
        const dungeonCosts = {};
        for (const l of trainLogs) {
            if (!dungeonCosts[l.dungeon]) {
                dungeonCosts[l.dungeon] = { goldSpent: 0, episodes: 0, attempts: 0, converged: false };
            }
            dungeonCosts[l.dungeon].goldSpent += l.goldSpent;
            dungeonCosts[l.dungeon].episodes += l.episodes;
            dungeonCosts[l.dungeon].attempts++;
            if (l.converged) dungeonCosts[l.dungeon].converged = true;
        }

        // Chapter reach turns
        const chapterReachTurns = {};
        const allClearLogs = [...trainLogs, ...manualLogs];
        const clearOrder = allClearLogs.filter(l => l.firstClear).map(l => ({ turn: l.turn, dungeon: l.dungeon, method: l.type }))
            .sort((a, b) => a.turn - b.turn);
        for (const cl of clearOrder) {
            for (const ch of CHAPTER_CONFIG) {
                if (ch.dungeons.includes(cl.dungeon) && !chapterReachTurns[ch.chapter]) {
                    chapterReachTurns[ch.chapter] = cl.turn;
                }
            }
        }

        return {
            cleared: this.runState.getClearedCount(),
            totalDungeons: DUNGEON_ORDER.length,
            totalTurns: this.turnNumber,
            totalSteps: this.runState.totalSteps,
            deaths: this.runState.deathCount,
            finalGold: this.runState.gold,
            goldHistory: this.log.map(l => ({ turn: l.turn, gold: l.goldAfter })),
            clearedOrder: clearOrder,
            farmingIncome: farmLogs.reduce((s, l) => s + l.income, 0),
            totalTrainingCost: trainLogs.reduce((s, l) => s + l.goldSpent, 0),
            dungeonCosts,
            chapterReachTurns,
            manualClears: manualLogs.filter(l => l.firstClear).length,
            manualAttempts: manualLogs.length,
            manualFailures: manualLogs.filter(l => !l.success).length,
            totalFoodUsed: manualLogs.reduce((s, l) => s + (l.foodUsed || 0), 0),
            bottlenecks: this._findBottlenecks(dungeonCosts)
        };
    }

    // Identify dungeons that are disproportionately expensive
    _findBottlenecks(dungeonCosts) {
        const bottlenecks = [];
        for (const [dungeonId, data] of Object.entries(dungeonCosts)) {
            if (!data.converged) {
                bottlenecks.push({ dungeon: dungeonId, reason: 'never_converged', goldSpent: data.goldSpent });
            } else if (data.attempts > 1) {
                bottlenecks.push({ dungeon: dungeonId, reason: 'multiple_attempts', attempts: data.attempts, goldSpent: data.goldSpent });
            }
        }

        // Also flag very high cost dungeons
        const costs = Object.values(dungeonCosts).filter(d => d.converged).map(d => d.goldSpent);
        if (costs.length > 0) {
            const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
            for (const [dungeonId, data] of Object.entries(dungeonCosts)) {
                if (data.converged && data.goldSpent > avgCost * 3) {
                    bottlenecks.push({ dungeon: dungeonId, reason: 'high_cost', goldSpent: data.goldSpent, avgCost: Math.round(avgCost) });
                }
            }
        }

        return bottlenecks;
    }
}
