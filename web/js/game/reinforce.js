/**
 * REINFORCE algorithm implementation (Monte Carlo Policy Gradient)
 * 그래디 - 직감형 탐험가. 확률로 판단, 다양한 경로를 시도합니다.
 *
 * Key feature: Learns a policy directly (not Q-values).
 * Uses softmax policy over action preferences (theta).
 * Updates after complete episodes using actual returns.
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';

export class Reinforce {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.alpha = options.alpha ?? 0.01; // Smaller LR for policy gradient
        this.gamma = options.gamma ?? 0.99;
        this.epsilon = options.epsilon ?? 1.0;
        this.epsilonMin = options.epsilonMin ?? 0.01;
        this.epsilonDecay = options.epsilonDecay ?? 0.995;

        // HP-aware state option
        this.useHpState = options.useHpState ?? false;
        this.hpLevels = 5;

        // Policy parameters: theta[stateKey] = [logit0, logit1, logit2, logit3]
        this.theta = new Map();
        this.initTheta();

        // Episode trajectory
        this.trajectory = [];

        // Baseline: running average of returns
        this.baselineReturn = 0;
        this.baselineCount = 0;

        // Stats
        this.episodeRewards = [];
        this.episodeSteps = [];
    }

    initTheta() {
        const hpRange = this.useHpState ? this.hpLevels : 1;
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                for (let hp = 0; hp < hpRange; hp++) {
                    const state = this.useHpState ?
                        this.stateKeyWithHp(x, y, hp) :
                        this.stateKey(x, y);
                    this.theta.set(state, [0, 0, 0, 0]);
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
        const exps = logits.map(l => Math.exp(l - maxL)); // Numerical stability
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
        const probs = this.getQValues(x, y, hp);
        return Math.max(...probs);
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
        return 3; // Fallback
    }

    /**
     * REINFORCE learn: accumulate trajectory, update on episode end
     */
    learn(state, action, reward, nextState, done) {
        this.trajectory.push({ state, action, reward });

        if (done) {
            this._updateFromTrajectory();
        }
    }

    _updateFromTrajectory() {
        // Calculate returns for each timestep
        const returns = new Array(this.trajectory.length);
        let G = 0;

        for (let t = this.trajectory.length - 1; t >= 0; t--) {
            G = this.trajectory[t].reward + this.gamma * G;
            returns[t] = G;
        }

        // Update baseline (running average)
        const episodeReturn = returns[0];
        this.baselineCount++;
        this.baselineReturn += (episodeReturn - this.baselineReturn) / this.baselineCount;

        // REINFORCE with baseline update
        for (let t = 0; t < this.trajectory.length; t++) {
            const { state, action } = this.trajectory[t];
            const [x, y, hp] = state;
            const stateKey = this.getStateKey(x, y, hp);

            const probs = this.softmaxPolicy(stateKey);
            const advantage = returns[t] - this.baselineReturn;

            // Policy gradient: theta[s][a] += alpha * G_t * grad(log π(a|s))
            // For softmax: grad(log π(a|s)) w.r.t. theta[s][a'] = (1{a=a'} - π(a'|s))
            const logits = this.theta.get(stateKey) || [0, 0, 0, 0];

            for (let a = 0; a < 4; a++) {
                const indicator = (a === action) ? 1 : 0;
                logits[a] += this.alpha * advantage * (indicator - probs[a]);
            }

            this.theta.set(stateKey, logits);
        }

        this.trajectory = [];
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

        // Reset trajectory
        this.trajectory = [];

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
            const isDone = result.done || steps + 1 >= maxSteps;

            this.learn(state, action, result.reward, nextState, isDone);

            totalReward += result.reward;
            steps++;

            if (result.done) {
                if (this.grid.tryAdvanceStage && this.grid.tryAdvanceStage(agent)) continue;
                break;
            }
        }

        // If episode ended by max steps, force trajectory update
        if (this.trajectory.length > 0) {
            this._updateFromTrajectory();
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

    /**
     * Value grid: returns max π(a|s) for each cell (policy confidence)
     */
    getValueGrid() {
        const values = [];
        for (let y = 0; y < this.grid.height; y++) {
            values[y] = [];
            for (let x = 0; x < this.grid.width; x++) {
                const probs = this.getQValues(x, y);
                values[y][x] = Math.max(...probs);
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
        const entries = [];
        for (const [key, values] of this.theta) {
            entries.push([key, values]);
        }
        return JSON.stringify({
            type: 'reinforce',
            theta: entries,
            epsilon: this.epsilon,
            baselineReturn: this.baselineReturn,
            baselineCount: this.baselineCount,
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
        this.theta = new Map(data.theta);
        this.epsilon = data.epsilon ?? this.epsilon;
        this.baselineReturn = data.baselineReturn ?? 0;
        this.baselineCount = data.baselineCount ?? 0;
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
