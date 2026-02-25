/**
 * DQN (Deep Q-Network) algorithm implementation
 *
 * Neural network-based Q-learning with:
 * - Experience Replay buffer
 * - Target Network (periodic sync)
 * - Mini-batch SGD training
 *
 * Uses the same interface as tabular algorithms (runEpisode, train, test, etc.)
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';
import { NeuralNetwork } from './nn.js';

const NUM_ACTIONS = 4;

export class DQN {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.alpha = options.alpha ?? 0.001;         // Learning rate (much smaller than tabular)
        this.gamma = options.gamma ?? 0.99;          // Discount factor
        this.epsilon = options.epsilon ?? 1.0;       // Exploration rate
        this.epsilonMin = options.epsilonMin ?? 0.05;
        this.epsilonDecay = options.epsilonDecay ?? 0.998;

        // HP-aware state option
        this.useHpState = options.useHpState ?? false;

        // Network architecture
        this.hiddenSizes = options.hiddenSizes ?? [64, 32];
        // Local observation encoding (fixed-size, grid-size independent):
        //   8 neighbors × 8 tile categories (one-hot) = 64
        //   + goal_dir_x, goal_dir_y = 2
        //   + goal_dist_norm = 1
        //   + hp_norm = 1
        //   + pos_x_norm, pos_y_norm = 2  (position hint for disambiguation)
        // Total: 70 fixed dimensions
        this.numTileCategories = 8;
        this.inputSize = 8 * this.numTileCategories + 6; // 70

        // Build networks
        const layerSizes = [this.inputSize, ...this.hiddenSizes, NUM_ACTIONS];
        this.qNetwork = new NeuralNetwork(layerSizes);
        this.targetNetwork = this.qNetwork.clone();

        // Experience Replay
        this.replayCapacity = options.replayCapacity ?? 5000;
        this.replayBuffer = [];
        this.replayIndex = 0; // Circular buffer pointer

        // Training parameters
        this.batchSize = options.batchSize ?? 32;
        this.minReplaySize = options.minReplaySize ?? 200;
        this.targetUpdateFreq = options.targetUpdateFreq ?? 5;    // episodes
        this.trainEveryN = options.trainEveryN ?? 4;              // steps

        // Counters
        this.totalSteps = 0;
        this.episodeCount = 0;

        // Stats
        this.episodeRewards = [];
        this.episodeSteps = [];
    }

    /**
     * Map TileType to category index 0-7 (same as LocalQLearning)
     */
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
            default:               return 0;
        }
    }

    /**
     * Encode grid state as local observation vector (grid-size independent)
     *
     * Layout (68 dims):
     *   [0..7]   neighbor UP    one-hot (8 tile categories)
     *   [8..15]  neighbor DOWN  one-hot
     *   [16..23] neighbor LEFT  one-hot
     *   [24..31] neighbor RIGHT one-hot
     *   [32..39] neighbor UL    one-hot
     *   [40..47] neighbor UR    one-hot
     *   [48..55] neighbor DL    one-hot
     *   [56..63] neighbor DR    one-hot
     *   [64]     goal_dir_x (cos of angle to goal, -1..1)
     *   [65]     goal_dir_y (sin of angle to goal, -1..1)
     *   [66]     goal_dist_norm (0..1)
     *   [67]     hp_norm (0..1)
     */
    encodeState(x, y, hp = 100) {
        const state = new Array(this.inputSize).fill(0);
        const nc = this.numTileCategories;

        // 8 neighbors: U, D, L, R, UL, UR, DL, DR
        const offsets = [
            [0, -1], [0, 1], [-1, 0], [1, 0],
            [-1, -1], [1, -1], [-1, 1], [1, 1]
        ];
        for (let i = 0; i < 8; i++) {
            const [dx, dy] = offsets[i];
            const cat = this.getTileCategory(this.grid.getTile(x + dx, y + dy));
            state[i * nc + cat] = 1;
        }

        // Goal direction as unit vector
        const goal = this.grid.goalPos;
        if (goal) {
            const gdx = goal.x - x;
            const gdy = goal.y - y;
            const dist = Math.abs(gdx) + Math.abs(gdy);
            if (dist > 0) {
                const len = Math.sqrt(gdx * gdx + gdy * gdy);
                state[64] = gdx / len;  // cos-like
                state[65] = -gdy / len;  // sin-like (y inverted)
            }
            // Goal distance normalized by grid diagonal
            const maxDist = this.grid.width + this.grid.height;
            state[66] = Math.min(dist / maxDist, 1);
        }

        // HP normalized
        state[67] = hp / 100;

        // Position hint (helps disambiguate identical local observations)
        state[68] = x / this.grid.width;
        state[69] = y / this.grid.height;

        return state;
    }

    /**
     * Get Q-values for a state (using main network)
     */
    getQValues(x, y, hp = 100) {
        const state = this.encodeState(x, y, hp);
        return this.qNetwork.predict(state);
    }

    getQValue(x, y, action, hp = 100) {
        return this.getQValues(x, y, hp)[action];
    }

    getMaxQValue(x, y, hp = 100) {
        const qValues = this.getQValues(x, y, hp);
        return Math.max(...qValues);
    }

    getBestAction(x, y, hp = 100) {
        const qValues = this.getQValues(x, y, hp);
        let bestAction = 0;
        let bestValue = qValues[0];
        for (let a = 1; a < NUM_ACTIONS; a++) {
            if (qValues[a] > bestValue) {
                bestValue = qValues[a];
                bestAction = a;
            }
        }
        return bestAction;
    }

    chooseAction(x, y, hp = 100) {
        if (Math.random() < this.epsilon) {
            return randomAction();
        }
        return this.getBestAction(x, y, hp);
    }

    /**
     * Add experience to replay buffer (circular)
     */
    addExperience(state, action, reward, nextState, done) {
        const experience = { state, action, reward, nextState, done };
        if (this.replayBuffer.length < this.replayCapacity) {
            this.replayBuffer.push(experience);
        } else {
            this.replayBuffer[this.replayIndex] = experience;
        }
        this.replayIndex = (this.replayIndex + 1) % this.replayCapacity;
    }

    /**
     * Sample a random mini-batch from the replay buffer
     */
    sampleBatch() {
        const batch = [];
        const len = this.replayBuffer.length;
        for (let i = 0; i < this.batchSize; i++) {
            const idx = Math.floor(Math.random() * len);
            batch.push(this.replayBuffer[idx]);
        }
        return batch;
    }

    /**
     * Train on a mini-batch from the replay buffer
     */
    trainBatch() {
        if (this.replayBuffer.length < this.minReplaySize) return;

        const batch = this.sampleBatch();
        const numLayers = this.qNetwork.layers.length;

        // Accumulate gradients across the batch
        const accumGradients = [];
        for (let l = 0; l < numLayers; l++) {
            const layer = this.qNetwork.layers[l];
            const dW = layer.weights.map(row => new Array(row.length).fill(0));
            const dB = new Array(layer.biases.length).fill(0);
            accumGradients.push({ dW, dB });
        }

        for (const exp of batch) {
            // Compute target
            let target;
            if (exp.done) {
                target = exp.reward;
            } else {
                const nextQ = this.targetNetwork.predict(exp.nextState);
                target = exp.reward + this.gamma * Math.max(...nextQ);
            }

            // Forward pass through main network
            const qValues = this.qNetwork.forward(exp.state);

            // Output gradient: only for the taken action
            // Clip TD error to [-1, 1] (equivalent to Huber loss, as in original DQN)
            const outputGrad = new Array(NUM_ACTIONS).fill(0);
            let tdError = qValues[exp.action] - target;
            if (tdError > 1) tdError = 1;
            else if (tdError < -1) tdError = -1;
            outputGrad[exp.action] = tdError;

            // Backward pass
            const gradients = this.qNetwork.backward(outputGrad);

            // Accumulate
            for (let l = 0; l < numLayers; l++) {
                const { dW, dB } = gradients[l];
                for (let r = 0; r < dW.length; r++) {
                    for (let c = 0; c < dW[r].length; c++) {
                        accumGradients[l].dW[r][c] += dW[r][c];
                    }
                    accumGradients[l].dB[r] += dB[r];
                }
            }
        }

        // Average gradients
        const invBatch = 1 / this.batchSize;
        for (let l = 0; l < numLayers; l++) {
            for (let r = 0; r < accumGradients[l].dW.length; r++) {
                for (let c = 0; c < accumGradients[l].dW[r].length; c++) {
                    accumGradients[l].dW[r][c] *= invBatch;
                }
                accumGradients[l].dB[r] *= invBatch;
            }
        }

        // SGD update
        this.qNetwork.update(accumGradients, this.alpha);
    }

    /**
     * Learn from a single transition (called per step in runEpisode)
     */
    learn(state, action, reward, nextState, done) {
        const [x, y, hp] = state;
        const [nx, ny, nhp] = nextState;

        // Encode states and add to replay buffer
        const encodedState = this.encodeState(x, y, hp);
        const encodedNext = this.encodeState(nx, ny, nhp);
        this.addExperience(encodedState, action, reward, encodedNext, done);

        this.totalSteps++;

        // Train every N steps
        if (this.totalSteps % this.trainEveryN === 0) {
            this.trainBatch();
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

        // Restore monsters and gold
        for (const key of killedMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
        for (const key of collectedGold) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.GOLD;
        }

        this.decayEpsilon();
        this.episodeCount++;

        // Sync target network periodically
        if (this.episodeCount % this.targetUpdateFreq === 0) {
            this.targetNetwork.copyFrom(this.qNetwork);
        }

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
        return JSON.stringify({
            type: 'dqn',
            qNetwork: this.qNetwork.toJSON(),
            targetNetwork: this.targetNetwork.toJSON(),
            epsilon: this.epsilon,
            episodeCount: this.episodeCount,
            totalSteps: this.totalSteps,
            episodeRewards: this.episodeRewards,
            episodeSteps: this.episodeSteps,
            alpha: this.alpha,
            gamma: this.gamma,
            epsilonMin: this.epsilonMin,
            epsilonDecay: this.epsilonDecay,
            useHpState: this.useHpState,
            hiddenSizes: this.hiddenSizes,
            batchSize: this.batchSize,
            replayCapacity: this.replayCapacity,
            minReplaySize: this.minReplaySize,
            targetUpdateFreq: this.targetUpdateFreq,
            trainEveryN: this.trainEveryN
        });
    }

    deserialize(json) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;

        if (data.qNetwork) {
            this.qNetwork = NeuralNetwork.fromJSON(data.qNetwork);
        }
        if (data.targetNetwork) {
            this.targetNetwork = NeuralNetwork.fromJSON(data.targetNetwork);
        }

        this.epsilon = data.epsilon ?? this.epsilon;
        this.episodeCount = data.episodeCount ?? 0;
        this.totalSteps = data.totalSteps ?? 0;
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
