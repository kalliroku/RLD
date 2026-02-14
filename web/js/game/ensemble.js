/**
 * Ensemble algorithm - Boltzmann Multiplication
 * (Wiering & van Hasselt, 2008)
 *
 * Combines 5 sub-algorithms (Q-Learning, SARSA, Actor-Critic, QV-Learning, ACLA)
 * by multiplying their action probabilities and renormalizing.
 *
 * For Q-based algorithms: softmax(Q/temperature) -> probabilities
 * For prob-based algorithms (Actor-Critic, ACLA): use their policy probabilities directly
 *
 * Sub-algorithms run with epsilon=0 (exploration is handled at the ensemble level).
 */

import { Agent, Action, randomAction } from './agent.js';
import { TileType } from './tiles.js';
import { QLearning } from './qlearning.js';
import { SARSA } from './sarsa.js';
import { ActorCritic } from './actor-critic.js';
import { QVLearning } from './qv-learning.js';
import { ACLA } from './acla.js';

const NUM_ACTIONS = 4;

export class Ensemble {
    constructor(grid, options = {}) {
        this.grid = grid;

        // Ensemble-level exploration
        this.epsilon = options.epsilon ?? 1.0;
        this.epsilonMin = options.epsilonMin ?? 0.01;
        this.epsilonDecay = options.epsilonDecay ?? 0.995;

        // For interface compatibility
        this.alpha = options.alpha ?? 0.1;
        this.gamma = options.gamma ?? 0.99;

        // Boltzmann temperature for Q-based algorithms
        this.temperature = options.temperature ?? 1.0;

        // HP-aware state option
        this.useHpState = options.useHpState ?? false;

        // Sub-algorithm options: epsilon=0 (no individual exploration)
        const subOpts = {
            alpha: options.alpha ?? 0.1,
            gamma: options.gamma ?? 0.99,
            epsilon: 0,
            epsilonMin: 0,
            epsilonDecay: 1.0,
            useHpState: this.useHpState
        };

        this.subAlgos = [
            { name: 'qlearning',    algo: new QLearning(grid, { ...subOpts }),    type: 'q' },
            { name: 'sarsa',        algo: new SARSA(grid, { ...subOpts }),        type: 'q' },
            { name: 'actor-critic', algo: new ActorCritic(grid, {
                ...subOpts,
                alphaActor: 0.01,
                alphaCritic: 0.1
            }), type: 'prob' },
            { name: 'qv-learning',  algo: new QVLearning(grid, { ...subOpts }),   type: 'q' },
            { name: 'acla',         algo: new ACLA(grid, {
                ...subOpts,
                alphaActor: 0.05,
                alphaCritic: 0.1
            }), type: 'prob' },
        ];

        // Stats
        this.episodeRewards = [];
        this.episodeSteps = [];
    }

    /**
     * Convert Q-values to probabilities via softmax(Q/temperature)
     */
    softmax(qValues) {
        const t = this.temperature;
        const scaled = qValues.map(q => q / t);
        const maxVal = Math.max(...scaled);
        const exps = scaled.map(v => Math.exp(v - maxVal));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    }

    /**
     * Get action probabilities from a sub-algorithm for state (x, y, hp)
     */
    getSubProbs(sub, x, y, hp) {
        if (sub.type === 'prob') {
            // Actor-Critic and ACLA: getQValues() returns probabilities
            return sub.algo.getQValues(x, y, hp);
        }
        // Q-based: convert Q-values to probabilities via softmax
        const qValues = sub.algo.getQValues(x, y, hp);
        return this.softmax(qValues);
    }

    /**
     * Boltzmann Multiplication: multiply probabilities from all sub-algorithms, then normalize
     */
    getCombinedProbs(x, y, hp) {
        const combined = new Array(NUM_ACTIONS).fill(1);
        const minProb = 1e-10;

        for (const sub of this.subAlgos) {
            const probs = this.getSubProbs(sub, x, y, hp);
            for (let a = 0; a < NUM_ACTIONS; a++) {
                combined[a] *= Math.max(probs[a], minProb);
            }
        }

        // Normalize
        const sum = combined.reduce((a, b) => a + b, 0);
        if (sum <= 0) {
            return new Array(NUM_ACTIONS).fill(1 / NUM_ACTIONS);
        }
        return combined.map(p => p / sum);
    }

    chooseAction(x, y, hp = 100) {
        if (Math.random() < this.epsilon) return randomAction();

        const probs = this.getCombinedProbs(x, y, hp);

        // Sample from probability distribution
        const r = Math.random();
        let cumulative = 0;
        for (let a = 0; a < NUM_ACTIONS; a++) {
            cumulative += probs[a];
            if (r < cumulative) return a;
        }
        return NUM_ACTIONS - 1;
    }

    getBestAction(x, y, hp = 100) {
        const probs = this.getCombinedProbs(x, y, hp);
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

    /**
     * Fan out (s, a, r, s', done) to all sub-algorithms
     */
    learn(state, action, reward, nextState, done) {
        for (const sub of this.subAlgos) {
            sub.algo.learn(state, action, reward, nextState, done);
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
     * Value grid: average of all sub-algorithms' getMaxQValue
     */
    getValueGrid() {
        const values = [];
        for (let y = 0; y < this.grid.height; y++) {
            values[y] = [];
            for (let x = 0; x < this.grid.width; x++) {
                let sum = 0;
                for (const sub of this.subAlgos) {
                    sum += sub.algo.getMaxQValue(x, y);
                }
                values[y][x] = sum / this.subAlgos.length;
            }
        }
        return values;
    }

    /**
     * Policy grid: use ensemble's combined getBestAction
     */
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
        const subData = this.subAlgos.map(sub => ({
            name: sub.name,
            type: sub.type,
            data: sub.algo.serialize()
        }));

        return JSON.stringify({
            type: 'ensemble',
            subAlgos: subData,
            epsilon: this.epsilon,
            temperature: this.temperature,
            episodeRewards: this.episodeRewards,
            episodeSteps: this.episodeSteps,
            useHpState: this.useHpState
        });
    }

    deserialize(json) {
        const data = JSON.parse(json);

        if (data.subAlgos) {
            for (const saved of data.subAlgos) {
                const sub = this.subAlgos.find(s => s.name === saved.name);
                if (sub) {
                    sub.algo.deserialize(saved.data);
                }
            }
        }

        this.epsilon = data.epsilon ?? this.epsilon;
        this.temperature = data.temperature ?? this.temperature;
        this.episodeRewards = data.episodeRewards ?? [];
        this.episodeSteps = data.episodeSteps ?? [];
    }

    stepAction(agentX, agentY, agentHp) {
        return this.chooseAction(agentX, agentY, agentHp);
    }

    getAverageReward(window = 50) {
        const rewards = this.episodeRewards;
        if (rewards.length === 0) return 0;
        const start = Math.max(0, rewards.length - window);
        const slice = rewards.slice(start);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    }
}
