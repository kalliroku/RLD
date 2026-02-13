/**
 * RL Dungeon - Main Entry Point
 */

import { loadDungeon } from './game/grid.js';
import { Agent, Action } from './game/agent.js';
import { Renderer } from './game/renderer.js';
import { TileType } from './game/tiles.js';
import { QLearning } from './game/qlearning.js';
import { LocalQLearning } from './game/local-qlearning.js';
import { SARSA } from './game/sarsa.js';
import { MonteCarlo } from './game/monte-carlo.js';
import { SarsaLambda } from './game/sarsa-lambda.js';
import { DynaQ } from './game/dyna-q.js';
import { Reinforce } from './game/reinforce.js';
import { ActorCritic } from './game/actor-critic.js';
import { sound } from './game/sound.js';

// Character registry
const CHARACTERS = {
    qkun:   { name: 'Q군',     algo: 'Q-Learning',   cls: QLearning,      desc: '좌표를 외워서 학습합니다. 던전별 전문가.' },
    scout:  { name: '스카우트', algo: 'Local Q',      cls: LocalQLearning, desc: '주변을 관찰해서 학습합니다. 처음 보는 던전도 경험을 활용!' },
    sarsa:  { name: '사르사',   algo: 'SARSA',        cls: SARSA,          desc: '실수에서 배우는 신중파. 안전한 길을 선호합니다.' },
    monte:  { name: '몬테',     algo: 'Monte Carlo',  cls: MonteCarlo,     desc: '끝까지 가봐야 안다! 완주 후 복기하는 사색가.' },
    tracer: { name: '트레이서', algo: 'SARSA(λ)',     cls: SarsaLambda,    desc: '발자취를 남기며 학습. 먼 과거의 선택도 평가합니다.' },
    dyna:   { name: '다이나',   algo: 'Dyna-Q',       cls: DynaQ,          desc: '상상력의 달인. 경험을 머릿속에서 반복 재생합니다.' },
    gradi:  { name: '그래디',   algo: 'REINFORCE',    cls: Reinforce,      desc: '직감형 탐험가. 확률로 판단, 다양한 경로를 시도합니다.' },
    critic: { name: '크리틱',   algo: 'Actor-Critic', cls: ActorCritic,    desc: '배우와 비평가를 겸비. 안정적이고 효율적입니다.' },
};

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
    level_12_hp_gauntlet: { cost: 0, firstReward: 200, repeatReward: 20, useHpState: true },
    level_13_cliff:    { cost: 0,  firstReward: 100, repeatReward: 10 },
    level_14_long_hall: { cost: 0, firstReward: 150, repeatReward: 15 },
    level_15_multi_room: { cost: 0, firstReward: 120, repeatReward: 12 },
    level_16_open_field: { cost: 0, firstReward: 100, repeatReward: 10 },
    level_17_two_paths: { cost: 0, firstReward: 120, repeatReward: 12 },
    level_18_dead_end: { cost: 0, firstReward: 150, repeatReward: 15 },
    level_19_bridge: { cost: 0, firstReward: 150, repeatReward: 15 },
    level_20_sacrifice: { cost: 0, firstReward: 150, repeatReward: 15 },
    level_21_desert: { cost: 0, firstReward: 150, repeatReward: 15 },
    level_22_arena: { cost: 0, firstReward: 200, repeatReward: 20, useHpState: true },
    level_23_mirage: { cost: 0, firstReward: 150, repeatReward: 15 }
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
    'level_12_hp_gauntlet',
    'level_13_cliff',
    'level_14_long_hall',
    'level_15_multi_room',
    'level_16_open_field',
    'level_17_two_paths',
    'level_18_dead_end',
    'level_19_bridge',
    'level_20_sacrifice',
    'level_21_desert',
    'level_22_arena',
    'level_23_mirage'
];

const STORAGE_KEY = 'rld_save_data';

// Training speed delays (ms per step)
const SPEED_DELAYS = {
    1: 1500,  // 1x - slow observation
    2: 750,   // 2x
    3: 500,   // 3x
    0: 0      // Instant - no visualization
};

const MAX_EPISODES = 10000;
const CONVERGENCE_WINDOW = 20;
const CONVERGENCE_THRESHOLD = 0.95; // 95% success rate

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);

        this.grid = null;
        this.agent = null;
        this.steps = 0;
        this.done = false;
        this.currentDungeon = 'level_01_easy';
        this.currentCharacter = 'qkun';

        // Gold system & Progress
        this.gold = 100;
        this.clearedDungeons = new Set();
        this.unlockedDungeons = new Set(['level_01_easy']);

        // Load saved progress
        this.loadProgress();
        this.migrateOldQTables();

        // Algorithm instance (was qlearning, now generic)
        this.qlearning = null;
        this.isTraining = false;

        // Training state
        this.trainingSpeed = 1;
        this.trainingMode = 'until_success';
        this.trainingEpisode = 0;
        this.trainingStepTimer = null;
        this.recentResults = [];
        this.trainingAgent = null;
        this.trainingKilledMonsters = new Set();
        this.trainingCollectedGold = new Set();
        this.trainingTotalReward = 0;
        this.trainingSteps = 0;

        // Track killed monsters for restoration on reset
        this.killedMonsters = new Set();
        // Track collected gold for restoration on reset
        this.collectedGold = new Set();

        // Touch state
        this.touchStartX = 0;
        this.touchStartY = 0;

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
        this.startTrainBtn = document.getElementById('btn-start-train');
        this.stopTrainBtn = document.getElementById('btn-stop-train');
        this.trainModeSelect = document.getElementById('train-mode');
        this.trainProgress = document.getElementById('train-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.trainStats = document.getElementById('train-stats');

        // Character UI
        this.characterDesc = document.getElementById('character-desc');

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

    // Q-Table persistence (keyed by character + dungeon)
    getQTableKey() {
        return `rld_qtable_${this.currentCharacter}_${this.currentDungeon}`;
    }

    saveQTable() {
        if (!this.qlearning) return;
        try {
            const key = this.getQTableKey();
            const serialized = this.qlearning.serialize();
            localStorage.setItem(key, serialized);

            // Scout: also save to shared key for transfer learning
            if (this.currentCharacter === 'scout') {
                localStorage.setItem('rld_qtable_scout_shared', serialized);
            }
        } catch (e) {
            console.warn('Failed to save Q-Table:', e);
        }
    }

    loadQTable() {
        if (!this.qlearning) return false;
        try {
            const key = this.getQTableKey();
            const saved = localStorage.getItem(key);
            if (saved) {
                this.qlearning.deserialize(saved);
                return true;
            }

            // Scout: try shared Q-Table for transfer learning
            if (this.currentCharacter === 'scout') {
                const shared = localStorage.getItem('rld_qtable_scout_shared');
                if (shared) {
                    this.qlearning.deserialize(shared);
                    this.qlearning.epsilon = 0.5;
                    this.qlearning.episodeRewards = [];
                    this.qlearning.episodeSteps = [];
                    return true;
                }
            }
        } catch (e) {
            console.warn('Failed to load Q-Table:', e);
        }
        return false;
    }

    // Migrate old Q-Table keys (pre-character era) to qkun
    migrateOldQTables() {
        try {
            for (const dungeon of DUNGEON_ORDER) {
                const oldKey = `rld_qtable_${dungeon}`;
                const newKey = `rld_qtable_qkun_${dungeon}`;
                const old = localStorage.getItem(oldKey);
                if (old && !localStorage.getItem(newKey)) {
                    localStorage.setItem(newKey, old);
                    localStorage.removeItem(oldKey);
                }
            }
        } catch (e) {
            console.warn('Q-Table migration failed:', e);
        }
    }

    updateDungeonSelect() {
        const options = this.dungeonSelect.querySelectorAll('option');
        options.forEach(option => {
            const dungeonId = option.value;
            const isUnlocked = this.unlockedDungeons.has(dungeonId);
            const isCleared = this.clearedDungeons.has(dungeonId);

            option.disabled = !isUnlocked;

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
            level_12_hp_gauntlet: 'HP Gauntlet',
            level_13_cliff: 'Cliff Walk',
            level_14_long_hall: 'Long Hall',
            level_15_multi_room: 'Multi Room',
            level_16_open_field: 'Open Field',
            level_17_two_paths: 'Two Paths',
            level_18_dead_end: 'Dead End Labyrinth',
            level_19_bridge: 'Narrow Bridge',
            level_20_sacrifice: 'Cliff Walking',
            level_21_desert: 'Desert Crossing',
            level_22_arena: 'Monster Arena',
            level_23_mirage: 'The Mirage'
        };
        return names[dungeonId] || dungeonId;
    }

    /**
     * Create algorithm instance based on current character
     */
    createAlgorithm(config, overrides = {}) {
        const charDef = CHARACTERS[this.currentCharacter];
        if (!charDef) {
            console.error('Unknown character:', this.currentCharacter);
            return new QLearning(this.grid, overrides);
        }

        const baseOpts = {
            alpha: overrides.alpha ?? 0.1,
            gamma: overrides.gamma ?? 0.99,
            epsilon: overrides.epsilon ?? 1.0,
            epsilonMin: overrides.epsilonMin ?? 0.01,
            epsilonDecay: overrides.epsilonDecay ?? 0.995,
            useHpState: config.useHpState ?? false
        };

        // Character-specific option overrides
        switch (this.currentCharacter) {
            case 'scout':
                return new LocalQLearning(this.grid, baseOpts);
            case 'gradi':
                // REINFORCE needs smaller learning rate for stability
                return new Reinforce(this.grid, { ...baseOpts, alpha: 0.01 });
            case 'critic':
                // Actor-Critic: separate learning rates for actor and critic
                return new ActorCritic(this.grid, {
                    ...baseOpts,
                    alphaActor: 0.01,
                    alphaCritic: 0.1
                });
            case 'tracer':
                return new SarsaLambda(this.grid, { ...baseOpts, lambda: 0.9 });
            case 'dyna':
                return new DynaQ(this.grid, { ...baseOpts, planningSteps: 10 });
            default:
                return new charDef.cls(this.grid, baseOpts);
        }
    }

    switchCharacter(charName) {
        if (charName === this.currentCharacter) return;
        if (!CHARACTERS[charName]) return;

        // Stop training if running
        if (this.isTraining) {
            this.stopTraining();
        }

        this.currentCharacter = charName;

        // Update UI
        document.querySelectorAll('.char-card').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.char === charName);
        });
        this.characterDesc.textContent = CHARACTERS[charName].desc;

        // Reload dungeon with new character's algorithm
        this.loadDungeon(this.currentDungeon);
    }

    setupEventListeners() {
        // Initialize sound on first interaction
        const initSound = () => {
            sound.init();
            document.removeEventListener('keydown', initSound);
            document.removeEventListener('click', initSound);
            document.removeEventListener('touchstart', initSound);
        };
        document.addEventListener('keydown', initSound);
        document.addEventListener('click', initSound);
        document.addEventListener('touchstart', initSound);

        // Character select cards
        document.querySelectorAll('.char-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCharacter(e.currentTarget.dataset.char);
            });
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Touch controls - swipe on canvas
        this.canvas.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.isTraining) return;
            const dx = e.changedTouches[0].clientX - this.touchStartX;
            const dy = e.changedTouches[0].clientY - this.touchStartY;
            const minSwipe = 30;

            if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

            let action;
            if (Math.abs(dx) > Math.abs(dy)) {
                action = dx > 0 ? Action.RIGHT : Action.LEFT;
            } else {
                action = dy > 0 ? Action.DOWN : Action.UP;
            }

            if (this.done) {
                this.tryEnterDungeon();
            } else {
                this.handleAction(action);
            }
            e.preventDefault();
        }, { passive: false });

        // D-pad buttons
        const dpadBtns = document.querySelectorAll('.dpad-btn[data-action]');
        dpadBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.isTraining) return;
                const action = parseInt(e.currentTarget.dataset.action);
                if (this.done) {
                    this.tryEnterDungeon();
                } else {
                    this.handleAction(action);
                }
            });
        });

        // UI controls
        this.dungeonSelect.addEventListener('change', (e) => {
            const selected = e.target.value;
            if (!this.unlockedDungeons.has(selected)) {
                e.target.value = this.currentDungeon;
                this.showMessage('🔒 Clear previous dungeons first!', 'warning');
                return;
            }
            this.loadDungeon(selected);
        });

        this.resetBtn.addEventListener('click', () => this.tryEnterDungeon());

        // Speed buttons
        const speedBtns = document.querySelectorAll('.btn-speed');
        speedBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                speedBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.trainingSpeed = parseInt(e.currentTarget.dataset.speed);
            });
        });

        // Training controls
        this.startTrainBtn.addEventListener('click', () => this.startTraining());
        this.stopTrainBtn.addEventListener('click', () => this.stopTraining());

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
        if (this.isTraining) return;

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
        // Stop any ongoing training
        if (this.isTraining) {
            this.stopTraining();
        }

        this.currentDungeon = name;
        this.grid = loadDungeon(name);
        this.renderer.setGrid(this.grid);

        // Initialize algorithm for this dungeon (based on character)
        const config = DUNGEON_CONFIG[name] || { cost: 0, firstReward: 100, repeatReward: 10 };
        this.qlearning = this.createAlgorithm(config);

        // Try to load saved Q-Table
        const loaded = this.loadQTable();

        this.trainStats.innerHTML = '';
        this.renderer.setQData(null, null);

        const charDef = CHARACTERS[this.currentCharacter];
        const hpNote = config.useHpState ? ' [HP-Aware]' : '';
        const charNote = charDef ? ` [${charDef.name}]` : '';
        const loadNote = loaded ? ' (Data loaded)' : '';
        this.showMessage(`${name} - Cost: ${config.cost}G, Reward: ${config.firstReward}G${hpNote}${charNote}${loadNote}`, 'info');

        if (loaded) {
            this.updateVisualization();
        }

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
        this.saveProgress();
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

        // Restore collected gold before reset
        for (const key of this.collectedGold) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.GOLD;
        }
        this.collectedGold.clear();

        const { x, y } = this.grid.startPos;

        if (!this.agent) {
            this.agent = new Agent(x, y);
        } else {
            this.agent.reset(x, y);
        }

        this.renderer.setAgent(this.agent);
        this.steps = 0;
        this.done = false;

        this.updateUI();
        this.render();
    }

    handleAction(action) {
        if (this.done) return;

        // Learning from Demonstration: save state before action
        const prevState = [this.agent.x, this.agent.y, this.agent.hp];

        const result = this.agent.move(action, this.grid);
        this.steps++;

        // Learning from Demonstration: teach algorithm from user play
        if (this.qlearning && !this.isTraining) {
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
            const goldKey = `${this.agent.x},${this.agent.y}`;
            this.collectedGold.add(goldKey);
            this.grid.setTile(this.agent.x, this.agent.y, TileType.EMPTY);
            this.showMessage(`Found Gold! +10`, 'success');
            this.renderer.flash('rgba(251, 191, 36, 0.3)');
        } else if (result.tile === TileType.MONSTER) {
            sound.monster();
            const monsterKey = `${this.agent.x},${this.agent.y}`;
            this.killedMonsters.add(monsterKey);
            this.grid.setTile(this.agent.x, this.agent.y, TileType.EMPTY);
            this.gold += 5;
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
                const nextName = this.getDungeonDisplayName(DUNGEON_ORDER[DUNGEON_ORDER.indexOf(this.currentDungeon) + 1]);
                this.showMessage(`FIRST CLEAR! +${reward}G 🔓 ${nextName} Unlocked!`, 'success');
            } else {
                sound.victory();
                this.showMessage(`FIRST CLEAR! +${reward}G (Steps: ${this.steps})`, 'success');
            }

            this.updateDungeonSelect();
        } else {
            sound.victory();
            reward = config.repeatReward;
            this.gold += reward;
            this.showMessage(`CLEAR! +${reward}G (Steps: ${this.steps})`, 'success');
        }

        this.saveProgress();
        this.renderer.flash('rgba(34, 197, 94, 0.4)');
        this.updateUI();
    }

    // ========== Training System ==========

    startTraining() {
        if (this.isTraining) return;

        this.isTraining = true;
        this.startTrainBtn.disabled = true;
        this.stopTrainBtn.disabled = false;
        this.trainProgress.style.display = 'block';
        this.trainingMode = this.trainModeSelect.value;

        // Disable fog of war during training
        this.renderer.fogOfWar = false;

        // Reset algorithm with fresh parameters (based on character)
        const config = DUNGEON_CONFIG[this.currentDungeon] || {};
        this.qlearning = this.createAlgorithm(config, {
            alpha: 0.1,
            gamma: 0.99,
            epsilon: 1.0,
            epsilonMin: 0.01,
            epsilonDecay: 0.995
        });

        this.trainingEpisode = 0;
        this.recentResults = [];

        if (this.trainingSpeed === 0) {
            this.startInstantTraining();
        } else {
            this.startVisualTraining();
        }
    }

    // Visual training: one step at a time with rendering
    startVisualTraining() {
        const charDef = CHARACTERS[this.currentCharacter];
        this.showMessage(`Visual training started... [${charDef ? charDef.name : this.currentCharacter}]`, 'info');
        this.beginVisualEpisode();
    }

    beginVisualEpisode() {
        if (!this.isTraining) return;

        // Restore monsters from previous episode
        for (const key of this.trainingKilledMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
        this.trainingKilledMonsters.clear();

        // Restore gold from previous episode
        for (const key of this.trainingCollectedGold) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.GOLD;
        }
        this.trainingCollectedGold.clear();

        for (const key of this.killedMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
        this.killedMonsters.clear();

        for (const key of this.collectedGold) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.GOLD;
        }
        this.collectedGold.clear();

        // Create training agent at start position
        const startPos = this.grid.startPos;
        this.trainingAgent = new Agent(startPos.x, startPos.y);
        this.trainingTotalReward = 0;
        this.trainingSteps = 0;

        this.agent = this.trainingAgent;
        this.renderer.setAgent(this.agent);
        this.steps = 0;
        this.done = false;

        this.updateUI();
        this.render();

        this.scheduleVisualStep();
    }

    scheduleVisualStep() {
        if (!this.isTraining) return;
        const delay = SPEED_DELAYS[this.trainingSpeed] || 1500;
        this.trainingStepTimer = setTimeout(() => this.executeVisualStep(), delay);
    }

    executeVisualStep() {
        if (!this.isTraining || !this.trainingAgent) return;

        const agent = this.trainingAgent;
        const maxSteps = 200;

        if (this.trainingSteps >= maxSteps || this.done) {
            this.finishVisualEpisode(false);
            return;
        }

        // Choose action
        const state = [agent.x, agent.y, agent.hp];
        const action = this.qlearning.stepAction(agent.x, agent.y, agent.hp);

        // Handle killed monsters
        const nextPos = agent.getNextPosition(action);
        const nextKey = `${nextPos.x},${nextPos.y}`;
        const originalTile = this.grid.getTile(nextPos.x, nextPos.y);

        if (this.trainingKilledMonsters.has(nextKey) && originalTile === TileType.MONSTER) {
            this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
        }
        if (this.trainingCollectedGold.has(nextKey) && originalTile === TileType.GOLD) {
            this.grid.tiles[nextPos.y][nextPos.x] = TileType.EMPTY;
        }

        const result = agent.move(action, this.grid);
        this.trainingSteps++;
        this.steps = this.trainingSteps;

        if (result.tile === TileType.MONSTER && !this.trainingKilledMonsters.has(nextKey)) {
            this.trainingKilledMonsters.add(nextKey);
            this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
        }
        if (result.tile === TileType.GOLD && !this.trainingCollectedGold.has(nextKey)) {
            this.trainingCollectedGold.add(nextKey);
            this.grid.tiles[agent.y][agent.x] = TileType.EMPTY;
        }

        const nextState = [agent.x, agent.y, agent.hp];

        // Learn
        this.qlearning.learn(state, action, result.reward, nextState, result.done);

        this.trainingTotalReward += result.reward;

        this.updateUI();
        this.render();

        if (result.done) {
            const success = agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL;
            this.finishVisualEpisode(success);
            return;
        }

        this.scheduleVisualStep();
    }

    finishVisualEpisode(success) {
        // Restore monsters
        for (const key of this.trainingKilledMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
        this.trainingKilledMonsters.clear();

        // Restore gold
        for (const key of this.trainingCollectedGold) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.GOLD;
        }
        this.trainingCollectedGold.clear();

        // Decay epsilon
        this.qlearning.decayEpsilon();
        this.qlearning.episodeRewards.push(this.trainingTotalReward);
        this.qlearning.episodeSteps.push(this.trainingSteps);

        this.trainingEpisode++;
        this.recentResults.push(success);
        if (this.recentResults.length > CONVERGENCE_WINDOW) {
            this.recentResults.shift();
        }

        const successCount = this.recentResults.filter(r => r).length;
        const clearRate = this.recentResults.length > 0
            ? (successCount / this.recentResults.length * 100).toFixed(0)
            : 0;

        this.updateTrainingUI(clearRate);

        if (this.trainingEpisode >= MAX_EPISODES) {
            this.finishTraining(`Max episodes (${MAX_EPISODES}) reached. Clear: ${clearRate}%`);
            return;
        }

        if (this.trainingMode === 'until_success' &&
            this.recentResults.length >= CONVERGENCE_WINDOW &&
            successCount / this.recentResults.length >= CONVERGENCE_THRESHOLD) {
            this.finishTraining(`Converged! Clear: ${clearRate}% after ${this.trainingEpisode} episodes`);
            return;
        }

        this.beginVisualEpisode();
    }

    // Instant training: no visualization, fast execution
    async startInstantTraining() {
        const charDef = CHARACTERS[this.currentCharacter];
        this.showMessage(`Instant training... [${charDef ? charDef.name : this.currentCharacter}]`, 'info');

        const batchSize = 10;
        let running = true;

        while (running && this.isTraining && this.trainingEpisode < MAX_EPISODES) {
            for (let i = 0; i < batchSize && this.isTraining && this.trainingEpisode < MAX_EPISODES; i++) {
                const result = this.qlearning.runEpisode();
                this.trainingEpisode++;
                this.recentResults.push(result.success);
                if (this.recentResults.length > CONVERGENCE_WINDOW) {
                    this.recentResults.shift();
                }
            }

            const successCount = this.recentResults.filter(r => r).length;
            const clearRate = this.recentResults.length > 0
                ? (successCount / this.recentResults.length * 100).toFixed(0)
                : 0;

            this.updateTrainingUI(clearRate);

            if (this.trainingMode === 'until_success' &&
                this.recentResults.length >= CONVERGENCE_WINDOW &&
                successCount / this.recentResults.length >= CONVERGENCE_THRESHOLD) {
                this.finishTraining(`Converged! Clear: ${clearRate}% after ${this.trainingEpisode} episodes`);
                running = false;
                break;
            }

            this.updateVisualization();
            await new Promise(r => setTimeout(r, 0));
        }

        if (running && this.isTraining) {
            const successCount = this.recentResults.filter(r => r).length;
            const clearRate = this.recentResults.length > 0
                ? (successCount / this.recentResults.length * 100).toFixed(0)
                : 0;
            this.finishTraining(`Max episodes reached. Clear: ${clearRate}%`);
        }
    }

    updateTrainingUI(clearRate) {
        const epsilon = this.qlearning.epsilon;
        const charDef = CHARACTERS[this.currentCharacter];
        const charLabel = charDef ? charDef.name : this.currentCharacter;
        this.trainStats.innerHTML =
            `[${charLabel}] Episode: ${this.trainingEpisode} | Clear: ${clearRate}% | ε: ${epsilon.toFixed(2)}`;

        const percent = Math.min(100, (this.trainingEpisode / MAX_EPISODES) * 100);
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent =
            `${this.trainingEpisode} ep (ε=${epsilon.toFixed(2)})`;
    }

    finishTraining(message) {
        this.isTraining = false;
        this.startTrainBtn.disabled = false;
        this.stopTrainBtn.disabled = true;

        if (this.trainingStepTimer) {
            clearTimeout(this.trainingStepTimer);
            this.trainingStepTimer = null;
        }

        this.saveQTable();
        this.renderer.fogOfWar = this.fogOfWarCheck.checked;
        this.reset();
        this.updateVisualization();

        this.showMessage(message, 'success');
    }

    stopTraining() {
        if (!this.isTraining) return;

        if (this.trainingStepTimer) {
            clearTimeout(this.trainingStepTimer);
            this.trainingStepTimer = null;
        }

        for (const key of this.trainingKilledMonsters) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.MONSTER;
        }
        this.trainingKilledMonsters.clear();

        for (const key of this.trainingCollectedGold) {
            const [x, y] = key.split(',').map(Number);
            this.grid.tiles[y][x] = TileType.GOLD;
        }
        this.trainingCollectedGold.clear();

        const successCount = this.recentResults.filter(r => r).length;
        const clearRate = this.recentResults.length > 0
            ? (successCount / this.recentResults.length * 100).toFixed(0)
            : 0;

        this.finishTraining(`Stopped at episode ${this.trainingEpisode}. Clear: ${clearRate}%`);
    }

    // ========== End Training System ==========

    updateVisualization() {
        if (this.qlearning) {
            const qValues = this.qlearning.getValueGrid();
            const policy = this.qlearning.getPolicyGrid();
            this.renderer.setQData(qValues, policy);
        }
        this.render();
    }

    updateUI() {
        this.goldText.textContent = this.gold;

        if (!this.agent) return;

        const hpPercent = (this.agent.hp / this.agent.maxHp) * 100;
        this.hpFill.style.width = `${hpPercent}%`;
        this.hpText.textContent = `${this.agent.hp}/${this.agent.maxHp}`;
        this.stepsText.textContent = this.steps;

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
