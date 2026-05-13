/**
 * PPO (Proximal Policy Optimization) - Clipped Surrogate Objective
 *
 * Neural-network based policy gradient with:
 * - Separate policy network (logits over 4 actions) and value network (V(s))
 * - GAE (Generalized Advantage Estimation) for advantage computation
 * - Clipped surrogate loss with optional KL penalty (here: clip-only)
 * - Multiple PPO epochs over collected rollout
 *
 * Uses the same interface as tabular algorithms (runEpisode, train, test, etc.)
 * Uses the same 70-dim local observation encoding as DQN.
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';
import { NeuralNetwork } from './nn.js';

const NUM_ACTIONS = 4;

export class PPO {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.lr = options.lr ?? options.alpha ?? 0.001;
        this.alpha = this.lr;            // interface compatibility
        this.gamma = options.gamma ?? 0.99;
        this.lambda = options.lambda ?? 0.95;     // GAE
        this.clipEps = options.clipEps ?? 0.2;
        this.entropyCoef = options.entropyCoef ?? 0.01;
        this.valueCoef = options.valueCoef ?? 0.5;
        this.ppoEpochs = options.ppoEpochs ?? 4;
        this.batchSize = options.batchSize ?? 64;
        this.rolloutSize = options.rolloutSize ?? 1024;

        // For interface compatibility (epsilon used by some viz code; PPO uses stochastic policy)
        this.epsilon = options.epsilon ?? 0;
        this.epsilonMin = options.epsilonMin ?? 0;
        this.epsilonDecay = options.epsilonDecay ?? 1.0;

        this.useHpState = options.useHpState ?? false;

        // Optional reward shaping function: (prevX, prevY, newX, newY) => extra
        this.rewardShape = options.rewardShape ?? null;

        // State encoding (same as DQN)
        this.numTileCategories = 8;
        this.inputSize = 8 * this.numTileCategories + 6; // 70

        // Networks: separate policy and value
        const hidden = options.hiddenSizes ?? [64, 64];
        this.policyNet = new NeuralNetwork([this.inputSize, ...hidden, NUM_ACTIONS]);
        this.valueNet  = new NeuralNetwork([this.inputSize, ...hidden, 1]);

        // Rollout buffer: { state, action, logProb, reward, value, done }
        this.buffer = [];

        // Stats
        this.episodeRewards = [];
        this.episodeSteps = [];
        this.totalSteps = 0;
        this.episodeCount = 0;
    }

    // ───── State encoding (mirrors DQN.encodeState) ─────

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

    encodeState(x, y, hp = 100) {
        const state = new Array(this.inputSize).fill(0);
        const nc = this.numTileCategories;
        const offsets = [
            [0, -1], [0, 1], [-1, 0], [1, 0],
            [-1, -1], [1, -1], [-1, 1], [1, 1]
        ];
        for (let i = 0; i < 8; i++) {
            const [dx, dy] = offsets[i];
            const cat = this.getTileCategory(this.grid.getTile(x + dx, y + dy));
            state[i * nc + cat] = 1;
        }
        const goal = this.grid.goalPos;
        if (goal) {
            const gdx = goal.x - x;
            const gdy = goal.y - y;
            const dist = Math.abs(gdx) + Math.abs(gdy);
            if (dist > 0) {
                const len = Math.sqrt(gdx * gdx + gdy * gdy);
                state[64] = gdx / len;
                state[65] = -gdy / len;
            }
            const maxDist = this.grid.width + this.grid.height;
            state[66] = Math.min(dist / maxDist, 1);
        }
        state[67] = hp / 100;
        state[68] = x / this.grid.width;
        state[69] = y / this.grid.height;
        return state;
    }

    // ───── Policy ─────

    softmax(logits) {
        const m = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - m));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    }

    sampleAction(probs) {
        const r = Math.random();
        let c = 0;
        for (let a = 0; a < NUM_ACTIONS; a++) {
            c += probs[a];
            if (r < c) return a;
        }
        return NUM_ACTIONS - 1;
    }

    chooseAction(x, y, hp = 100) {
        const state = this.encodeState(x, y, hp);
        const logits = this.policyNet.predict(state);
        const probs = this.softmax(logits);
        return this.sampleAction(probs);
    }

    getBestAction(x, y, hp = 100) {
        const logits = this.policyNet.predict(this.encodeState(x, y, hp));
        let best = 0;
        for (let a = 1; a < NUM_ACTIONS; a++) if (logits[a] > logits[best]) best = a;
        return best;
    }

    getQValues(x, y, hp = 100) {
        const logits = this.policyNet.predict(this.encodeState(x, y, hp));
        return this.softmax(logits);
    }

    getMaxQValue(x, y, hp = 100) {
        return this.valueNet.predict(this.encodeState(x, y, hp))[0];
    }

    decayEpsilon() {
        // PPO doesn't really use epsilon, but keep interface
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
    }

    // ───── Rollout collection ─────

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
            const stateVec = this.encodeState(agent.x, agent.y, agent.hp);
            const logits = this.policyNet.predict(stateVec);
            const probs = this.softmax(logits);
            const action = this.sampleAction(probs);
            const logProb = Math.log(probs[action] + 1e-10);
            const value = this.valueNet.predict(stateVec)[0];

            const nextPos = agent.getNextPosition(action);
            const nextKey = `${nextPos.x},${nextPos.y}`;
            const originalTile = this.grid.getTile(nextPos.x, nextPos.y);
            if (killedMonsters.has(nextKey) && originalTile === TileType.MONSTER) {
                this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
            }
            if (collectedGold.has(nextKey) && originalTile === TileType.GOLD) {
                this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
            }

            const prevX = agent.x, prevY = agent.y;
            const result = agent.move(action, this.grid);

            if (result.tile === TileType.MONSTER && !killedMonsters.has(nextKey)) {
                killedMonsters.add(nextKey);
                this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
            }
            if (result.tile === TileType.GOLD && !collectedGold.has(nextKey)) {
                collectedGold.add(nextKey);
                this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
            }

            const isDone = result.done || steps + 1 >= maxSteps;

            // Optional reward shaping (training only, not part of env)
            let rewardShaped = result.reward;
            if (this.rewardShape) {
                rewardShaped += this.rewardShape(prevX, prevY, agent.x, agent.y);
            }

            this.buffer.push({
                state: stateVec,
                action,
                logProb,
                reward: rewardShaped,
                value,
                done: isDone
            });

            totalReward += result.reward;
            steps++;
            this.totalSteps++;

            if (result.done) {
                if (this.grid.tryAdvanceStage && this.grid.tryAdvanceStage(agent)) continue;
                break;
            }
        }

        // Restore monsters/gold
        for (const key of killedMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
        for (const key of collectedGold) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.GOLD;
        }

        // Trigger PPO update if rollout is full
        if (this.buffer.length >= this.rolloutSize) {
            this._updateRollout();
        }

        this.episodeCount++;
        this.decayEpsilon();
        this.episodeRewards.push(totalReward);
        this.episodeSteps.push(steps);

        const success = agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL;
        return { totalReward, steps, success };
    }

    // ───── PPO update ─────

    _updateRollout() {
        const T = this.buffer.length;
        if (T === 0) return;

        // Compute GAE advantages and returns
        const advantages = new Array(T);
        const returns = new Array(T);
        let lastGAE = 0;

        for (let t = T - 1; t >= 0; t--) {
            const tr = this.buffer[t];
            const nextValue = (t + 1 < T) ? this.buffer[t + 1].value : 0;
            const nextNonTerminal = tr.done ? 0 : 1;
            const delta = tr.reward + this.gamma * nextValue * nextNonTerminal - tr.value;
            lastGAE = delta + this.gamma * this.lambda * nextNonTerminal * lastGAE;
            advantages[t] = lastGAE;
            returns[t] = advantages[t] + tr.value;
        }

        // Normalize advantages
        const advMean = advantages.reduce((a, b) => a + b, 0) / T;
        let advVar = 0;
        for (let t = 0; t < T; t++) advVar += (advantages[t] - advMean) ** 2;
        const advStd = Math.sqrt(advVar / T) + 1e-8;
        const advNorm = advantages.map(a => (a - advMean) / advStd);

        // Multiple PPO epochs
        const indices = Array.from({ length: T }, (_, i) => i);
        for (let epoch = 0; epoch < this.ppoEpochs; epoch++) {
            // Shuffle
            for (let i = T - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            for (let bs = 0; bs < T; bs += this.batchSize) {
                const end = Math.min(bs + this.batchSize, T);
                for (let k = bs; k < end; k++) {
                    this._updateSample(indices[k], advNorm, returns);
                }
            }
        }

        this.buffer = [];
    }

    _updateSample(t, advNorm, returns) {
        const tr = this.buffer[t];
        const advantage = advNorm[t];
        const targetReturn = returns[t];

        // ───── Policy update ─────
        const logits = this.policyNet.forward(tr.state);
        const probs = this.softmax(logits);
        const newLogProb = Math.log(probs[tr.action] + 1e-10);
        const ratio = Math.exp(newLogProb - tr.logProb);

        const clippedRatio = Math.max(1 - this.clipEps, Math.min(1 + this.clipEps, ratio));
        const surr1 = ratio * advantage;
        const surr2 = clippedRatio * advantage;

        // PPO loss = -min(surr1, surr2). Gradient flows through ratio only when surr1 <= surr2.
        const useRatio = surr1 <= surr2;

        const policyGrad = new Array(NUM_ACTIONS).fill(0);

        if (useRatio) {
            // d(-surr1)/d(logits[i]) = -advantage * ratio * (delta_ia - probs[i])
            for (let i = 0; i < NUM_ACTIONS; i++) {
                const delta = (i === tr.action) ? 1 : 0;
                policyGrad[i] = -advantage * ratio * (delta - probs[i]);
            }
        }

        // Entropy bonus: maximize H, so add d(-c_ent * H)/d(logits[i]) = c_ent * probs[i] * (log probs[i] + H)
        let H = 0;
        for (let i = 0; i < NUM_ACTIONS; i++) H -= probs[i] * Math.log(probs[i] + 1e-10);
        for (let i = 0; i < NUM_ACTIONS; i++) {
            policyGrad[i] += this.entropyCoef * probs[i] * (Math.log(probs[i] + 1e-10) + H);
        }

        const policyGrads = this.policyNet.backward(policyGrad);
        this.policyNet.update(policyGrads, this.lr);

        // ───── Value update ─────
        const valueOut = this.valueNet.forward(tr.state);
        const valuePred = valueOut[0];
        // L = 0.5 * (V - return)^2  →  dL/dV = (V - return). With valueCoef baked in.
        const valueGradOut = [this.valueCoef * (valuePred - targetReturn)];
        const valueGrads = this.valueNet.backward(valueGradOut);
        this.valueNet.update(valueGrads, this.lr);
    }

    // ───── Train / Test (mirrors DQN interface) ─────

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

        // Flush remaining buffer
        if (this.buffer.length > 0) this._updateRollout();

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
                values[y][x] = this.valueNet.predict(this.encodeState(x, y))[0];
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
            type: 'ppo',
            policyNet: this.policyNet.toJSON(),
            valueNet: this.valueNet.toJSON(),
            episodeRewards: this.episodeRewards,
            episodeSteps: this.episodeSteps,
            lr: this.lr,
            gamma: this.gamma,
            lambda: this.lambda,
            clipEps: this.clipEps,
            entropyCoef: this.entropyCoef,
            valueCoef: this.valueCoef,
            ppoEpochs: this.ppoEpochs,
            batchSize: this.batchSize,
            rolloutSize: this.rolloutSize
        });
    }

    deserialize(json) {
        const data = JSON.parse(json);
        this.policyNet = NeuralNetwork.fromJSON(data.policyNet);
        this.valueNet  = NeuralNetwork.fromJSON(data.valueNet);
        this.episodeRewards = data.episodeRewards ?? [];
        this.episodeSteps = data.episodeSteps ?? [];
        if (data.lr !== undefined) { this.lr = data.lr; this.alpha = data.lr; }
        if (data.gamma !== undefined) this.gamma = data.gamma;
        if (data.lambda !== undefined) this.lambda = data.lambda;
        if (data.clipEps !== undefined) this.clipEps = data.clipEps;
        if (data.entropyCoef !== undefined) this.entropyCoef = data.entropyCoef;
        if (data.valueCoef !== undefined) this.valueCoef = data.valueCoef;
        if (data.ppoEpochs !== undefined) this.ppoEpochs = data.ppoEpochs;
        if (data.batchSize !== undefined) this.batchSize = data.batchSize;
        if (data.rolloutSize !== undefined) this.rolloutSize = data.rolloutSize;
    }

    stepAction(agentX, agentY, agentHp) {
        return this.chooseAction(agentX, agentY, agentHp);
    }
}
