/**
 * Q-Learning algorithm implementation
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';

export class QLearning {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.alpha = options.alpha ?? 0.1;         // Learning rate
        this.gamma = options.gamma ?? 0.99;        // Discount factor
        this.epsilon = options.epsilon ?? 1.0;     // Exploration rate
        this.epsilonMin = options.epsilonMin ?? 0.01;
        this.epsilonDecay = options.epsilonDecay ?? 0.995;

        // Initialize Q-table: state -> action -> value
        this.qTable = new Map();
        this.initQTable();

        // Stats
        this.episodeRewards = [];
        this.episodeSteps = [];
    }

    initQTable() {
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const state = this.stateKey(x, y);
                this.qTable.set(state, [0, 0, 0, 0]); // 4 actions
            }
        }
    }

    stateKey(x, y) {
        return `${x},${y}`;
    }

    getQValues(x, y) {
        const key = this.stateKey(x, y);
        return this.qTable.get(key) || [0, 0, 0, 0];
    }

    getQValue(x, y, action) {
        return this.getQValues(x, y)[action];
    }

    setQValue(x, y, action, value) {
        const key = this.stateKey(x, y);
        const values = this.qTable.get(key) || [0, 0, 0, 0];
        values[action] = value;
        this.qTable.set(key, values);
    }

    getBestAction(x, y) {
        const qValues = this.getQValues(x, y);
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

    getMaxQValue(x, y) {
        const qValues = this.getQValues(x, y);
        return Math.max(...qValues);
    }

    chooseAction(x, y) {
        // Epsilon-greedy policy
        if (Math.random() < this.epsilon) {
            return randomAction();
        }
        return this.getBestAction(x, y);
    }

    learn(state, action, reward, nextState, done) {
        const [x, y] = state;
        const [nx, ny] = nextState;

        const currentQ = this.getQValue(x, y, action);
        const maxNextQ = done ? 0 : this.getMaxQValue(nx, ny);

        // Q-Learning update: Q(s,a) += α[r + γ·max Q(s',a') - Q(s,a)]
        const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
        this.setQValue(x, y, action, newQ);
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

        while (steps < maxSteps) {
            const state = [agent.x, agent.y];
            const action = this.chooseAction(agent.x, agent.y);

            const result = agent.move(action, this.grid);
            const nextState = [agent.x, agent.y];

            this.learn(state, action, result.reward, nextState, result.done);

            totalReward += result.reward;
            steps++;

            if (result.done) break;
        }

        this.decayEpsilon();
        this.episodeRewards.push(totalReward);
        this.episodeSteps.push(steps);

        return { totalReward, steps, success: agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL };
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

            // Progress callback every batch
            if (onProgress && (i + 1) % batchSize === 0) {
                onProgress({
                    episode: i + 1,
                    total: nEpisodes,
                    epsilon: this.epsilon,
                    avgReward: this.getAverageReward(50),
                    successRate: results.successes / (i + 1)
                });

                // Yield to UI
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
        this.epsilon = 0; // Greedy

        let successes = 0;
        let totalReward = 0;
        let totalSteps = 0;

        for (let i = 0; i < nEpisodes; i++) {
            const startPos = this.grid.startPos;
            const agent = new Agent(startPos.x, startPos.y);
            let steps = 0;

            while (steps < 200) {
                const action = this.getBestAction(agent.x, agent.y);
                const result = agent.move(action, this.grid);
                steps++;

                if (result.done) {
                    if (agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL) {
                        successes++;
                    }
                    break;
                }
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

    // Get value grid for visualization
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

    // Get policy grid for visualization
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
}
