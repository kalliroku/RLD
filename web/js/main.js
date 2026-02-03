/**
 * RL Dungeon - Main Entry Point
 */

import { loadDungeon } from './game/grid.js';
import { Agent, Action } from './game/agent.js';
import { Renderer } from './game/renderer.js';
import { TileType } from './game/tiles.js';
import { QLearning } from './game/qlearning.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);

        this.grid = null;
        this.agent = null;
        this.steps = 0;
        this.done = false;

        // Q-Learning
        this.qlearning = null;
        this.isTraining = false;
        this.aiPlaying = false;

        // UI elements
        this.hpFill = document.getElementById('hp-fill');
        this.hpText = document.getElementById('hp-text');
        this.stepsText = document.getElementById('steps-text');
        this.rewardText = document.getElementById('reward-text');
        this.messageEl = document.getElementById('message');
        this.dungeonSelect = document.getElementById('dungeon-select');
        this.resetBtn = document.getElementById('btn-reset');

        // Training UI
        this.trainBtn = document.getElementById('btn-train');
        this.playAiBtn = document.getElementById('btn-play-ai');
        this.trainProgress = document.getElementById('train-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.trainStats = document.getElementById('train-stats');

        // Visualization checkboxes
        this.showQValuesCheck = document.getElementById('show-qvalues');
        this.showPolicyCheck = document.getElementById('show-policy');

        this.setupEventListeners();
        this.loadDungeon('level_01_easy');
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // UI controls
        this.dungeonSelect.addEventListener('change', (e) => {
            this.loadDungeon(e.target.value);
        });

        this.resetBtn.addEventListener('click', () => this.reset());

        // Training controls
        this.trainBtn.addEventListener('click', () => this.startTraining());
        this.playAiBtn.addEventListener('click', () => this.toggleAiPlay());

        // Visualization toggles
        this.showQValuesCheck.addEventListener('change', (e) => {
            this.renderer.showQValues = e.target.checked;
            this.updateVisualization();
        });

        this.showPolicyCheck.addEventListener('change', (e) => {
            this.renderer.showPolicy = e.target.checked;
            this.updateVisualization();
        });
    }

    handleKeyDown(e) {
        if (this.isTraining || this.aiPlaying) return;

        if (this.done) {
            if (e.key === 'r' || e.key === 'R') {
                this.reset();
            }
            return;
        }

        let action = null;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                action = Action.UP;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                action = Action.DOWN;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                action = Action.LEFT;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                action = Action.RIGHT;
                break;
            case 'r':
            case 'R':
                this.reset();
                return;
        }

        if (action !== null) {
            e.preventDefault();
            this.handleAction(action);
        }
    }

    loadDungeon(name) {
        this.grid = loadDungeon(name);
        this.renderer.setGrid(this.grid);

        // Reset Q-Learning for new dungeon
        this.qlearning = new QLearning(this.grid);
        this.playAiBtn.disabled = true;
        this.trainStats.innerHTML = '';
        this.renderer.setQData(null, null);

        this.reset();
        this.showMessage(`Loaded: ${name}`, 'info');
    }

    reset() {
        if (!this.grid || !this.grid.startPos) {
            console.error('No start position!');
            return;
        }

        const { x, y } = this.grid.startPos;

        if (!this.agent) {
            this.agent = new Agent(x, y);
        } else {
            this.agent.reset(x, y);
        }

        this.renderer.setAgent(this.agent);
        this.steps = 0;
        this.done = false;
        this.aiPlaying = false;
        this.playAiBtn.textContent = 'AI Play';

        this.updateUI();
        this.render();
        this.showMessage('Game Reset! Reach the green goal.', 'info');
    }

    handleAction(action) {
        if (this.done) return;

        const result = this.agent.move(action, this.grid);
        this.steps++;

        // Handle result
        if (result.done) {
            this.done = true;
            const tile = this.grid.getTile(this.agent.x, this.agent.y);

            if (tile === TileType.GOAL) {
                this.showMessage(`GOAL! Steps: ${this.steps}, Reward: ${this.agent.totalReward.toFixed(1)}`, 'success');
            } else {
                this.showMessage(`DIED! Steps: ${this.steps}, Reward: ${this.agent.totalReward.toFixed(1)}`, 'danger');
                this.renderer.flash('rgba(239, 68, 68, 0.5)');
            }
        } else if (!result.success) {
            this.showMessage('Bump! (-1)', 'warning');
        } else if (result.tile === TileType.TRAP) {
            this.showMessage(`TRAP! HP -10 (Reward: ${result.reward.toFixed(1)})`, 'danger');
            this.renderer.flash('rgba(239, 68, 68, 0.3)');
        } else if (result.tile === TileType.HEAL) {
            this.showMessage(`HEAL! HP +10`, 'success');
            this.renderer.flash('rgba(244, 114, 182, 0.3)');
        }

        this.updateUI();
        this.render();
    }

    async startTraining() {
        if (this.isTraining) return;

        this.isTraining = true;
        this.trainBtn.disabled = true;
        this.playAiBtn.disabled = true;
        this.trainProgress.style.display = 'block';

        // Reset Q-Learning
        this.qlearning = new QLearning(this.grid, {
            alpha: 0.1,
            gamma: 0.99,
            epsilon: 1.0,
            epsilonMin: 0.01,
            epsilonDecay: 0.995
        });

        const nEpisodes = 500;

        this.showMessage('Training AI...', 'info');

        await this.qlearning.train(nEpisodes, {
            onProgress: (stats) => {
                const percent = (stats.episode / nEpisodes) * 100;
                this.progressFill.style.width = `${percent}%`;
                this.progressText.textContent = `${stats.episode}/${nEpisodes} (ε=${stats.epsilon.toFixed(2)})`;

                // Update visualization during training
                this.updateVisualization();
            },
            batchSize: 10
        });

        // Training complete
        const testResult = this.qlearning.test(100);

        this.trainStats.innerHTML = `
            <div>Success: ${(testResult.successRate * 100).toFixed(0)}%</div>
            <div>Avg Reward: ${testResult.avgReward.toFixed(1)}</div>
            <div>Avg Steps: ${testResult.avgSteps.toFixed(1)}</div>
        `;

        this.isTraining = false;
        this.trainBtn.disabled = false;
        this.playAiBtn.disabled = false;
        this.trainProgress.style.display = 'none';

        this.updateVisualization();
        this.showMessage(`Training complete! Success rate: ${(testResult.successRate * 100).toFixed(0)}%`, 'success');
    }

    updateVisualization() {
        if (this.qlearning) {
            const qValues = this.qlearning.getValueGrid();
            const policy = this.qlearning.getPolicyGrid();
            this.renderer.setQData(qValues, policy);
        }
        this.render();
    }

    toggleAiPlay() {
        if (!this.qlearning) return;

        if (this.aiPlaying) {
            this.aiPlaying = false;
            this.playAiBtn.textContent = 'AI Play';
        } else {
            this.reset();
            this.aiPlaying = true;
            this.playAiBtn.textContent = 'Stop AI';
            this.runAiStep();
        }
    }

    runAiStep() {
        if (!this.aiPlaying || this.done) {
            this.aiPlaying = false;
            this.playAiBtn.textContent = 'AI Play';
            return;
        }

        const action = this.qlearning.getBestAction(this.agent.x, this.agent.y);
        this.handleAction(action);

        // Schedule next step
        setTimeout(() => this.runAiStep(), 300);
    }

    updateUI() {
        if (!this.agent) return;

        // HP
        const hpPercent = (this.agent.hp / this.agent.maxHp) * 100;
        this.hpFill.style.width = `${hpPercent}%`;
        this.hpText.textContent = `${this.agent.hp}/${this.agent.maxHp}`;

        // Steps
        this.stepsText.textContent = this.steps;

        // Reward
        const reward = this.agent.totalReward;
        this.rewardText.textContent = reward.toFixed(1);
        this.rewardText.style.color = reward >= 0 ? '#4ade80' : '#ef4444';
    }

    showMessage(text, type = 'info') {
        this.messageEl.textContent = text;
        this.messageEl.className = 'message ' + type;
    }

    render() {
        this.renderer.render();
    }
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
