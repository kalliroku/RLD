/**
 * n-step Tree Backup algorithm implementation
 * 트리백 - n걸음 앞을 내다보는 전략가. 기대값의 나무를 키웁니다.
 *
 * Reference: Sutton & Barto (2018) Section 7.5, "A Unifying Algorithm: n-step Tree Backup"
 *
 * Key idea: Expected SARSA의 n-step 확장.
 * 각 중간 단계에서 실제 선택한 행동뿐 아니라 모든 행동의 기대값을 가중합하여
 * off-policy n-step return을 계산. importance sampling 없이 off-policy 가능.
 *
 * Tree Backup Return:
 *   G_t:t+n = R_{t+1} + γ·Σ_{a≠A_{t+1}} π(a|S_{t+1})·Q(S_{t+1},a)
 *             + γ·π(A_{t+1}|S_{t+1})·[R_{t+2} + γ·Σ_{a≠A_{t+2}} π(a|S_{t+2})·Q(S_{t+2},a)
 *             + γ·π(A_{t+2}|S_{t+2})·[ ... ]]
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';

export class TreeBackup {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Hyperparameters
        this.alpha = options.alpha ?? 0.5;
        this.gamma = options.gamma ?? 0.99;
        this.epsilon = options.epsilon ?? 1.0;
        this.epsilonMin = options.epsilonMin ?? 0.01;
        this.epsilonDecay = options.epsilonDecay ?? 0.995;
        this.n = options.n ?? 4; // n-step lookahead

        // HP-aware state option
        this.useHpState = options.useHpState ?? false;
        this.hpLevels = 5;

        // Initialize Q-table
        this.qTable = new Map();
        this.initQTable();

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

    /**
     * Get ε-greedy action probability π(a|s)
     */
    getActionProb(x, y, action, hp = 100) {
        const numActions = 4;
        const bestAction = this.getBestAction(x, y, hp);
        if (action === bestAction) {
            return (1 - this.epsilon) + (this.epsilon / numActions);
        }
        return this.epsilon / numActions;
    }

    /**
     * Expected Q-value under ε-greedy policy: Σ_a π(a|s)·Q(s,a)
     */
    getExpectedQValue(x, y, hp = 100) {
        const qValues = this.getQValues(x, y, hp);
        const numActions = 4;
        const bestAction = this.getBestAction(x, y, hp);

        let expected = 0;
        for (let a = 0; a < numActions; a++) {
            const prob = (a === bestAction)
                ? (1 - this.epsilon) + (this.epsilon / numActions)
                : (this.epsilon / numActions);
            expected += prob * qValues[a];
        }
        return expected;
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

        // Circular buffer for n-step tree backup
        // Each entry: { state: [x,y,hp], action, reward, actionProb }
        const buffer = [];
        const n = this.n;

        // Initialize: first state and action
        let state = [agent.x, agent.y, agent.hp];
        let action = this.chooseAction(agent.x, agent.y, agent.hp);
        let actionProb = this.getActionProb(agent.x, agent.y, action, agent.hp);

        buffer.push({ state, action, reward: 0, actionProb });

        let T = Infinity; // termination timestep
        let t = 0;

        while (true) {
            if (t < T) {
                // Take action
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

                totalReward += result.reward;
                steps++;

                const nextState = [agent.x, agent.y, agent.hp];

                if (result.done) {
                    if (this.grid.tryAdvanceStage && this.grid.tryAdvanceStage(agent)) {
                        // Multi-stage advance: continue
                        state = [agent.x, agent.y, agent.hp];
                        action = this.chooseAction(agent.x, agent.y, agent.hp);
                        actionProb = this.getActionProb(agent.x, agent.y, action, agent.hp);
                        buffer.push({ state: nextState, action: null, reward: result.reward, actionProb: 0 });
                        buffer[buffer.length - 1].action = action;
                        buffer[buffer.length - 1].actionProb = actionProb;
                        t++;
                        if (steps >= maxSteps) {
                            T = t;
                            buffer[buffer.length - 1].action = null;
                        }
                        continue;
                    }
                    T = t + 1;
                    buffer.push({ state: nextState, action: null, reward: result.reward, actionProb: 0 });
                } else if (steps >= maxSteps) {
                    T = t + 1;
                    buffer.push({ state: nextState, action: null, reward: result.reward, actionProb: 0 });
                } else {
                    // Choose next action
                    const nextAction = this.chooseAction(agent.x, agent.y, agent.hp);
                    const nextActionProb = this.getActionProb(agent.x, agent.y, nextAction, agent.hp);
                    buffer.push({ state: nextState, action: nextAction, reward: result.reward, actionProb: nextActionProb });
                    state = nextState;
                    action = nextAction;
                    actionProb = nextActionProb;
                }
            }

            // Update time: τ = t - n + 1
            const tau = t - n + 1;
            if (tau >= 0) {
                this._updateTreeBackup(buffer, tau, T);
            }

            t++;
            if (tau >= T - 1) break;
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
        this.episodeRewards.push(totalReward);
        this.episodeSteps.push(steps);

        return { totalReward, steps, success: agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL };
    }

    /**
     * n-step Tree Backup update (Sutton & Barto Section 7.5)
     *
     * Buffer layout: buffer[k].reward = R_k (reward from transition S_{k-1} → S_k)
     * buffer[0].reward = 0 (initial state, no transition)
     *
     * Tree backup return G_{τ:endIdx}:
     *   Base: G = ExpQ(S_{endIdx}) if endIdx < T, else 0
     *   For k from endIdx-1 down to τ:
     *     if k == endIdx-1: G = R_{k+1} + γ·G   (leaf level)
     *     else: G = R_{k+1} + γ·[ExpQ(S_{k+1}) - π(A_{k+1})·Q(S_{k+1},A_{k+1}) + π(A_{k+1})·G]
     */
    _updateTreeBackup(buffer, tau, T) {
        const tauEntry = buffer[tau];
        if (tauEntry.action === null) return;

        const endIdx = Math.min(tau + this.n, T);

        // Base case: bootstrap or terminal
        let G;
        if (endIdx >= T) {
            G = 0;
        } else {
            const [ex, ey, ehp] = buffer[endIdx].state;
            G = this.getExpectedQValue(ex, ey, ehp);
        }

        // Backward pass
        for (let k = endIdx - 1; k >= tau; k--) {
            const reward = buffer[k + 1].reward;

            if (k === endIdx - 1) {
                // Leaf level: just add reward + discounted bootstrap
                G = reward + this.gamma * G;
            } else {
                // Inner level: apply tree decomposition at S_{k+1}
                const [sx, sy, shp] = buffer[k + 1].state;
                const expectedQ = this.getExpectedQValue(sx, sy, shp);
                const pi = buffer[k + 1].actionProb;
                const actionQ = this.getQValue(sx, sy, buffer[k + 1].action, shp);
                G = reward + this.gamma * (expectedQ - pi * actionQ + pi * G);
            }
        }

        // Update Q(S_τ, A_τ)
        const [tx, ty, thp] = tauEntry.state;
        const currentQ = this.getQValue(tx, ty, tauEntry.action, thp);
        const newQ = currentQ + this.alpha * (G - currentQ);
        this.setQValue(tx, ty, tauEntry.action, newQ, thp);
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
        const entries = [];
        for (const [key, values] of this.qTable) {
            entries.push([key, values]);
        }
        return JSON.stringify({
            type: 'tree-backup',
            qTable: entries,
            epsilon: this.epsilon,
            episodeRewards: this.episodeRewards,
            episodeSteps: this.episodeSteps,
            alpha: this.alpha,
            gamma: this.gamma,
            n: this.n,
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
        if (data.alpha !== undefined) this.alpha = data.alpha;
        if (data.gamma !== undefined) this.gamma = data.gamma;
        if (data.n !== undefined) this.n = data.n;
        if (data.epsilonMin !== undefined) this.epsilonMin = data.epsilonMin;
        if (data.epsilonDecay !== undefined) this.epsilonDecay = data.epsilonDecay;
    }

    stepAction(agentX, agentY, agentHp) {
        return this.chooseAction(agentX, agentY, agentHp);
    }
}
