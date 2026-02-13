/**
 * Actor-Critic algorithm implementation (TD Actor-Critic)
 * 크리틱 - 배우와 비평가를 겸비. 안정적이고 효율적입니다.
 *
 * Key feature: Two tables:
 * - Actor (theta): Policy parameters, softmax over actions
 * - Critic (V): State value function
 * Uses TD error (advantage) for both Actor and Critic updates.
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';

export class ActorCritic {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.alphaActor = options.alphaActor ?? options.alpha ?? 0.01;
        this.alphaCritic = options.alphaCritic ?? 0.1;
        this.gamma = options.gamma ?? 0.99;
        this.epsilon = options.epsilon ?? 1.0;
        this.epsilonMin = options.epsilonMin ?? 0.01;
        this.epsilonDecay = options.epsilonDecay ?? 0.995;

        // For interface compatibility (main.js sets alpha)
        this.alpha = this.alphaActor;

        // HP-aware state option
        this.useHpState = options.useHpState ?? false;
        this.hpLevels = 5;

        // Actor: policy parameters theta[stateKey] = [logit0, logit1, logit2, logit3]
        this.theta = new Map();
        // Critic: value function V[stateKey] = scalar
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
                    this.theta.set(state, [0, 0, 0, 0]);
                    this.vTable.set(state, 0);
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

    /**
     * Softmax policy: π(a|s) = exp(theta[s][a]) / Σ exp(theta[s][a'])
     */
    softmaxPolicy(stateKey) {
        const logits = this.theta.get(stateKey) || [0, 0, 0, 0];
        const maxL = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - maxL));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    }

    /**
     * getQValues returns π(a|s) probabilities (for visualization compatibility)
     */
    getQValues(x, y, hp = 100) {
        const stateKey = this.getStateKey(x, y, hp);
        return this.softmaxPolicy(stateKey);
    }

    getV(stateKey) {
        return this.vTable.get(stateKey) || 0;
    }

    setV(stateKey, value) {
        this.vTable.set(stateKey, value);
    }

    getBestAction(x, y, hp = 100) {
        const probs = this.getQValues(x, y, hp);
        let bestAction = 0;
        let bestProb = probs[0];
        for (let a = 1; a < 4; a++) {
            if (probs[a] > bestProb) {
                bestProb = probs[a];
                bestAction = a;
            }
        }
        return bestAction;
    }

    getMaxQValue(x, y, hp = 100) {
        // Return V(s) for visualization
        const stateKey = this.getStateKey(x, y, hp);
        return this.getV(stateKey);
    }

    /**
     * Sample action from softmax policy (with epsilon for exploration)
     */
    chooseAction(x, y, hp = 100) {
        if (Math.random() < this.epsilon) {
            return randomAction();
        }

        const stateKey = this.getStateKey(x, y, hp);
        const probs = this.softmaxPolicy(stateKey);

        // Sample from probability distribution
        const r = Math.random();
        let cumulative = 0;
        for (let a = 0; a < 4; a++) {
            cumulative += probs[a];
            if (r < cumulative) return a;
        }
        return 3;
    }

    /**
     * Actor-Critic learn: 1-step TD update for both Actor and Critic
     */
    learn(state, action, reward, nextState, done) {
        const [x, y, hp] = state;
        const [nx, ny, nhp] = nextState;

        const stateKey = this.getStateKey(x, y, hp);
        const nextStateKey = this.getStateKey(nx, ny, nhp);

        // TD error (advantage): δ = r + γ·V(s') - V(s)
        const vCurrent = this.getV(stateKey);
        const vNext = done ? 0 : this.getV(nextStateKey);
        const delta = reward + this.gamma * vNext - vCurrent;

        // Critic update: V(s) += α_critic · δ
        this.setV(stateKey, vCurrent + this.alphaCritic * delta);

        // Actor update: theta[s][a] += α_actor · δ · grad(log π(a|s))
        const probs = this.softmaxPolicy(stateKey);
        const logits = this.theta.get(stateKey) || [0, 0, 0, 0];

        for (let a = 0; a < 4; a++) {
            const indicator = (a === action) ? 1 : 0;
            logits[a] += this.alphaActor * delta * (indicator - probs[a]);
        }

        this.theta.set(stateKey, logits);
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

        while (steps < maxSteps) {
            const state = [agent.x, agent.y, agent.hp];
            const action = this.chooseAction(agent.x, agent.y, agent.hp);

            const nextPos = agent.getNextPosition(action);
            const nextKey = `${nextPos.x},${nextPos.y}`;
            const originalTile = this.grid.getTile(nextPos.x, nextPos.y);

            if (killedMonsters.has(nextKey) && originalTile === TileType.MONSTER) {
                this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
            }

            const result = agent.move(action, this.grid);

            if (result.tile === TileType.MONSTER && !killedMonsters.has(nextKey)) {
                killedMonsters.add(nextKey);
                this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
            }

            const nextState = [agent.x, agent.y, agent.hp];

            this.learn(state, action, result.reward, nextState, result.done);

            totalReward += result.reward;
            steps++;

            if (result.done) break;
        }

        // Restore monsters
        for (const key of killedMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
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

        let successes = 0;
        let totalReward = 0;
        let totalSteps = 0;

        for (let i = 0; i < nEpisodes; i++) {
            const startPos = this.grid.startPos;
            const agent = new Agent(startPos.x, startPos.y);
            const killedMonsters = new Set();
            let steps = 0;

            while (steps < 200) {
                const action = this.getBestAction(agent.x, agent.y, agent.hp);
                const nextPos = agent.getNextPosition(action);
                const nextKey = `${nextPos.x},${nextPos.y}`;
                if (killedMonsters.has(nextKey)) {
                    this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
                }

                const result = agent.move(action, this.grid);
                if (result.tile === TileType.MONSTER && !killedMonsters.has(nextKey)) {
                    killedMonsters.add(nextKey);
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

    /**
     * Value grid: returns V(s) for each cell
     */
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
        const thetaEntries = [];
        for (const [key, values] of this.theta) {
            thetaEntries.push([key, values]);
        }
        const vEntries = [];
        for (const [key, value] of this.vTable) {
            vEntries.push([key, value]);
        }

        return JSON.stringify({
            type: 'actor-critic',
            theta: thetaEntries,
            vTable: vEntries,
            epsilon: this.epsilon,
            episodeRewards: this.episodeRewards,
            episodeSteps: this.episodeSteps,
            alphaActor: this.alphaActor,
            alphaCritic: this.alphaCritic,
            gamma: this.gamma,
            epsilonMin: this.epsilonMin,
            epsilonDecay: this.epsilonDecay,
            useHpState: this.useHpState
        });
    }

    deserialize(json) {
        const data = JSON.parse(json);
        this.theta = new Map(data.theta);
        if (data.vTable) {
            this.vTable = new Map(data.vTable);
        }
        this.epsilon = data.epsilon ?? this.epsilon;
        this.episodeRewards = data.episodeRewards ?? [];
        this.episodeSteps = data.episodeSteps ?? [];
        if (data.alphaActor !== undefined) this.alphaActor = data.alphaActor;
        if (data.alphaCritic !== undefined) this.alphaCritic = data.alphaCritic;
        if (data.gamma !== undefined) this.gamma = data.gamma;
        if (data.epsilonMin !== undefined) this.epsilonMin = data.epsilonMin;
        if (data.epsilonDecay !== undefined) this.epsilonDecay = data.epsilonDecay;
        this.alpha = this.alphaActor;
    }

    stepAction(agentX, agentY, agentHp) {
        return this.chooseAction(agentX, agentY, agentHp);
    }
}
