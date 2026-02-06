/**
 * RL Dungeon - Main Entry Point
 */

import { loadDungeon } from './game/grid.js';
import { Agent, Action } from './game/agent.js';
import { Renderer } from './game/renderer.js';
import { TileType } from './game/tiles.js';
import { QLearning } from './game/qlearning.js';
import { sound } from './game/sound.js';

// Dungeon config: cost to enter, first clear reward, repeat reward
const DUNGEON_CONFIG = {
    level_01_easy:     { cost: 0,  firstReward: 30,  repeatReward: 3 },
    level_02_trap:     { cost: 5,  firstReward: 50,  repeatReward: 5 },
    level_03_maze:     { cost: 10, firstReward: 80,  repeatReward: 8 },
    level_04_pit:      { cost: 10, firstReward: 100, repeatReward: 10 },
    level_05_gold:     { cost: 15, firstReward: 120, repeatReward: 12 },
    level_06_risk:     { cost: 20, firstReward: 150, repeatReward: 15 },
    level_07_gauntlet: { cost: 25, firstReward: 200, repeatReward: 20 },
    level_08_deadly:   { cost: 30, firstReward: 250, repeatReward: 25 },
    level_09_treasure: { cost: 40, firstReward: 350, repeatReward: 35 },
    level_10_final:    { cost: 50, firstReward: 500, repeatReward: 50 },
    level_11_hp_test:  { cost: 0,  firstReward: 100, repeatReward: 10, useHpState: true },
    level_12_hp_gauntlet: { cost: 0, firstReward: 200, repeatReward: 20, useHpState: true }
};

// Dungeon order for unlock progression
const DUNGEON_ORDER = [
    'level_01_easy',
    'level_02_trap',
    'level_03_maze',
    'level_04_pit',
    'level_05_gold',
    'level_06_risk',
    'level_07_gauntlet',
    'level_08_deadly',
    'level_09_treasure',
    'level_10_final',
    'level_11_hp_test',
    'level_12_hp_gauntlet'
];

const STORAGE_KEY = 'rld_save_data';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);

        this.grid = null;
        this.agent = null;
        this.steps = 0;
        this.done = false;
        this.currentDungeon = 'level_01_easy';

        // Gold system & Progress
        this.gold = 100;
        this.clearedDungeons = new Set(); // Track first clears
        this.unlockedDungeons = new Set(['level_01_easy']); // Start with only level 1 unlocked

        // Load saved progress
        this.loadProgress();

        // Q-Learning
        this.qlearning = null;
        this.isTraining = false;
        this.aiPlaying = false;

        // Track killed monsters for restoration on reset
        this.killedMonsters = new Set();

        // UI elements
        this.goldText = document.getElementById('gold-text');
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
        this.fogOfWarCheck = document.getElementById('fog-of-war');
        this.showQValuesCheck = document.getElementById('show-qvalues');
        this.showPolicyCheck = document.getElementById('show-policy');

        this.setupEventListeners();
        this.updateDungeonSelect();
        this.loadDungeon('level_01_easy');
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.gold = data.gold ?? 100;
                this.clearedDungeons = new Set(data.clearedDungeons ?? []);
                this.unlockedDungeons = new Set(data.unlockedDungeons ?? ['level_01_easy']);
            }
        } catch (e) {
            console.warn('Failed to load save data:', e);
        }
    }

    saveProgress() {
        try {
            const data = {
                gold: this.gold,
                clearedDungeons: Array.from(this.clearedDungeons),
                unlockedDungeons: Array.from(this.unlockedDungeons)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save progress:', e);
        }
    }

    updateDungeonSelect() {
        const options = this.dungeonSelect.querySelectorAll('option');
        options.forEach(option => {
            const dungeonId = option.value;
            const isUnlocked = this.unlockedDungeons.has(dungeonId);
            const isCleared = this.clearedDungeons.has(dungeonId);

            option.disabled = !isUnlocked;

            // Update display text with lock/clear status
            const levelMatch = dungeonId.match(/level_(\d+)_(\w+)/);
            if (levelMatch) {
                const levelNum = parseInt(levelMatch[1]);
                const levelName = this.getDungeonDisplayName(dungeonId);

                if (!isUnlocked) {
                    option.textContent = `🔒 Lv.${levelNum} ???`;
                } else if (isCleared) {
                    option.textContent = `✓ Lv.${levelNum} ${levelName}`;
                } else {
                    option.textContent = `Lv.${levelNum} ${levelName}`;
                }
            }
        });
    }

    getDungeonDisplayName(dungeonId) {
        const names = {
            level_01_easy: 'Tutorial',
            level_02_trap: 'First Trap',
            level_03_maze: 'Maze',
            level_04_pit: 'Pit Danger',
            level_05_gold: 'Gold Rush',
            level_06_risk: 'Risk & Reward',
            level_07_gauntlet: 'Gauntlet',
            level_08_deadly: 'Deadly Maze',
            level_09_treasure: 'Treasure Hunt',
            level_10_final: 'Final',
            level_11_hp_test: 'HP Test',
            level_12_hp_gauntlet: 'HP Gauntlet'
        };
        return names[dungeonId] || dungeonId;
    }

    setupEventListeners() {
        // Initialize sound on first interaction
        const initSound = () => {
            sound.init();
            document.removeEventListener('keydown', initSound);
            document.removeEventListener('click', initSound);
        };
        document.addEventListener('keydown', initSound);
        document.addEventListener('click', initSound);

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // UI controls
        this.dungeonSelect.addEventListener('change', (e) => {
            const selected = e.target.value;
            if (!this.unlockedDungeons.has(selected)) {
                // Revert to current dungeon if locked
                e.target.value = this.currentDungeon;
                this.showMessage('🔒 Clear previous dungeons first!', 'warning');
                return;
            }
            this.loadDungeon(selected);
        });

        this.resetBtn.addEventListener('click', () => this.tryEnterDungeon());

        // Training controls
        this.trainBtn.addEventListener('click', () => this.startTraining());
        this.playAiBtn.addEventListener('click', () => this.toggleAiPlay());

        // Fog of War toggle
        this.fogOfWarCheck.addEventListener('change', (e) => {
            this.renderer.fogOfWar = e.target.checked;
            this.render();
        });

        // Sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.addEventListener('change', (e) => {
            sound.enabled = e.target.checked;
            if (e.target.checked) {
                sound.click();
            }
        });

        // Visualization toggles
        this.showQValuesCheck.addEventListener('change', (e) => {
            this.renderer.showQValues = e.target.checked;
            this.updateVisualization();
        });

        this.showPolicyCheck.addEventListener('change', (e) => {
            this.renderer.showPolicy = e.target.checked;
            this.updateVisualization();
        });

        // Initialize fog of war state
        this.renderer.fogOfWar = this.fogOfWarCheck.checked;
    }

    handleKeyDown(e) {
        if (this.isTraining || this.aiPlaying) return;

        if (this.done) {
            if (e.key === 'r' || e.key === 'R') {
                this.tryEnterDungeon();
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
                this.tryEnterDungeon();
                return;
        }

        if (action !== null) {
            e.preventDefault();
            this.handleAction(action);
        }
    }

    loadDungeon(name) {
        this.currentDungeon = name;
        this.grid = loadDungeon(name);
        this.renderer.setGrid(this.grid);

        // Reset Q-Learning for new dungeon
        const config = DUNGEON_CONFIG[name];
        this.qlearning = new QLearning(this.grid, {
            useHpState: config.useHpState ?? false
        });
        this.playAiBtn.disabled = true;
        this.trainStats.innerHTML = '';
        this.renderer.setQData(null, null);

        const hpNote = config.useHpState ? ' [HP-Aware AI]' : '';
        this.showMessage(`${name} - Cost: ${config.cost}G, Reward: ${config.firstReward}G${hpNote}`, 'info');

        this.reset();
    }

    tryEnterDungeon() {
        const config = DUNGEON_CONFIG[this.currentDungeon];

        if (this.gold < config.cost) {
            this.showMessage(`Not enough gold! Need ${config.cost}G`, 'danger');
            this.renderer.flash('rgba(239, 68, 68, 0.3)');
            return;
        }

        // Deduct entry cost
        this.gold -= config.cost;
        this.saveProgress(); // Save gold change
        this.updateUI();
        this.reset();

        sound.start();
        if (config.cost > 0) {
            this.showMessage(`Paid ${config.cost}G to enter. Good luck!`, 'warning');
        } else {
            this.showMessage('Game Reset! Reach the green goal.', 'info');
        }
    }

    reset() {
        if (!this.grid || !this.grid.startPos) {
            console.error('No start position!');
            return;
        }

        // Restore killed monsters before reset
        for (const key of this.killedMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
        this.killedMonsters.clear();

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
    }

    handleAction(action) {
        if (this.done) return;

        // Learning from Demonstration: save state before action
        const prevState = [this.agent.x, this.agent.y, this.agent.hp];

        const result = this.agent.move(action, this.grid);
        this.steps++;

        // Learning from Demonstration: teach Q-learning from user play
        if (this.qlearning && !this.aiPlaying) {
            const nextState = [this.agent.x, this.agent.y, this.agent.hp];
            this.qlearning.learn(prevState, action, result.reward, nextState, result.done);
        }

        // Handle result
        if (result.done) {
            this.done = true;
            const tile = this.grid.getTile(this.agent.x, this.agent.y);

            if (tile === TileType.GOAL) {
                this.handleVictory();
            } else if (tile === TileType.PIT) {
                sound.pit();
                this.showMessage(`FELL INTO PIT! Instant death...`, 'danger');
                this.renderer.flash('rgba(0, 0, 0, 0.8)');
            } else {
                sound.death();
                this.showMessage(`DIED! Steps: ${this.steps}`, 'danger');
                this.renderer.flash('rgba(239, 68, 68, 0.5)');
            }
        } else if (!result.success) {
            sound.bump();
            this.showMessage('Bump! (-1)', 'warning');
        } else if (result.tile === TileType.TRAP) {
            sound.trap();
            this.showMessage(`TRAP! HP -10`, 'danger');
            this.renderer.flash('rgba(239, 68, 68, 0.3)');
        } else if (result.tile === TileType.HEAL) {
            sound.heal();
            this.showMessage(`HEAL! HP +10`, 'success');
            this.renderer.flash('rgba(244, 114, 182, 0.3)');
        } else if (result.tile === TileType.PIT) {
            // Already handled in done check
        } else if (result.tile === TileType.GOLD) {
            sound.gold();
            this.showMessage(`Found Gold! +10`, 'success');
            this.renderer.flash('rgba(251, 191, 36, 0.3)');
        } else if (result.tile === TileType.MONSTER) {
            sound.monster();
            // Monster defeated - track for restoration, remove from grid, give gold reward
            const monsterKey = `${this.agent.x},${this.agent.y}`;
            this.killedMonsters.add(monsterKey);
            this.grid.setTile(this.agent.x, this.agent.y, TileType.EMPTY);
            this.gold += 5; // Monster defeat reward
            this.showMessage(`MONSTER! HP -30, Defeated! +5G`, 'warning');
            this.renderer.flash('rgba(147, 51, 234, 0.4)');
        } else {
            sound.move();
        }

        this.updateUI();
        this.render();
    }

    handleVictory() {
        const config = DUNGEON_CONFIG[this.currentDungeon];
        const isFirstClear = !this.clearedDungeons.has(this.currentDungeon);

        let reward;
        let unlockedNext = false;

        if (isFirstClear) {
            reward = config.firstReward;
            this.clearedDungeons.add(this.currentDungeon);
            this.gold += reward;

            // Unlock next dungeon
            const currentIndex = DUNGEON_ORDER.indexOf(this.currentDungeon);
            if (currentIndex >= 0 && currentIndex < DUNGEON_ORDER.length - 1) {
                const nextDungeon = DUNGEON_ORDER[currentIndex + 1];
                if (!this.unlockedDungeons.has(nextDungeon)) {
                    this.unlockedDungeons.add(nextDungeon);
                    unlockedNext = true;
                }
            }

            if (unlockedNext) {
                sound.victory();
                setTimeout(() => sound.unlock(), 600);
                const nextName = this.getDungeonDisplayName(DUNGEON_ORDER[currentIndex + 1]);
                this.showMessage(`FIRST CLEAR! +${reward}G 🔓 ${nextName} Unlocked!`, 'success');
            } else {
                sound.victory();
                this.showMessage(`FIRST CLEAR! +${reward}G (Steps: ${this.steps})`, 'success');
            }

            // Update dropdown to show new unlock
            this.updateDungeonSelect();
        } else {
            sound.victory();
            reward = config.repeatReward;
            this.gold += reward;
            this.showMessage(`CLEAR! +${reward}G (Steps: ${this.steps})`, 'success');
        }

        // Save progress
        this.saveProgress();

        this.renderer.flash('rgba(34, 197, 94, 0.4)');
        this.updateUI();
    }

    async startTraining() {
        if (this.isTraining) return;

        this.isTraining = true;
        this.trainBtn.disabled = true;
        this.playAiBtn.disabled = true;
        this.trainProgress.style.display = 'block';

        // Disable fog of war during training visualization
        const wasFogOn = this.renderer.fogOfWar;
        this.renderer.fogOfWar = false;

        // Reset Q-Learning (preserve useHpState from config)
        const config = DUNGEON_CONFIG[this.currentDungeon];
        this.qlearning = new QLearning(this.grid, {
            alpha: 0.1,
            gamma: 0.99,
            epsilon: 1.0,
            epsilonMin: 0.01,
            epsilonDecay: 0.995,
            useHpState: config.useHpState ?? false
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
            <div>Clear Rate: ${(testResult.successRate * 100).toFixed(0)}%</div>
            <div>Avg Steps: ${testResult.avgSteps.toFixed(1)}</div>
        `;

        this.isTraining = false;
        this.trainBtn.disabled = false;
        this.playAiBtn.disabled = false;
        this.trainProgress.style.display = 'none';

        // Restore fog of war state
        this.renderer.fogOfWar = wasFogOn;

        this.updateVisualization();
        this.showMessage(`Training done! Clear rate: ${(testResult.successRate * 100).toFixed(0)}%`, 'success');
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
            // AI doesn't pay gold, just resets
            this.reset();
            this.aiPlaying = true;
            this.playAiBtn.textContent = 'Stop AI';

            // Disable fog for AI play
            this.renderer.fogOfWar = false;
            this.runAiStep();
        }
    }

    runAiStep() {
        if (!this.aiPlaying || this.done) {
            this.aiPlaying = false;
            this.playAiBtn.textContent = 'AI Play';
            // Restore fog setting
            this.renderer.fogOfWar = this.fogOfWarCheck.checked;
            this.render();
            return;
        }

        const action = this.qlearning.getBestAction(this.agent.x, this.agent.y, this.agent.hp);
        this.handleAction(action);

        // Schedule next step
        setTimeout(() => this.runAiStep(), 300);
    }

    updateUI() {
        // Gold
        this.goldText.textContent = this.gold;

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
