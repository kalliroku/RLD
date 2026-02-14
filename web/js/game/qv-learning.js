/**
 * QV-Learning algorithm implementation
 * (Wiering & van Hasselt, 2008)
 *
 * Maintains both Q(s,a) and V(s) tables.
 * - V is updated via TD:       V(s) += α·[r + γ·V(s') - V(s)]
 * - Q uses V instead of max Q: Q(s,a) += α·[r + γ·V(s') - Q(s,a)]
 *
 * Reduces overestimation bias compared to standard Q-Learning because
 * V(s') is a smoother estimate than max_a Q(s',a).
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';

export class QVLearning {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.alpha = options.alpha ?? 0.1;
        this.gamma = options.gamma ?? 0.99;
        this.epsilon = options.epsilon ?? 1.0;
        this.epsilonMin = options.epsilonMin ?? 0.01;
        this.epsilonDecay = options.epsilonDecay ?? 0.995;

        // HP-aware state option
        this.useHpState = options.useHpState ?? false;
        this.hpLevels = 5;

        // Q-table: stateKey -> [q0, q1, q2, q3]
        this.qTable = new Map();
        // V-table: stateKey -> scalar
        this.vTable = new Map();

        this.initTables();

        // Stats
        this.episodeRewards = [];
        this.episodeSteps = [];
    }

    initTables() {
        const hpRange = this.useHpState ? this.hpLevels : 1;
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                for (let hp = 0; hp < hpRange; hp++) {
                    const state = this.useHpState ?
                        this.stateKeyWithHp(x, y, hp) :
                        this.stateKey(x, y);
                    this.qTable.set(state, [0, 0, 0, 0]);
                    this.vTable.set(state, 0);
                }
            }
        }
    }

    stateKey(x, y) { return `${x},${y}`; }
    stateKeyWithHp(x, y, hpLevel) { return `${x},${y},${hpLevel}`; }
    getHpLevel(hp) { return Math.min(this.hpLevels - 1, Math.floor(hp / (100 / this.hpLevels))); }

    getStateKey(x, y, hp = 100) {
        if (this.useHpState) return this.stateKeyWithHp(x, y, this.getHpLevel(hp));
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
        if (!this.qTable.has(key)) this.qTable.set(key, [0, 0, 0, 0]);
        this.qTable.get(key)[action] = value;
    }

    getV(stateKey) { return this.vTable.get(stateKey) || 0; }
    setV(stateKey, value) { this.vTable.set(stateKey, value); }

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
        // Return V(s) for visualization (more stable than max Q)
        const stateKey = this.getStateKey(x, y, hp);
        return this.getV(stateKey);
    }

    chooseAction(x, y, hp = 100) {
        if (Math.random() < this.epsilon) return randomAction();
        return this.getBestAction(x, y, hp);
    }

    /**
     * QV-Learning update:
     *   V(s) += α·[r + γ·V(s') - V(s)]
     *   Q(s,a) += α·[r + γ·V(s') - Q(s,a)]
     */
    learn(state, action, reward, nextState, done) {
        const [x, y, hp] = state;
        const [nx, ny, nhp] = nextState;

        const stateKey = this.getStateKey(x, y, hp);
        const nextStateKey = this.getStateKey(nx, ny, nhp);

        const vNext = done ? 0 : this.getV(nextStateKey);
        const target = reward + this.gamma * vNext;

        // V update: TD(0)
        const vCurrent = this.getV(stateKey);
        this.setV(stateKey, vCurrent + this.alpha * (target - vCurrent));

        // Q update: uses V(s') instead of max_a Q(s',a)
        const currentQ = this.getQValue(x, y, action, hp);
        this.setQValue(x, y, action, currentQ + this.alpha * (target - currentQ), hp);
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

        for (const key of killedMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
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

        let successes = 0, totalReward = 0, totalSteps = 0;

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
                if (killedMonsters.has(nextKey)) this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
                if (collectedGold.has(nextKey)) this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;

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
                    if (agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL) successes++;
                    break;
                }
            }

            for (const key of killedMonsters) { const [x, y] = key.split(',').map(Number); this.grid.tiles[y][x] = TileType.MONSTER; }
            for (const key of collectedGold) { const [x, y] = key.split(',').map(Number); this.grid.tiles[y][x] = TileType.GOLD; }
            totalReward += agent.totalReward;
            totalSteps += steps;
        }

        this.epsilon = oldEpsilon;
        return { successRate: successes / nEpisodes, avgReward: totalReward / nEpisodes, avgSteps: totalSteps / nEpisodes };
    }

    getValueGrid() {
        const values = [];
        for (let y = 0; y < this.grid.height; y++) {
            values[y] = [];
            for (let x = 0; x < this.grid.width; x++) {
                const stateKey = this.getStateKey(x, y);
                values[y][x] = this.getV(stateKey);
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
        for (const [key, values] of this.qTable) qEntries.push([key, values]);
        const vEntries = [];
        for (const [key, value] of this.vTable) vEntries.push([key, value]);

        return JSON.stringify({
            type: 'qv-learning',
            qTable: qEntries,
            vTable: vEntries,
            epsilon: this.epsilon,
            episodeRewards: this.episodeRewards,
            episodeSteps: this.episodeSteps,
            alpha: this.alpha,
            gamma: this.gamma,
            epsilonMin: this.epsilonMin,
            epsilonDecay: this.epsilonDecay,
            useHpState: this.useHpState
        });
    }

    deserialize(json) {
        const data = JSON.parse(json);
        this.qTable = new Map(data.qTable);
        if (data.vTable) this.vTable = new Map(data.vTable);
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
