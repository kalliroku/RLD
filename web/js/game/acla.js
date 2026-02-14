/**
 * ACLA - Actor-Critic Learning Automaton
 * (Wiering & van Hasselt, 2008)
 *
 * Like Actor-Critic, but the actor uses a Learning Automaton update
 * instead of softmax gradient. The policy is stored as raw probabilities.
 *
 * Critic: V(s) += α_critic · δ
 * Actor (LR-P automaton scaled by |δ|):
 *   If δ > 0: reinforce chosen action
 *     π(s,a)  += α_actor · |δ| · (1 - π(s,a))
 *     π(s,a') *= 1 - α_actor · |δ|               for a' ≠ a
 *   If δ < 0: penalize chosen action
 *     π(s,a)  *= 1 - α_actor · |δ|
 *     π(s,a') += α_actor · |δ| / (|A|-1) · (1 - π(s,a'))  for a' ≠ a
 *
 * The automaton directly manipulates probabilities (always sum to 1),
 * which gives more aggressive policy updates than softmax gradient.
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';

const NUM_ACTIONS = 4;

export class ACLA {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.alphaActor = options.alphaActor ?? options.alpha ?? 0.05;
        this.alphaCritic = options.alphaCritic ?? 0.1;
        this.gamma = options.gamma ?? 0.99;
        this.epsilon = options.epsilon ?? 1.0;
        this.epsilonMin = options.epsilonMin ?? 0.01;
        this.epsilonDecay = options.epsilonDecay ?? 0.995;

        // For interface compatibility
        this.alpha = this.alphaActor;

        // HP-aware state option
        this.useHpState = options.useHpState ?? false;
        this.hpLevels = 5;

        // Policy table: stateKey -> [p0, p1, p2, p3] (probabilities, sum=1)
        this.policy = new Map();
        // Critic: V table
        this.vTable = new Map();

        this.initTables();

        // Stats
        this.episodeRewards = [];
        this.episodeSteps = [];
    }

    initTables() {
        const uniform = 1 / NUM_ACTIONS;
        const hpRange = this.useHpState ? this.hpLevels : 1;
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                for (let hp = 0; hp < hpRange; hp++) {
                    const state = this.useHpState ?
                        this.stateKeyWithHp(x, y, hp) :
                        this.stateKey(x, y);
                    this.policy.set(state, [uniform, uniform, uniform, uniform]);
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

    getProbs(stateKey) {
        return this.policy.get(stateKey) || [0.25, 0.25, 0.25, 0.25];
    }

    getV(stateKey) { return this.vTable.get(stateKey) || 0; }
    setV(stateKey, value) { this.vTable.set(stateKey, value); }

    /**
     * getQValues returns probabilities (for visualization compatibility)
     */
    getQValues(x, y, hp = 100) {
        const stateKey = this.getStateKey(x, y, hp);
        return this.getProbs(stateKey);
    }

    getBestAction(x, y, hp = 100) {
        const probs = this.getQValues(x, y, hp);
        let bestAction = 0;
        let bestProb = probs[0];
        for (let a = 1; a < NUM_ACTIONS; a++) {
            if (probs[a] > bestProb) {
                bestProb = probs[a];
                bestAction = a;
            }
        }
        return bestAction;
    }

    getMaxQValue(x, y, hp = 100) {
        const stateKey = this.getStateKey(x, y, hp);
        return this.getV(stateKey);
    }

    chooseAction(x, y, hp = 100) {
        if (Math.random() < this.epsilon) return randomAction();

        const stateKey = this.getStateKey(x, y, hp);
        const probs = this.getProbs(stateKey);

        const r = Math.random();
        let cumulative = 0;
        for (let a = 0; a < NUM_ACTIONS; a++) {
            cumulative += probs[a];
            if (r < cumulative) return a;
        }
        return NUM_ACTIONS - 1;
    }

    /**
     * ACLA learn: Critic TD + Learning Automaton policy update
     */
    learn(state, action, reward, nextState, done) {
        const [x, y, hp] = state;
        const [nx, ny, nhp] = nextState;

        const stateKey = this.getStateKey(x, y, hp);
        const nextStateKey = this.getStateKey(nx, ny, nhp);

        // TD error
        const vCurrent = this.getV(stateKey);
        const vNext = done ? 0 : this.getV(nextStateKey);
        const delta = reward + this.gamma * vNext - vCurrent;

        // Critic update
        this.setV(stateKey, vCurrent + this.alphaCritic * delta);

        // Actor update: Learning Automaton (LR-P scaled by |δ|)
        const probs = this.getProbs(stateKey);
        const absDelta = Math.min(Math.abs(delta), 5); // clamp to prevent instability
        const step = Math.min(this.alphaActor * absDelta, 0.5); // cap step size

        if (delta > 0) {
            // Reinforce chosen action
            probs[action] += step * (1 - probs[action]);
            for (let a = 0; a < NUM_ACTIONS; a++) {
                if (a !== action) {
                    probs[a] *= (1 - step);
                }
            }
        } else if (delta < 0) {
            // Penalize chosen action
            probs[action] *= (1 - step);
            for (let a = 0; a < NUM_ACTIONS; a++) {
                if (a !== action) {
                    probs[a] += (step / (NUM_ACTIONS - 1)) * (1 - probs[a]);
                }
            }
        }

        // Ensure probabilities stay valid (numerical safety)
        const minProb = 0.001;
        let sum = 0;
        for (let a = 0; a < NUM_ACTIONS; a++) {
            probs[a] = Math.max(probs[a], minProb);
            sum += probs[a];
        }
        for (let a = 0; a < NUM_ACTIONS; a++) {
            probs[a] /= sum;
        }

        this.policy.set(stateKey, probs);
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
        const policyEntries = [];
        for (const [key, values] of this.policy) policyEntries.push([key, values]);
        const vEntries = [];
        for (const [key, value] of this.vTable) vEntries.push([key, value]);

        return JSON.stringify({
            type: 'acla',
            policy: policyEntries,
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
        this.policy = new Map(data.policy);
        if (data.vTable) this.vTable = new Map(data.vTable);
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
