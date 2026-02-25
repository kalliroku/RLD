/**
 * Prioritized Sweeping algorithm implementation (Model-Based RL)
 * 스위퍼 - 중요한 것부터 정리하는 효율주의자. 다이나의 진화형.
 *
 * Reference: Moore & Atkeson (1993) "Prioritized Sweeping: Reinforcement Learning with Less Data and Less Time"
 *            Sutton & Barto (2018) Section 8.4
 *
 * Key difference from Dyna-Q:
 * Dyna-Q:  plans by randomly sampling from visited (s,a) pairs
 * PS:      plans by processing (s,a) pairs in order of priority (TD-error magnitude)
 *          + backward propagation via predecessor tracking
 *
 * Priority Queue ensures the most impactful updates happen first,
 * leading to faster convergence than Dyna-Q's random sampling.
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';

export class PrioritizedSweeping {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.alpha = options.alpha ?? 0.5;
        this.gamma = options.gamma ?? 0.99;
        this.epsilon = options.epsilon ?? 1.0;
        this.epsilonMin = options.epsilonMin ?? 0.01;
        this.epsilonDecay = options.epsilonDecay ?? 0.995;
        this.planningSteps = options.planningSteps ?? 5;
        this.theta = options.theta ?? 0.0001; // Priority threshold

        // HP-aware state option
        this.useHpState = options.useHpState ?? false;
        this.hpLevels = 5;

        // Initialize Q-table
        this.qTable = new Map();
        this.initQTable();

        // Environment model: model[stateKey][action] = { reward, nextStateKey, done }
        this.model = new Map();

        // Predecessor map: predecessors[stateKey] = Set<{stateKey, action, reward}>
        this.predecessors = new Map();

        // Priority queue (array-based max-heap by priority)
        this.pQueue = [];
        this.pQueueSet = new Map(); // stateKey_action → index for dedup

        // Stats
        this.episodeRewards = [];
        this.episodeSteps = [];
    }

    initQTable() {
        const hpRange = this.useHpState ? this.hpLevels : 1;
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                for (let hp = 0; hp < hpRange; hp++) {
                    const state = this.useHpState ?
                        this.stateKeyWithHp(x, y, hp) :
                        this.stateKey(x, y);
                    this.qTable.set(state, [0, 0, 0, 0]);
                }
            }
        }
    }

    stateKey(x, y) {
        return `${x},${y}`;
    }

    stateKeyWithHp(x, y, hpLevel) {
        return `${x},${y},${hpLevel}`;
    }

    getHpLevel(hp) {
        return Math.min(this.hpLevels - 1, Math.floor(hp / (100 / this.hpLevels)));
    }

    getStateKey(x, y, hp = 100) {
        if (this.useHpState) {
            return this.stateKeyWithHp(x, y, this.getHpLevel(hp));
        }
        return this.stateKey(x, y);
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
        this.qTable.get(key)[action] = value;
    }

    _getQByKey(stateKey) {
        return this.qTable.get(stateKey) || [0, 0, 0, 0];
    }

    _setQByKey(stateKey, action, value) {
        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, [0, 0, 0, 0]);
        }
        this.qTable.get(stateKey)[action] = value;
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

    // ========== Priority Queue Operations ==========

    _pqPush(stateKey, action, priority) {
        const saKey = `${stateKey}_${action}`;
        const existing = this.pQueueSet.get(saKey);

        if (existing !== undefined) {
            // Update priority if higher
            if (priority > this.pQueue[existing].priority) {
                this.pQueue[existing].priority = priority;
                this._pqBubbleUp(existing);
            }
            return;
        }

        // Add new entry
        const idx = this.pQueue.length;
        this.pQueue.push({ stateKey, action, priority });
        this.pQueueSet.set(saKey, idx);
        this._pqBubbleUp(idx);
    }

    _pqPop() {
        if (this.pQueue.length === 0) return null;

        const top = this.pQueue[0];
        const saKey = `${top.stateKey}_${top.action}`;
        this.pQueueSet.delete(saKey);

        const last = this.pQueue.pop();
        if (this.pQueue.length > 0) {
            this.pQueue[0] = last;
            const lastSaKey = `${last.stateKey}_${last.action}`;
            this.pQueueSet.set(lastSaKey, 0);
            this._pqBubbleDown(0);
        }

        return top;
    }

    _pqBubbleUp(idx) {
        while (idx > 0) {
            const parent = Math.floor((idx - 1) / 2);
            if (this.pQueue[idx].priority <= this.pQueue[parent].priority) break;

            // Swap
            this._pqSwap(idx, parent);
            idx = parent;
        }
    }

    _pqBubbleDown(idx) {
        const n = this.pQueue.length;
        while (true) {
            let largest = idx;
            const left = 2 * idx + 1;
            const right = 2 * idx + 2;

            if (left < n && this.pQueue[left].priority > this.pQueue[largest].priority) {
                largest = left;
            }
            if (right < n && this.pQueue[right].priority > this.pQueue[largest].priority) {
                largest = right;
            }

            if (largest === idx) break;

            this._pqSwap(idx, largest);
            idx = largest;
        }
    }

    _pqSwap(i, j) {
        const temp = this.pQueue[i];
        this.pQueue[i] = this.pQueue[j];
        this.pQueue[j] = temp;

        // Update index map
        const saKeyI = `${this.pQueue[i].stateKey}_${this.pQueue[i].action}`;
        const saKeyJ = `${this.pQueue[j].stateKey}_${this.pQueue[j].action}`;
        this.pQueueSet.set(saKeyI, i);
        this.pQueueSet.set(saKeyJ, j);
    }

    // ========== Learning ==========

    /**
     * Prioritized Sweeping learn:
     * 1. Update model (like Dyna-Q)
     * 2. Compute TD-error priority
     * 3. If priority > θ, add to priority queue
     * 4. Planning: process top-priority (s,a) pairs, propagate to predecessors
     */
    learn(state, action, reward, nextState, done) {
        const [x, y, hp] = state;
        const [nx, ny, nhp] = nextState;

        const stateKey = this.getStateKey(x, y, hp);
        const nextStateKey = this.getStateKey(nx, ny, nhp);

        // 1. Update model
        if (!this.model.has(stateKey)) {
            this.model.set(stateKey, {});
        }
        this.model.get(stateKey)[action] = { reward, nextStateKey, done };

        // 2. Track predecessors: nextState was reached from (stateKey, action)
        if (!this.predecessors.has(nextStateKey)) {
            this.predecessors.set(nextStateKey, new Set());
        }
        // Store as string for Set dedup
        this.predecessors.get(nextStateKey).add(JSON.stringify({ stateKey, action, reward }));

        // 3. Compute priority (TD-error magnitude)
        const currentQ = this._getQByKey(stateKey)[action];
        const maxNextQ = done ? 0 : Math.max(...this._getQByKey(nextStateKey));
        const priority = Math.abs(reward + this.gamma * maxNextQ - currentQ);

        if (priority > this.theta) {
            this._pqPush(stateKey, action, priority);
        }

        // 4. Planning with priority queue
        this._plan();
    }

    _plan() {
        for (let i = 0; i < this.planningSteps; i++) {
            if (this.pQueue.length === 0) break;

            const { stateKey, action } = this._pqPop();

            // Get model prediction
            const stateModel = this.model.get(stateKey);
            if (!stateModel || !stateModel[action]) continue;

            const { reward, nextStateKey, done } = stateModel[action];

            // Q-Learning update
            const qValues = this._getQByKey(stateKey);
            const currentQ = qValues[action];
            const maxNextQ = done ? 0 : Math.max(...this._getQByKey(nextStateKey));
            const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
            this._setQByKey(stateKey, action, newQ);

            // Propagate to predecessors
            const preds = this.predecessors.get(stateKey);
            if (!preds) continue;

            for (const predStr of preds) {
                const pred = JSON.parse(predStr);
                const predModel = this.model.get(pred.stateKey);
                if (!predModel || !predModel[pred.action]) continue;

                const predInfo = predModel[pred.action];
                const predQ = this._getQByKey(pred.stateKey)[pred.action];
                const predMaxNextQ = Math.max(...this._getQByKey(stateKey));
                const predPriority = Math.abs(predInfo.reward + this.gamma * predMaxNextQ - predQ);

                if (predPriority > this.theta) {
                    this._pqPush(pred.stateKey, pred.action, predPriority);
                }
            }
        }
    }

    decayEpsilon() {
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
    }

    runEpisode(maxSteps = 0) {
        maxSteps = maxSteps || this.grid.suggestedMaxSteps || 200;
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

            if (result.done) {
                if (this.grid.tryAdvanceStage && this.grid.tryAdvanceStage(agent)) continue;
                break;
            }
        }

        // Restore monsters
        for (const key of killedMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
        // Restore gold
        for (const key of collectedGold) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.GOLD;
        }

        this.decayEpsilon();
        this.episodeRewards.push(totalReward);
        this.episodeSteps.push(steps);

        return { totalReward, steps, success: agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL };
    }

    async train(nEpisodes, options = {}) {
        const { onProgress, onEpisode, batchSize = 10 } = options;
        const results = { rewards: [], steps: [], successes: 0 };

        for (let i = 0; i < nEpisodes; i++) {
            const result = this.runEpisode();
            results.rewards.push(result.totalReward);
            results.steps.push(result.steps);
            if (result.success) results.successes++;

            if (onEpisode) onEpisode(i, result);

            if (onProgress && (i + 1) % batchSize === 0) {
                onProgress({
                    episode: i + 1, total: nEpisodes,
                    epsilon: this.epsilon,
                    avgReward: this.getAverageReward(50),
                    successRate: results.successes / (i + 1)
                });
                await new Promise(r => setTimeout(r, 0));
            }
        }
        return results;
    }

    getAverageReward(window = 50) {
        const rewards = this.episodeRewards;
        if (rewards.length === 0) return 0;
        const start = Math.max(0, rewards.length - window);
        const slice = rewards.slice(start);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    }

    test(nEpisodes = 100) {
        const oldEpsilon = this.epsilon;
        this.epsilon = 0;
        const testMaxSteps = this.grid.suggestedMaxSteps || 200;

        let successes = 0;
        let totalReward = 0;
        let totalSteps = 0;

        for (let i = 0; i < nEpisodes; i++) {
            const startPos = this.grid.startPos;
            const agent = new Agent(startPos.x, startPos.y);
            const killedMonsters = new Set();
            const collectedGold = new Set();
            let steps = 0;

            while (steps < testMaxSteps) {
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
                    if (this.grid.tryAdvanceStage && this.grid.tryAdvanceStage(agent)) continue;
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
        const qEntries = [];
        for (const [key, values] of this.qTable) {
            qEntries.push([key, values]);
        }

        const modelEntries = [];
        for (const [key, actions] of this.model) {
            modelEntries.push([key, actions]);
        }

        return JSON.stringify({
            type: 'prioritized-sweeping',
            qTable: qEntries,
            model: modelEntries,
            epsilon: this.epsilon,
            episodeRewards: this.episodeRewards,
            episodeSteps: this.episodeSteps,
            alpha: this.alpha,
            gamma: this.gamma,
            planningSteps: this.planningSteps,
            theta: this.theta,
            epsilonMin: this.epsilonMin,
            epsilonDecay: this.epsilonDecay,
            useHpState: this.useHpState
        });
    }

    deserialize(json) {
        const data = JSON.parse(json);
        this.qTable = new Map(data.qTable);
        this.epsilon = data.epsilon ?? this.epsilon;
        this.episodeRewards = data.episodeRewards ?? [];
        this.episodeSteps = data.episodeSteps ?? [];

        if (data.model) {
            this.model = new Map(data.model);
        }

        if (data.alpha !== undefined) this.alpha = data.alpha;
        if (data.gamma !== undefined) this.gamma = data.gamma;
        if (data.planningSteps !== undefined) this.planningSteps = data.planningSteps;
        if (data.theta !== undefined) this.theta = data.theta;
        if (data.epsilonMin !== undefined) this.epsilonMin = data.epsilonMin;
        if (data.epsilonDecay !== undefined) this.epsilonDecay = data.epsilonDecay;
    }

    stepAction(agentX, agentY, agentHp) {
        return this.chooseAction(agentX, agentY, agentHp);
    }
}
