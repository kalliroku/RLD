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

        // HP-aware state option
        this.useHpState = options.useHpState ?? false;
        this.hpLevels = 5; // 0-4: 0-20, 21-40, 41-60, 61-80, 81-100

        // Initialize Q-table: state -> action -> value
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
                    this.qTable.set(state, [0, 0, 0, 0]); // 4 actions
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
        // Epsilon-greedy policy
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

        // Q-Learning update: Q(s,a) += α[r + γ·max Q(s',a') - Q(s,a)]
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

        // Track killed monsters for this episode (so they stay dead within episode)
        const killedMonsters = new Set();
        // Track collected gold for this episode (so it stays collected within episode)
        const collectedGold = new Set();

        while (steps < maxSteps) {
            const state = [agent.x, agent.y, agent.hp];
            const action = this.chooseAction(agent.x, agent.y, agent.hp);

            // Check if stepping onto a killed monster (treat as empty)
            const nextPos = agent.getNextPosition(action);
            const nextKey = `${nextPos.x},${nextPos.y}`;
            const originalTile = this.grid.getTile(nextPos.x, nextPos.y);

            // Temporarily remove monster if already killed
            if (killedMonsters.has(nextKey) && originalTile === TileType.MONSTER) {
                this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
            }
            // Temporarily remove gold if already collected
            if (collectedGold.has(nextKey) && originalTile === TileType.GOLD) {
                this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
            }

            const result = agent.move(action, this.grid);

            // Track monster kills
            if (result.tile === TileType.MONSTER && !killedMonsters.has(nextKey)) {
                killedMonsters.add(nextKey);
                // Keep monster removed for rest of episode
                this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
            }
            // Track gold collection
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
            const killedMonsters = new Set();
            const collectedGold = new Set();
            let steps = 0;

            while (steps < 200) {
                const action = this.getBestAction(agent.x, agent.y, agent.hp);

                // Handle killed monsters
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

    // Serialize Q-Table and metadata to JSON string
    serialize() {
        const entries = [];
        for (const [key, values] of this.qTable) {
            entries.push([key, values]);
        }
        return JSON.stringify({
            qTable: entries,
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

    // Restore Q-Table and metadata from JSON string
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

    // Execute a single step for visual training - returns action chosen
    stepAction(agentX, agentY, agentHp) {
        return this.chooseAction(agentX, agentY, agentHp);
    }
}
