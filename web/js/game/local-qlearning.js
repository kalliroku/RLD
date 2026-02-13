/**
 * Local Observation-based Q-Learning (V12: 8-dir vision + goal distance)
 *
 * Unlike standard QLearning which uses absolute (x,y) coordinates,
 * this uses local observations as state representation,
 * enabling knowledge transfer between dungeons.
 *
 * State: "tU_tD_tL_tR_tUL_tUR_tDL_tDR_goalDir_goalDist_hpLevel"
 *   tU/tD/tL/tR: tile category (0-7) for cardinal neighbors
 *   tUL/tUR/tDL/tDR: tile category (0-7) for diagonal neighbors
 *   goalDir: goal direction (0=on goal, 1-8 = N,NE,E,SE,S,SW,W,NW)
 *   goalDist: Manhattan distance bucket (0-5)
 *   hpLevel: HP bucket (0-4)
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';

export class LocalQLearning {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.alpha = options.alpha ?? 0.1;
        this.gamma = options.gamma ?? 0.99;
        this.epsilon = options.epsilon ?? 1.0;
        this.epsilonMin = options.epsilonMin ?? 0.01;
        this.epsilonDecay = options.epsilonDecay ?? 0.995;

        // Always HP-aware (part of the local observation)
        this.hpLevels = 5;

        // Q-table: local state key -> [Q_up, Q_down, Q_left, Q_right]
        this.qTable = new Map();

        // Stats
        this.episodeRewards = [];
        this.episodeSteps = [];
    }

    // Map TileType to category 0-7
    getTileCategory(tileType) {
        switch (tileType) {
            case TileType.WALL:    return 0;
            case TileType.EMPTY:
            case TileType.START:   return 1;
            case TileType.GOAL:    return 2;
            case TileType.TRAP:    return 3;
            case TileType.HEAL:    return 4;
            case TileType.PIT:     return 5;
            case TileType.GOLD:    return 6;
            case TileType.MONSTER: return 7;
            default:               return 0; // unknown -> wall
        }
    }

    // Get 8-directional goal direction (0 = on goal, 1-8 = N,NE,E,SE,S,SW,W,NW)
    getGoalDirection(x, y) {
        const goal = this.grid.goalPos;
        if (!goal) return 0;

        const dx = goal.x - x;
        const dy = goal.y - y;

        if (dx === 0 && dy === 0) return 0; // on goal

        // Calculate angle and map to 8 directions
        const angle = Math.atan2(-dy, dx); // -dy because y grows downward
        // angle: 0=E, PI/2=N, PI=W, -PI/2=S
        // Map to 1-8: N=1, NE=2, E=3, SE=4, S=5, SW=6, W=7, NW=8
        const deg = ((angle * 180 / Math.PI) + 360) % 360;

        if (deg >= 337.5 || deg < 22.5)   return 3; // E
        if (deg >= 22.5  && deg < 67.5)   return 2; // NE
        if (deg >= 67.5  && deg < 112.5)  return 1; // N
        if (deg >= 112.5 && deg < 157.5)  return 8; // NW
        if (deg >= 157.5 && deg < 202.5)  return 7; // W
        if (deg >= 202.5 && deg < 247.5)  return 6; // SW
        if (deg >= 247.5 && deg < 292.5)  return 5; // S
        if (deg >= 292.5 && deg < 337.5)  return 4; // SE

        return 3; // fallback E
    }

    getHpLevel(hp) {
        return Math.min(this.hpLevels - 1, Math.floor(hp / (100 / this.hpLevels)));
    }

    // Manhattan distance to goal, bucketed (0-5)
    getGoalDistance(x, y) {
        const goal = this.grid.goalPos;
        if (!goal) return 0;
        const dist = Math.abs(goal.x - x) + Math.abs(goal.y - y);
        if (dist === 0) return 0;
        if (dist <= 3) return 1;
        if (dist <= 7) return 2;
        if (dist <= 12) return 3;
        if (dist <= 20) return 4;
        return 5;
    }

    // Local observation-based state key (8-dir vision + goal distance)
    stateKey(x, y, hp) {
        const tU  = this.getTileCategory(this.grid.getTile(x, y - 1));
        const tD  = this.getTileCategory(this.grid.getTile(x, y + 1));
        const tL  = this.getTileCategory(this.grid.getTile(x - 1, y));
        const tR  = this.getTileCategory(this.grid.getTile(x + 1, y));
        const tUL = this.getTileCategory(this.grid.getTile(x - 1, y - 1));
        const tUR = this.getTileCategory(this.grid.getTile(x + 1, y - 1));
        const tDL = this.getTileCategory(this.grid.getTile(x - 1, y + 1));
        const tDR = this.getTileCategory(this.grid.getTile(x + 1, y + 1));
        const goalDir = this.getGoalDirection(x, y);
        const goalDist = this.getGoalDistance(x, y);
        const hpLevel = this.getHpLevel(hp);
        return `${tU}_${tD}_${tL}_${tR}_${tUL}_${tUR}_${tDL}_${tDR}_${goalDir}_${goalDist}_${hpLevel}`;
    }

    getStateKey(x, y, hp = 100) {
        return this.stateKey(x, y, hp);
    }

    getQValues(x, y, hp = 100) {
        const key = this.getStateKey(x, y, hp);
        return this.qTable.get(key) || [0, 0, 0, 0];
    }

    getQValue(x, y, action, hp = 100) {
        return this.getQValues(x, y, hp)[action];
    }

    setQValue(x, y, action, value, hp = 100) {
        const key = this.getStateKey(x, y, hp);
        if (!this.qTable.has(key)) {
            this.qTable.set(key, [0, 0, 0, 0]);
        }
        const values = this.qTable.get(key);
        values[action] = value;
    }

    getBestAction(x, y, hp = 100) {
        const qValues = this.getQValues(x, y, hp);
        let bestAction = 0;
        let bestValue = qValues[0];

        for (let a = 1; a < 4; a++) {
            if (qValues[a] > bestValue) {
                bestValue = qValues[a];
                bestAction = a;
            }
        }

        return bestAction;
    }

    getMaxQValue(x, y, hp = 100) {
        const qValues = this.getQValues(x, y, hp);
        return Math.max(...qValues);
    }

    chooseAction(x, y, hp = 100) {
        if (Math.random() < this.epsilon) {
            return randomAction();
        }
        return this.getBestAction(x, y, hp);
    }

    learn(state, action, reward, nextState, done) {
        const [x, y, hp] = state;
        const [nx, ny, nhp] = nextState;

        const currentQ = this.getQValue(x, y, action, hp);
        const maxNextQ = done ? 0 : this.getMaxQValue(nx, ny, nhp);

        const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
        this.setQValue(x, y, action, newQ, hp);
    }

    decayEpsilon() {
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
    }

    runEpisode(maxSteps = 200) {
        const startPos = this.grid.startPos;
        if (!startPos) return null;

        const agent = new Agent(startPos.x, startPos.y);
        let totalReward = 0;
        let steps = 0;

        const killedMonsters = new Set();
        const collectedGold = new Set();

        while (steps < maxSteps) {
            const state = [agent.x, agent.y, agent.hp];
            const action = this.chooseAction(agent.x, agent.y, agent.hp);

            const nextPos = agent.getNextPosition(action);
            const nextKey = `${nextPos.x},${nextPos.y}`;
            const originalTile = this.grid.getTile(nextPos.x, nextPos.y);

            if (killedMonsters.has(nextKey) && originalTile === TileType.MONSTER) {
                this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
            }
            if (collectedGold.has(nextKey) && originalTile === TileType.GOLD) {
                this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
            }

            const result = agent.move(action, this.grid);

            if (result.tile === TileType.MONSTER && !killedMonsters.has(nextKey)) {
                killedMonsters.add(nextKey);
                this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
            }
            if (result.tile === TileType.GOLD && !collectedGold.has(nextKey)) {
                collectedGold.add(nextKey);
                this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
            }

            const nextState = [agent.x, agent.y, agent.hp];

            this.learn(state, action, result.reward, nextState, result.done);

            totalReward += result.reward;
            steps++;

            if (result.done) break;
        }

        // Restore monsters after episode
        for (const key of killedMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
        // Restore gold after episode
        for (const key of collectedGold) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.GOLD;
        }

        this.decayEpsilon();
        this.episodeRewards.push(totalReward);
        this.episodeSteps.push(steps);

        return {
            totalReward,
            steps,
            success: agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL
        };
    }

    async train(nEpisodes, options = {}) {
        const { onProgress, onEpisode, batchSize = 10 } = options;

        const results = {
            rewards: [],
            steps: [],
            successes: 0
        };

        for (let i = 0; i < nEpisodes; i++) {
            const result = this.runEpisode();

            results.rewards.push(result.totalReward);
            results.steps.push(result.steps);
            if (result.success) results.successes++;

            if (onEpisode) {
                onEpisode(i, result);
            }

            if (onProgress && (i + 1) % batchSize === 0) {
                onProgress({
                    episode: i + 1,
                    total: nEpisodes,
                    epsilon: this.epsilon,
                    avgReward: this.getAverageReward(50),
                    successRate: results.successes / (i + 1)
                });

                await new Promise(r => setTimeout(r, 0));
            }
        }

        return results;
    }

    test(nEpisodes = 100) {
        const oldEpsilon = this.epsilon;
        this.epsilon = 0;

        let successes = 0;
        let totalReward = 0;
        let totalSteps = 0;

        for (let i = 0; i < nEpisodes; i++) {
            const startPos = this.grid.startPos;
            const agent = new Agent(startPos.x, startPos.y);
            const killedMonsters = new Set();
            const collectedGold = new Set();
            let steps = 0;

            while (steps < 200) {
                const action = this.getBestAction(agent.x, agent.y, agent.hp);

                const nextPos = agent.getNextPosition(action);
                const nextKey = `${nextPos.x},${nextPos.y}`;
                if (killedMonsters.has(nextKey)) {
                    this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
                }
                if (collectedGold.has(nextKey)) {
                    this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
                }

                const result = agent.move(action, this.grid);

                if (result.tile === TileType.MONSTER && !killedMonsters.has(nextKey)) {
                    killedMonsters.add(nextKey);
                    this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
                }
                if (result.tile === TileType.GOLD && !collectedGold.has(nextKey)) {
                    collectedGold.add(nextKey);
                    this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
                }

                steps++;

                if (result.done) {
                    if (agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL) {
                        successes++;
                    }
                    break;
                }
            }

            for (const key of killedMonsters) {
                const [x, y] = key.split(',').map(Number);
                this.grid.tiles[y][x] = TileType.MONSTER;
            }
            for (const key of collectedGold) {
                const [x, y] = key.split(',').map(Number);
                this.grid.tiles[y][x] = TileType.GOLD;
            }

            totalReward += agent.totalReward;
            totalSteps += steps;
        }

        this.epsilon = oldEpsilon;

        return {
            successRate: successes / nEpisodes,
            avgReward: totalReward / nEpisodes,
            avgSteps: totalSteps / nEpisodes
        };
    }

    getAverageReward(window = 50) {
        const rewards = this.episodeRewards;
        if (rewards.length === 0) return 0;

        const start = Math.max(0, rewards.length - window);
        const slice = rewards.slice(start);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    }

    // Value grid for visualization (per-cell max Q-value)
    getValueGrid() {
        const values = [];
        for (let y = 0; y < this.grid.height; y++) {
            values[y] = [];
            for (let x = 0; x < this.grid.width; x++) {
                values[y][x] = this.getMaxQValue(x, y);
            }
        }
        return values;
    }

    // Policy grid for visualization (per-cell best action)
    getPolicyGrid() {
        const policy = [];
        for (let y = 0; y < this.grid.height; y++) {
            policy[y] = [];
            for (let x = 0; x < this.grid.width; x++) {
                policy[y][x] = this.getBestAction(x, y);
            }
        }
        return policy;
    }

    serialize() {
        const entries = [];
        for (const [key, values] of this.qTable) {
            entries.push([key, values]);
        }
        return JSON.stringify({
            type: 'local',
            qTable: entries,
            epsilon: this.epsilon,
            episodeRewards: this.episodeRewards,
            episodeSteps: this.episodeSteps,
            alpha: this.alpha,
            gamma: this.gamma,
            epsilonMin: this.epsilonMin,
            epsilonDecay: this.epsilonDecay
        });
    }

    deserialize(json) {
        const data = JSON.parse(json);
        this.qTable = new Map(data.qTable);
        this.epsilon = data.epsilon ?? this.epsilon;
        this.episodeRewards = data.episodeRewards ?? [];
        this.episodeSteps = data.episodeSteps ?? [];
        if (data.alpha !== undefined) this.alpha = data.alpha;
        if (data.gamma !== undefined) this.gamma = data.gamma;
        if (data.epsilonMin !== undefined) this.epsilonMin = data.epsilonMin;
        if (data.epsilonDecay !== undefined) this.epsilonDecay = data.epsilonDecay;
    }

    stepAction(agentX, agentY, agentHp) {
        return this.chooseAction(agentX, agentY, agentHp);
    }
}
