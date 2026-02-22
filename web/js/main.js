/**
 * RL Dungeon - Main Entry Point
 */

import { loadDungeon } from './game/grid.js';
import { Grid } from './game/grid.js';
import { Agent, Action } from './game/agent.js';
import { Renderer } from './game/renderer.js';
import { TileType, TileProperties } from './game/tiles.js';
import { QLearning } from './game/qlearning.js';
import { LocalQLearning } from './game/local-qlearning.js';
import { SARSA } from './game/sarsa.js';
import { MonteCarlo } from './game/monte-carlo.js';
import { SarsaLambda } from './game/sarsa-lambda.js';
import { DynaQ } from './game/dyna-q.js';
import { Reinforce } from './game/reinforce.js';
import { ActorCritic } from './game/actor-critic.js';
import { QVLearning } from './game/qv-learning.js';
import { ACLA } from './game/acla.js';
import { Ensemble } from './game/ensemble.js';
import { ExpectedSarsa } from './game/expected-sarsa.js';
import { DoubleQLearning } from './game/double-qlearning.js';
import { TreeBackup } from './game/tree-backup.js';
import { PrioritizedSweeping } from './game/prioritized-sweeping.js';
import { sound } from './game/sound.js';
import { DungeonEditor } from './game/editor.js';
import { MultiStageGrid } from './game/multi-stage-grid.js';
import { RunState } from './game/run-state.js';

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
    qvkun:  { name: 'QV군',    algo: 'QV-Learning',  cls: QVLearning,     desc: 'Q와 V를 동시에 학습. 과대추정을 줄여 안정적입니다.' },
    acla:   { name: '아클라',   algo: 'ACLA',         cls: ACLA,           desc: '학습 오토마톤. 확률을 직접 조작해 빠르게 정책을 바꿉니다.' },
    ensemble: { name: '앙상블', algo: 'Ensemble',     cls: Ensemble,       desc: '5개 알고리즘의 합의. 볼츠만 곱으로 최적 행동을 선택합니다.' },
    exsa:     { name: '에크사', algo: 'Expected SARSA', cls: ExpectedSarsa, desc: '기대값으로 학습. 분산 없는 업데이트로 Q군과 사르사를 모두 지배합니다.' },
    doubleq:  { name: '더블Q', algo: 'Double Q',     cls: DoubleQLearning, desc: '두 개의 눈으로 편향 없이 판단. 과대추정의 해결사.' },
    treeback: { name: '트리백', algo: 'Tree Backup',  cls: TreeBackup,      desc: 'n걸음 앞을 내다보는 전략가. 기대값의 나무를 키웁니다.' },
    sweeper:  { name: '스위퍼', algo: 'Pri. Sweep',   cls: PrioritizedSweeping, desc: '중요한 것부터 정리하는 효율주의자. 다이나의 진화형.' },
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
    level_23_mirage: { cost: 0, firstReward: 150, repeatReward: 15 },
    level_24_paper_maze: { cost: 0, firstReward: 100, repeatReward: 10 },
    level_25_paper_hard: { cost: 0, firstReward: 120, repeatReward: 12 },
    level_26_frozen_lake: { cost: 0, firstReward: 150, repeatReward: 15, slippery: true },
    level_27_ice_maze: { cost: 0, firstReward: 200, repeatReward: 20, slippery: true },
    level_28_frozen_cliff: { cost: 0, firstReward: 200, repeatReward: 20, slippery: true },
    level_29_big_maze: { cost: 0, firstReward: 500, repeatReward: 50, maxSteps: 1000 },
    level_30_generated_cave: { cost: 0, firstReward: 500, repeatReward: 50, maxSteps: 2000 },
    level_31_generated_rooms: { cost: 0, firstReward: 500, repeatReward: 50, maxSteps: 2000 }
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
    'level_23_mirage',
    'level_24_paper_maze',
    'level_25_paper_hard',
    'level_26_frozen_lake',
    'level_27_ice_maze',
    'level_28_frozen_cliff',
    'level_29_big_maze',
    'level_30_generated_cave',
    'level_31_generated_rooms'
];

const PRESET_MULTI_DUNGEONS = {
    preset_beginner_tower: {
        name: "Beginner's Tower",
        stages: ['level_01_easy', 'level_02_trap', 'level_03_maze'],
        rules: { hpCarryOver: true, goldOnClear: true }
    },
    preset_algorithm_challenge: {
        name: "Algorithm Challenge",
        stages: ['level_13_cliff', 'level_15_multi_room', 'level_16_open_field'],
        rules: { hpCarryOver: true, goldOnClear: true }
    }
};

// Legacy key - migration handled by RunState
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

        // Run state (gold, food, hired characters, cleared/unlocked dungeons)
        this.runState = new RunState();
        this.pendingGold = 0;

        // Game over state
        this.isGameOver = false;

        // Migrate old Q-tables
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

        // Mode: 'play' or 'editor'
        this.currentMode = 'play';

        // Editor instance (created lazily)
        this.editor = null;

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

        // Run/Food/GameOver UI
        this.runText = document.getElementById('run-text');
        this.foodText = document.getElementById('food-text');
        this.foodStat = document.getElementById('food-stat');
        this.foodAmountInput = document.getElementById('food-amount');
        this.foodCostText = document.getElementById('food-cost');
        this.provisionsSection = document.getElementById('provisions-section');
        this.provisionsInfo = document.getElementById('provisions-info');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.gameOverCause = document.getElementById('game-over-cause');
        this.gameOverStats = document.getElementById('game-over-stats');

        // Clear Rate UI
        this.clearRateStat = document.getElementById('clear-rate-stat');
        this.clearRateText = document.getElementById('clear-rate-text');

        // Visualization checkboxes
        this.fogOfWarCheck = document.getElementById('fog-of-war');
        this.showQValuesCheck = document.getElementById('show-qvalues');
        this.showPolicyCheck = document.getElementById('show-policy');

        // Migrate legacy custom dungeons to Stage Library
        DungeonEditor.migrateToStages();

        this.setupEventListeners();
        this.setupModeTabs();
        this.setupEditor();
        this.updateDungeonSelect();
        this.loadCustomDungeonOptions();
        this.updateCharacterGrid();
        this.loadDungeon('level_01_easy');
    }

    // ========== Mode Tabs ==========

    setupModeTabs() {
        document.querySelectorAll('.mode-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.currentTarget.dataset.mode);
            });
        });
    }

    switchMode(mode, skipReload = false) {
        if (mode === this.currentMode) return;

        // Stop training if switching away from play
        if (this.currentMode === 'play' && this.isTraining) {
            this.stopTraining();
        }

        this.currentMode = mode;

        // Update tab UI
        document.querySelectorAll('.mode-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        const playControls = document.querySelector('.controls:not(.editor-controls)');
        const editorControls = document.getElementById('editor-controls');

        if (mode === 'editor') {
            document.body.classList.add('editor-mode');
            playControls.style.display = 'none';
            editorControls.style.display = '';
            this.editor.activate();
        } else {
            document.body.classList.remove('editor-mode');
            playControls.style.display = '';
            editorControls.style.display = 'none';
            this.editor.deactivate();
            // Restore play canvas (unless caller will handle it)
            if (!skipReload) {
                this.loadDungeon(this.currentDungeon);
            }
        }
    }

    // ========== Editor Setup ==========

    setupEditor() {
        this.editor = new DungeonEditor(
            this.canvas,
            this.renderer,
            (grid, name) => {
                this.playCustomDungeon(grid, name);
            },
            (grid, character, maxEpisodes, onProgress, onComplete, shouldAbort) => {
                this.runQuickTest(grid, character, maxEpisodes, onProgress, onComplete, shouldAbort);
            }
        );

        // Build tile palette
        const palette = document.getElementById('tile-palette');
        for (const [typeStr, props] of Object.entries(TileProperties)) {
            const type = parseInt(typeStr);
            const btn = document.createElement('button');
            btn.className = 'palette-tile' + (type === this.editor.activeTile ? ' active' : '');
            btn.dataset.tile = type;
            btn.innerHTML = `<span class="palette-color" style="background:${props.color}"></span><span class="palette-label">${props.name}</span>`;
            btn.addEventListener('click', () => {
                this.editor.selectTile(type);
                this.editor.setTool('brush');
                this.editor.updatePaletteUI();
                this.editor.updateToolUI();
            });
            palette.appendChild(btn);
        }

        // Tool buttons
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.addEventListener('click', () => {
                this.editor.setTool(btn.dataset.tool);
                this.editor.updateToolUI();
            });
        });

        // Grid size apply
        document.getElementById('btn-apply-size').addEventListener('click', () => {
            const w = parseInt(document.getElementById('grid-width').value) || 7;
            const h = parseInt(document.getElementById('grid-height').value) || 7;
            this.editor.resizeGrid(w, h);
            this.showEditorMessage(`Grid resized to ${this.editor.grid.width}x${this.editor.grid.height}`, 'info');
        });

        // Undo/Redo/Clear/Validate buttons
        document.getElementById('btn-undo').addEventListener('click', () => this.editor.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.editor.redo());
        document.getElementById('btn-clear').addEventListener('click', () => {
            this.editor.clearGrid();
            this.showEditorMessage('Grid cleared', 'info');
        });
        document.getElementById('btn-validate').addEventListener('click', () => {
            const result = this.editor.validate();
            if (result.valid) {
                this.showEditorMessage('Valid! Ready to play.', 'success');
            } else {
                this.showEditorMessage(result.errors.join(', '), 'danger');
            }
        });

        // Save
        document.getElementById('btn-save-dungeon').addEventListener('click', () => {
            const nameInput = document.getElementById('dungeon-name-input');
            const name = nameInput.value.trim();
            if (!name) {
                this.showEditorMessage('Enter a dungeon name', 'warning');
                return;
            }
            const result = this.editor.validate();
            if (!result.valid) {
                this.showEditorMessage('Fix errors first: ' + result.errors.join(', '), 'danger');
                return;
            }
            const id = this.editor.saveStage(name);
            this.showEditorMessage(`Saved "${name}"`, 'success');
            this.refreshCustomDungeonSelects();
        });

        // Load
        document.getElementById('btn-load-dungeon').addEventListener('click', () => {
            const sel = document.getElementById('custom-dungeon-select');
            const id = sel.value;
            if (!id) return;
            if (this.editor.loadStage(id)) {
                const list = this.editor.getStageList();
                const item = list.find(d => d.id === id);
                document.getElementById('dungeon-name-input').value = item ? item.name : '';
                document.getElementById('grid-width').value = this.editor.grid.width;
                document.getElementById('grid-height').value = this.editor.grid.height;
                this.showEditorMessage(`Loaded "${item ? item.name : id}"`, 'info');
            }
        });

        // Delete
        document.getElementById('btn-delete-dungeon').addEventListener('click', () => {
            const sel = document.getElementById('custom-dungeon-select');
            const id = sel.value;
            if (!id) return;
            if (this.editor.deleteStage(id)) {
                this.showEditorMessage('Deleted', 'warning');
                this.refreshCustomDungeonSelects();
            }
        });

        // Play This Dungeon
        document.getElementById('btn-play-dungeon').addEventListener('click', () => {
            const result = this.editor.playDungeon();
            if (!result.success) {
                this.showEditorMessage(result.errors.join(', '), 'danger');
            }
        });

        // Quick Test
        document.getElementById('btn-quick-test').addEventListener('click', () => {
            const character = document.getElementById('qt-character').value;
            const maxEpisodes = parseInt(document.getElementById('qt-episodes').value);

            // UI: show progress, disable start, enable stop
            document.getElementById('btn-quick-test').disabled = true;
            document.getElementById('btn-quick-test-stop').disabled = false;
            document.getElementById('qt-progress').style.display = 'block';
            document.getElementById('qt-progress-fill').style.width = '0%';
            document.getElementById('qt-progress-text').textContent = '0 / ' + maxEpisodes;
            document.getElementById('qt-results').textContent = '';
            document.getElementById('qt-results').className = 'quick-test-results';
            document.getElementById('qt-show-policy').checked = false;

            const result = this.editor.startQuickTest(character, maxEpisodes);
            if (!result.success) {
                this.showEditorMessage(result.errors.join(', '), 'danger');
                document.getElementById('btn-quick-test').disabled = false;
                document.getElementById('btn-quick-test-stop').disabled = true;
                document.getElementById('qt-progress').style.display = 'none';
            }
        });

        document.getElementById('btn-quick-test-stop').addEventListener('click', () => {
            this.editor.stopQuickTest();
        });

        // Show learned policy checkbox
        document.getElementById('qt-show-policy').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.editor.showTestPolicy();
            } else {
                this.editor.clearTestPolicy();
            }
        });

        // ===== Editor Sub-tabs =====
        this.editorSubtab = 'stage';
        document.querySelectorAll('.editor-subtab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchEditorSubtab(e.currentTarget.dataset.subtab);
            });
        });

        // ===== Dungeon Composer =====
        this.composerFloors = [];
        this.composerSelectedFloor = -1;

        document.getElementById('btn-add-floor').addEventListener('click', () => {
            this.addComposerFloor();
        });

        // Save Dungeon
        document.getElementById('btn-save-dungeon-comp').addEventListener('click', () => {
            const name = document.getElementById('dungeon-composer-name').value.trim();
            if (!name) {
                this.showEditorMessage('Enter a dungeon name', 'warning');
                return;
            }
            if (this.composerFloors.length === 0) {
                this.showEditorMessage('Add at least one floor', 'warning');
                return;
            }
            // Validate all floors have at least one stage selected
            for (let i = 0; i < this.composerFloors.length; i++) {
                if (!this.composerFloors[i].stages[0]) {
                    this.showEditorMessage(`Floor ${i + 1} has no stage selected`, 'warning');
                    return;
                }
                // Check all variant slots are filled
                for (let vi = 0; vi < this.composerFloors[i].stages.length; vi++) {
                    if (!this.composerFloors[i].stages[vi]) {
                        this.showEditorMessage(`Floor ${i + 1}, variant ${vi + 1} is empty`, 'warning');
                        return;
                    }
                }
            }
            const rules = {
                hpCarryOver: document.getElementById('dungeon-hp-carry').checked,
                goldOnClear: document.getElementById('dungeon-gold-on-clear').checked
            };
            const floors = this.composerFloors.map(f => {
                if (f.stages.length === 1) {
                    return { type: 'fixed', stageId: f.stages[0] };
                }
                return { type: 'random', variants: f.stages.map(s => ({ stageId: s, weight: 1 })) };
            });
            const id = this.editor.saveDungeon(name, floors, rules);
            this.showEditorMessage(`Saved dungeon "${name}"`, 'success');
            this.refreshDungeonComposerSelect();
            this.loadCustomDungeonOptions();
        });

        // Load Dungeon
        document.getElementById('btn-load-dungeon-comp').addEventListener('click', () => {
            const sel = document.getElementById('dungeon-comp-select');
            const id = sel.value;
            if (!id) return;
            const data = this.editor.loadDungeonData(id);
            if (!data) {
                this.showEditorMessage('Dungeon not found', 'danger');
                return;
            }
            document.getElementById('dungeon-composer-name').value = data.name;
            document.getElementById('dungeon-hp-carry').checked = data.rules?.hpCarryOver ?? true;
            document.getElementById('dungeon-gold-on-clear').checked = data.rules?.goldOnClear ?? true;
            this.composerFloors = (data.floors || []).map(f => {
                if (f.type === 'random' && f.variants) {
                    return { stages: f.variants.map(v => v.stageId) };
                }
                return { stages: [f.stageId || ''] };
            });
            this.composerSelectedFloor = this.composerFloors.length > 0 ? 0 : -1;
            this.renderComposerFloors();
            if (this.composerSelectedFloor >= 0) {
                this.previewComposerFloor(0);
            }
            this.showEditorMessage(`Loaded dungeon "${data.name}"`, 'info');
        });

        // Delete Dungeon
        document.getElementById('btn-delete-dungeon-comp').addEventListener('click', () => {
            const sel = document.getElementById('dungeon-comp-select');
            const id = sel.value;
            if (!id) return;
            if (this.editor.deleteDungeon(id)) {
                this.showEditorMessage('Dungeon deleted', 'warning');
                this.refreshDungeonComposerSelect();
                this.loadCustomDungeonOptions();
            }
        });

        // Play This Dungeon (from composer)
        document.getElementById('btn-play-dungeon-comp').addEventListener('click', () => {
            const name = document.getElementById('dungeon-composer-name').value.trim() || 'Untitled';
            if (this.composerFloors.length === 0) {
                this.showEditorMessage('Add at least one floor', 'warning');
                return;
            }
            for (let i = 0; i < this.composerFloors.length; i++) {
                if (!this.composerFloors[i].stages[0]) {
                    this.showEditorMessage(`Floor ${i + 1} has no stage selected`, 'warning');
                    return;
                }
            }
            // Build dungeon data and resolve
            const rules = {
                hpCarryOver: document.getElementById('dungeon-hp-carry').checked,
                goldOnClear: document.getElementById('dungeon-gold-on-clear').checked
            };
            const floors = this.composerFloors.map(f => {
                if (f.stages.length === 1) {
                    return { type: 'fixed', stageId: f.stages[0] };
                }
                return { type: 'random', variants: f.stages.map(s => ({ stageId: s, weight: 1 })) };
            });
            const dungeonData = { name, floors, rules };
            const resolved = DungeonEditor.resolveDungeon(dungeonData);
            if (!resolved || resolved.grids.length === 0) {
                this.showEditorMessage('Failed to resolve dungeon stages', 'danger');
                return;
            }
            // Play the dungeon (single or multi-stage)
            const hasVariants = resolved.floorVariants && resolved.floorVariants.some(v => v !== null);
            if (resolved.grids.length === 1 && !hasVariants) {
                this.playCustomDungeon(resolved.grids[0], name);
            } else {
                this.playMultiStageDungeon(resolved.grids, resolved.rules, name, resolved.floorVariants);
            }
        });

        // Populate selects
        this.refreshEditorDungeonSelect();
        this.refreshDungeonComposerSelect();
    }

    switchEditorSubtab(subtab) {
        if (subtab === this.editorSubtab) return;
        this.editorSubtab = subtab;

        document.querySelectorAll('.editor-subtab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === subtab);
        });

        document.getElementById('stage-panel').style.display = subtab === 'stage' ? '' : 'none';
        document.getElementById('dungeon-panel').style.display = subtab === 'dungeon' ? '' : 'none';

        if (subtab === 'dungeon') {
            this.refreshComposerStageDropdowns();
            if (this.composerSelectedFloor >= 0) {
                this.previewComposerFloor(this.composerSelectedFloor);
            } else {
                // Show empty canvas
                this.editor.applyGridToRenderer();
                this.editor.render();
            }
        }
    }

    addComposerFloor() {
        if (this.composerFloors.length >= 5) {
            this.showEditorMessage('Maximum 5 floors', 'warning');
            return;
        }
        this.composerFloors.push({ stages: [''] });
        this.composerSelectedFloor = this.composerFloors.length - 1;
        this.renderComposerFloors();
    }

    removeComposerFloor(index) {
        this.composerFloors.splice(index, 1);
        if (this.composerSelectedFloor >= this.composerFloors.length) {
            this.composerSelectedFloor = this.composerFloors.length - 1;
        }
        this.renderComposerFloors();
        if (this.composerSelectedFloor >= 0) {
            this.previewComposerFloor(this.composerSelectedFloor);
        }
    }

    renderComposerFloors() {
        const container = document.getElementById('dungeon-floor-list');
        container.innerHTML = '';

        if (this.composerFloors.length === 0) {
            container.innerHTML = '<div class="dungeon-floor-empty">No floors yet. Click "+ Add Floor" to start.</div>';
            return;
        }

        const stageList = this.editor.getStageList();

        this.composerFloors.forEach((floor, index) => {
            const slot = document.createElement('div');
            slot.className = 'floor-slot' + (index === this.composerSelectedFloor ? ' selected' : '');
            slot.dataset.floorIndex = index;

            const header = document.createElement('div');
            header.className = 'floor-header';
            const label = floor.stages.length > 1
                ? `Floor ${index + 1} <span class="variant-badge">${floor.stages.length} variants</span>`
                : `Floor ${index + 1}`;
            header.innerHTML = `<span class="floor-label">${label}</span>`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove-floor';
            removeBtn.title = 'Remove floor';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeComposerFloor(index);
            });
            header.appendChild(removeBtn);
            slot.appendChild(header);

            // Render a dropdown for each variant stage
            floor.stages.forEach((stageId, vi) => {
                const row = document.createElement('div');
                row.className = 'floor-variant-row';

                const select = document.createElement('select');
                select.className = 'floor-stage-select';
                const defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = vi === 0 ? '-- Select Stage --' : '-- Variant --';
                select.appendChild(defaultOpt);

                stageList.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = `${s.name} (${s.width}x${s.height})`;
                    if (s.id === stageId) opt.selected = true;
                    select.appendChild(opt);
                });

                select.addEventListener('change', (e) => {
                    this.composerFloors[index].stages[vi] = e.target.value;
                    if (index === this.composerSelectedFloor && e.target.value) {
                        this.previewComposerFloor(index, vi);
                    }
                });

                row.appendChild(select);

                // Remove variant button (only for variants beyond the first)
                if (vi > 0) {
                    const rmBtn = document.createElement('button');
                    rmBtn.className = 'btn-remove-variant';
                    rmBtn.title = 'Remove variant';
                    rmBtn.textContent = '×';
                    rmBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        floor.stages.splice(vi, 1);
                        this.renderComposerFloors();
                    });
                    row.appendChild(rmBtn);
                }

                slot.appendChild(row);
            });

            // Add Variant button
            if (floor.stages.length < 4) {
                const addVarBtn = document.createElement('button');
                addVarBtn.className = 'btn-add-variant';
                addVarBtn.textContent = '+ Variant';
                addVarBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    floor.stages.push('');
                    this.renderComposerFloors();
                });
                slot.appendChild(addVarBtn);
            }

            slot.addEventListener('click', (e) => {
                if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
                this.composerSelectedFloor = index;
                document.querySelectorAll('.floor-slot').forEach(s => s.classList.remove('selected'));
                slot.classList.add('selected');
                if (floor.stages[0]) {
                    this.previewComposerFloor(index, 0);
                }
            });

            container.appendChild(slot);
        });
    }

    previewComposerFloor(index, variantIndex = 0) {
        const floor = this.composerFloors[index];
        if (!floor || !floor.stages[variantIndex]) return;

        const grid = DungeonEditor.loadStageGrid(floor.stages[variantIndex]);
        if (!grid) return;

        this.renderer.setGrid(grid);
        this.renderer.setAgent(null);
        this.renderer.fogOfWar = false;
        this.renderer.showQValues = false;
        this.renderer.showPolicy = false;
        this.renderer.setQData(null, null);
        this.renderer.render();
    }

    refreshComposerStageDropdowns() {
        // Re-render floors to pick up any new stages
        if (this.composerFloors.length > 0) {
            this.renderComposerFloors();
        }
    }

    refreshDungeonComposerSelect() {
        const sel = document.getElementById('dungeon-comp-select');
        const currentVal = sel.value;
        while (sel.options.length > 1) sel.remove(1);
        const list = this.editor.getDungeonList();
        list.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `${d.name} (${d.floorCount}F)`;
            sel.appendChild(opt);
        });
        if ([...sel.options].some(o => o.value === currentVal)) {
            sel.value = currentVal;
        }
    }

    showEditorMessage(text, type = 'info') {
        const el = document.getElementById('editor-message');
        el.textContent = text;
        el.className = 'editor-message ' + type;
    }

    refreshEditorDungeonSelect() {
        const sel = document.getElementById('custom-dungeon-select');
        const currentVal = sel.value;
        // Clear all but the first default option
        while (sel.options.length > 1) sel.remove(1);
        const list = this.editor.getStageList();
        list.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `${d.name} (${d.width}x${d.height})`;
            sel.appendChild(opt);
        });
        // Restore selection if still exists
        if ([...sel.options].some(o => o.value === currentVal)) {
            sel.value = currentVal;
        }
    }

    refreshCustomDungeonSelects() {
        this.refreshEditorDungeonSelect();
        this.loadCustomDungeonOptions();
    }

    // ========== Quick Test ==========

    async runQuickTest(grid, character, maxEpisodes, onProgress, onComplete, shouldAbort) {
        // Deep copy grid so editor grid is unmodified
        const testGrid = Grid.fromString(grid.toString());

        // Temporarily swap character/grid to use createAlgorithm()
        const savedCharacter = this.currentCharacter;
        const savedGrid = this.grid;
        this.currentCharacter = character;
        this.grid = testGrid;
        const algo = this.createAlgorithm({ cost: 0, firstReward: 0, repeatReward: 0 });
        this.currentCharacter = savedCharacter;
        this.grid = savedGrid;

        const batchSize = 10;
        const convergenceWindow = 20;
        const convergenceThreshold = 0.95;
        const recentResults = [];
        let episode = 0;
        let converged = false;

        const progressEl = document.getElementById('qt-progress-fill');
        const progressTextEl = document.getElementById('qt-progress-text');
        const resultsEl = document.getElementById('qt-results');
        const startBtn = document.getElementById('btn-quick-test');
        const stopBtn = document.getElementById('btn-quick-test-stop');

        while (episode < maxEpisodes && !shouldAbort()) {
            for (let i = 0; i < batchSize && episode < maxEpisodes && !shouldAbort(); i++) {
                const result = algo.runEpisode();
                episode++;
                recentResults.push(result.success);
                if (recentResults.length > convergenceWindow) {
                    recentResults.shift();
                }
            }

            const successCount = recentResults.filter(r => r).length;
            const clearRate = recentResults.length > 0
                ? (successCount / recentResults.length * 100).toFixed(0)
                : 0;

            // Update progress UI
            const percent = Math.min(100, (episode / maxEpisodes) * 100);
            progressEl.style.width = `${percent}%`;
            progressTextEl.textContent = `${episode} / ${maxEpisodes} (Clear: ${clearRate}%)`;

            onProgress({ episode, total: maxEpisodes, clearRate: parseFloat(clearRate), epsilon: algo.epsilon });

            // Convergence check
            if (recentResults.length >= convergenceWindow &&
                successCount / recentResults.length >= convergenceThreshold) {
                converged = true;
                break;
            }

            // Yield to UI
            await new Promise(r => setTimeout(r, 0));
        }

        const successCount = recentResults.filter(r => r).length;
        const clearRate = recentResults.length > 0
            ? (successCount / recentResults.length * 100).toFixed(0)
            : 0;

        const valueGrid = algo.getValueGrid();
        const policyGrid = algo.getPolicyGrid();

        // Update final progress
        progressEl.style.width = '100%';

        // Show results
        const aborted = shouldAbort();
        let resultText, resultClass;
        if (aborted) {
            resultText = `Stopped at ${episode} ep. Clear: ${clearRate}%`;
            resultClass = 'warning';
        } else if (converged) {
            resultText = `Converged! Clear: ${clearRate}% after ${episode} ep`;
            resultClass = 'success';
        } else {
            resultText = `Done ${episode} ep. Clear: ${clearRate}%`;
            resultClass = parseFloat(clearRate) >= 80 ? 'success' : parseFloat(clearRate) >= 30 ? 'warning' : 'danger';
        }

        resultsEl.textContent = resultText;
        resultsEl.className = 'quick-test-results ' + resultClass;

        // Restore button states
        startBtn.disabled = false;
        stopBtn.disabled = true;

        onComplete({ episodes: episode, clearRate: parseFloat(clearRate), converged, valueGrid, policyGrid });
    }

    // ========== Custom Dungeon Play ==========

    playCustomDungeon(grid, name) {
        // Switch to play mode (skip reload, we'll set up the grid ourselves)
        this.switchMode('play', true);

        // Use the grid directly
        this.currentDungeon = 'custom_' + this.editor._nameToId(name);
        this.grid = Grid.fromString(grid.toString()); // deep copy
        this.renderer.setGrid(this.grid);

        // Create algorithm
        this.qlearning = this.createAlgorithm({ cost: 0, firstReward: 0, repeatReward: 0 });

        // Try to load Q-table for this custom dungeon
        this.loadQTable();

        this.trainStats.innerHTML = '';
        this.renderer.setQData(null, null);

        const charDef = CHARACTERS[this.currentCharacter];
        this.showMessage(`[Custom] ${name} [${charDef.name}]`, 'info');

        // Update dropdown selection
        if ([...this.dungeonSelect.options].some(o => o.value === this.currentDungeon)) {
            this.dungeonSelect.value = this.currentDungeon;
        }

        this.reset();
    }

    playMultiStageDungeon(grids, rules, name, floorVariants = null) {
        this.switchMode('play', true);

        // Deep copy each stage grid, then stack into MultiStageGrid
        const copies = grids.map(g => Grid.fromString(g.toString()));
        // Deep copy variant grids too
        const variantCopies = floorVariants ? floorVariants.map(fv =>
            fv ? fv.map(g => Grid.fromString(g.toString())) : null
        ) : null;
        this.grid = new MultiStageGrid(copies, rules, variantCopies);
        this.currentDungeon = 'dungeon_composer_temp';
        this.renderer.setGrid(this.grid);

        // Viewport: show one floor at a time
        if (this.grid.getTotalStages() > 1) {
            this.renderer.setViewportStage(0);
        }

        this.qlearning = this.createAlgorithm({ cost: 0, firstReward: 0, repeatReward: 0 });

        this.trainStats.innerHTML = '';
        this.renderer.setQData(null, null);

        const charDef = CHARACTERS[this.currentCharacter];
        this.showMessage(`[Dungeon] ${name} (${grids.length} Floors) [${charDef.name}]`, 'info');

        this.reset();
    }

    loadCustomDungeonOptions() {
        // Remove existing custom/dungeon/preset options
        const options = [...this.dungeonSelect.options];
        options.forEach(opt => {
            if (opt.value.startsWith('custom_') || opt.value.startsWith('dungeon_') || opt.value.startsWith('preset_')) {
                opt.remove();
            }
        });

        // Add preset multi-stage dungeons
        for (const [id, preset] of Object.entries(PRESET_MULTI_DUNGEONS)) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `[Preset] ${preset.name} (${preset.stages.length}F)`;
            this.dungeonSelect.appendChild(opt);
        }

        // Add single-stage custom dungeons (from Stage Library)
        const stages = DungeonEditor.getStageListStatic();
        stages.forEach(d => {
            const opt = document.createElement('option');
            opt.value = 'custom_' + d.id;
            opt.textContent = `[Custom] ${d.name}`;
            this.dungeonSelect.appendChild(opt);
        });

        // Add multi-stage dungeons (from Dungeon Composer)
        const dungeons = DungeonEditor.getDungeonListStatic();
        dungeons.forEach(d => {
            const opt = document.createElement('option');
            opt.value = 'dungeon_' + d.id;
            opt.textContent = `[Custom] ${d.name} (${d.floorCount}F)`;
            this.dungeonSelect.appendChild(opt);
        });
    }

    saveProgress() {
        this.runState.saveRunState();
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
            const isUnlocked = this.runState.unlockedDungeons.has(dungeonId);
            const isCleared = this.runState.clearedDungeons.has(dungeonId);

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
            level_23_mirage: 'The Mirage',
            level_24_paper_maze: 'Paper Maze',
            level_25_paper_hard: 'Paper Maze+',
            level_26_frozen_lake: 'Frozen Lake',
            level_27_ice_maze: 'Ice Maze',
            level_28_frozen_cliff: 'Frozen Cliff',
            level_29_big_maze: 'Big Maze (25×25)',
            level_30_generated_cave: 'Cave (50×50)',
            level_31_generated_rooms: 'Rooms (50×50)'
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
            case 'treeback':
                return new TreeBackup(this.grid, { ...baseOpts, alpha: 0.5, n: 4 });
            case 'sweeper':
                return new PrioritizedSweeping(this.grid, { ...baseOpts, alpha: 0.5, planningSteps: 5, theta: 0.0001 });
            case 'acla':
                return new ACLA(this.grid, {
                    ...baseOpts,
                    alphaActor: 0.05,
                    alphaCritic: 0.1
                });
            case 'ensemble':
                return new Ensemble(this.grid, { ...baseOpts, temperature: 1.0 });
            default:
                return new charDef.cls(this.grid, baseOpts);
        }
    }

    switchCharacter(charName) {
        if (charName === this.currentCharacter) return;
        if (!CHARACTERS[charName]) return;

        // Hidden characters cannot be selected
        if (this.runState.isCharacterHidden(charName)) return;

        // Locked characters: prompt to hire
        if (this.runState.isCharacterLocked(charName)) {
            const cost = this.runState.getHireCost(charName);
            const charDef = CHARACTERS[charName];
            if (this.runState.gold < cost) {
                this.showMessage(`Not enough gold to hire ${charDef.name}! Need ${cost}G (have ${this.runState.gold}G)`, 'danger');
                return;
            }
            const ok = confirm(`Hire ${charDef.name} (${charDef.algo}) for ${cost}G?`);
            if (!ok) return;
            this.runState.hireCharacter(charName);
            this.updateCharacterGrid();
            this.updateUI();
            this.showMessage(`${charDef.name} hired! -${cost}G`, 'success');
        }

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

    updateCharacterGrid() {
        document.querySelectorAll('.char-card').forEach(btn => {
            const charName = btn.dataset.char;
            btn.classList.toggle('locked', this.runState.isCharacterLocked(charName));
            btn.classList.toggle('char-hidden', this.runState.isCharacterHidden(charName));
        });
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
            if (this.currentMode === 'editor') return;
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.currentMode === 'editor') return;
            if (this.isTraining) return;
            if (this.isGameOver) return;
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
                if (this.isGameOver) return;
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
            if (this.isGameOver) {
                e.target.value = this.currentDungeon;
                return;
            }
            const selected = e.target.value;
            // Custom/dungeon/preset entries don't need unlock check
            if (selected.startsWith('custom_') || selected.startsWith('dungeon_') || selected.startsWith('preset_')) {
                this.loadDungeon(selected);
                return;
            }
            if (!this.runState.unlockedDungeons.has(selected)) {
                e.target.value = this.currentDungeon;
                this.showMessage('🔒 Clear previous dungeons first!', 'warning');
                return;
            }
            this.loadDungeon(selected);
        });

        this.resetBtn.addEventListener('click', () => {
            if (this.isGameOver) return;
            this.tryEnterDungeon();
        });

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

        // New Run button
        document.getElementById('btn-new-run').addEventListener('click', () => this.startNewRun());

        // Provisions: food amount input updates cost display
        this.foodAmountInput.addEventListener('input', () => {
            const amount = parseInt(this.foodAmountInput.value) || 0;
            this.foodCostText.textContent = `(${amount}G)`;
        });

        // Buy food button
        document.getElementById('btn-buy-food').addEventListener('click', () => {
            const amount = parseInt(this.foodAmountInput.value) || 0;
            if (amount <= 0) {
                this.showMessage('Enter a valid amount', 'warning');
                return;
            }
            if (this.runState.gold < amount) {
                this.showMessage(`Not enough gold! Need ${amount}G`, 'danger');
                return;
            }
            this.runState.buyFood(amount);
            this.updateUI();
            this.showMessage(`Bought ${amount} food. Total: ${this.runState.food}`, 'success');
        });

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
        // In editor mode, let the editor handle keys
        if (this.currentMode === 'editor') return;
        if (this.isTraining) return;
        // Block all input during game over overlay
        if (this.isGameOver) return;

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

        // Load and display saved clear rate for this dungeon+character
        const savedRate = this.loadClearRate(name);
        if (savedRate !== null) {
            this.showClearRate(savedRate);
        } else {
            this.hideClearRate();
        }

        // Custom single-stage: load from Stage Library
        if (name.startsWith('custom_')) {
            const customId = name.replace('custom_', '');
            const grid = DungeonEditor.loadStageGrid(customId);
            if (!grid) {
                this.showMessage('Custom dungeon not found!', 'danger');
                return;
            }
            this.grid = grid;
            this.renderer.setGrid(this.grid);

            const config = { cost: 0, firstReward: 0, repeatReward: 0 };
            this.qlearning = this.createAlgorithm(config);
            const loaded = this.loadQTable();

            this.trainStats.innerHTML = '';
            this.renderer.setQData(null, null);

            const charDef = CHARACTERS[this.currentCharacter];
            const loadNote = loaded ? ' (Data loaded)' : '';
            this.showMessage(`[Custom] ${customId} [${charDef.name}]${loadNote}`, 'info');

            if (loaded) {
                this.updateVisualization();
            }

            this.reset();
            return;
        }

        // Multi-stage dungeon: load from Dungeon Composer
        if (name.startsWith('dungeon_')) {
            const dungeonId = name.replace('dungeon_', '');
            const dungeonData = DungeonEditor.loadDungeonDataStatic(dungeonId);
            if (!dungeonData) {
                this.showMessage('Dungeon not found!', 'danger');
                return;
            }

            const resolved = DungeonEditor.resolveDungeon(dungeonData);
            if (!resolved || resolved.grids.length === 0) {
                this.showMessage('Failed to resolve dungeon stages!', 'danger');
                return;
            }

            // Multi-stage: stack all grids into one virtual coordinate space
            const hasVariants = resolved.floorVariants && resolved.floorVariants.some(v => v !== null);
            if (resolved.grids.length === 1 && !hasVariants) {
                this.grid = resolved.grids[0];
            } else {
                this.grid = new MultiStageGrid(resolved.grids, resolved.rules, resolved.floorVariants);
            }
            this.renderer.setGrid(this.grid);

            // Viewport: show one floor at a time for multi-stage
            if (this.grid.getTotalStages && this.grid.getTotalStages() > 1) {
                this.renderer.setViewportStage(0);
            }

            const config = { cost: 0, firstReward: 0, repeatReward: 0 };
            this.qlearning = this.createAlgorithm(config);
            const loaded = this.loadQTable();

            this.trainStats.innerHTML = '';
            this.renderer.setQData(null, null);

            const charDef = CHARACTERS[this.currentCharacter];
            const floorInfo = resolved.grids.length > 1 ? ` (${resolved.grids.length} Floors)` : '';
            const loadNote = loaded ? ' (Data loaded)' : '';
            this.showMessage(`[Dungeon] ${dungeonData.name}${floorInfo} [${charDef.name}]${loadNote}`, 'info');

            if (loaded) {
                this.updateVisualization();
            }

            this.reset();
            return;
        }

        // Preset multi-stage dungeons
        if (name.startsWith('preset_') && PRESET_MULTI_DUNGEONS[name]) {
            const preset = PRESET_MULTI_DUNGEONS[name];
            const grids = preset.stages.map(s => loadDungeon(s));
            this.grid = new MultiStageGrid(grids, preset.rules);
            this.renderer.setGrid(this.grid);

            // Viewport: show one floor at a time
            if (this.grid.getTotalStages() > 1) {
                this.renderer.setViewportStage(0);
            }

            const config = { cost: 0, firstReward: 0, repeatReward: 0 };
            this.qlearning = this.createAlgorithm(config);
            const loaded = this.loadQTable();

            this.trainStats.innerHTML = '';
            this.renderer.setQData(null, null);

            const charDef = CHARACTERS[this.currentCharacter];
            const loadNote = loaded ? ' (Data loaded)' : '';
            this.showMessage(`[Preset] ${preset.name} (${preset.stages.length}F) [${charDef.name}]${loadNote}`, 'info');

            if (loaded) {
                this.updateVisualization();
            }

            this.reset();
            return;
        }

        this.grid = loadDungeon(name);

        // Apply dungeon-specific grid properties
        const config = DUNGEON_CONFIG[name] || { cost: 0, firstReward: 100, repeatReward: 10 };
        if (config.slippery) {
            this.grid.slippery = true;
        }
        if (config.maxSteps) {
            this.grid.suggestedMaxSteps = config.maxSteps;
        }

        this.renderer.setGrid(this.grid);

        // Initialize algorithm for this dungeon (based on character)
        this.qlearning = this.createAlgorithm(config);

        // Try to load saved Q-Table
        const loaded = this.loadQTable();

        this.trainStats.innerHTML = '';
        this.renderer.setQData(null, null);

        const charDef = CHARACTERS[this.currentCharacter];
        const hpNote = config.useHpState ? ' [HP-Aware]' : '';
        const slipNote = config.slippery ? ' [Slippery ❄️]' : '';
        const charNote = charDef ? ` [${charDef.name}]` : '';
        const loadNote = loaded ? ' (Data loaded)' : '';
        this.showMessage(`${name} - Cost: ${config.cost}G, Reward: ${config.firstReward}G${hpNote}${slipNote}${charNote}${loadNote}`, 'info');

        if (loaded) {
            this.updateVisualization();
        }

        this.reset();
    }

    tryEnterDungeon() {
        const config = DUNGEON_CONFIG[this.currentDungeon] || { cost: 0, firstReward: 0, repeatReward: 0 };
        const isBuiltIn = !this.currentDungeon.startsWith('custom_') && !this.currentDungeon.startsWith('dungeon_') && !this.currentDungeon.startsWith('preset_');

        if (isBuiltIn && this.runState.gold < config.cost) {
            this.showMessage(`Not enough gold! Need ${config.cost}G`, 'danger');
            this.renderer.flash('rgba(239, 68, 68, 0.3)');
            return;
        }

        // Deduct entry cost for built-in dungeons
        if (isBuiltIn && config.cost > 0) {
            this.runState.gold -= config.cost;
        }

        this.saveProgress();
        this.updateUI();
        this.reset();

        sound.start();
        if (isBuiltIn && config.cost > 0) {
            this.showMessage(`Paid ${config.cost}G to enter. Food: ${this.runState.food}. Good luck!`, 'warning');
        } else {
            this.showMessage(`Game Reset! Food: ${this.runState.food}. Reach the green goal.`, 'info');
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
        this.pendingGold = 0;

        // Viewport: reset to stage 0 for multi-stage grids
        if (this.grid.getTotalStages && this.grid.getTotalStages() > 1) {
            this.renderer.setViewportStage(0);
        }

        this.updateUI();
        this.render();
    }

    handleAction(action) {
        if (this.done || this.isGameOver) return;

        const isBuiltIn = !this.currentDungeon.startsWith('custom_') && !this.currentDungeon.startsWith('dungeon_') && !this.currentDungeon.startsWith('preset_');

        // Food consumption (manual play only, built-in dungeons only)
        if (!this.isTraining && isBuiltIn && this.runState.food > 0) {
            this.runState.consumeFood();
        } else if (!this.isTraining && isBuiltIn && this.runState.food <= 0 && this.steps > 0) {
            // Food ran out — game over
            this.triggerGameOver('Food depleted! Stranded in the dungeon.');
            return;
        }

        // Total step counter
        this.runState.totalSteps++;

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
            // Multi-stage: try advancing to next floor
            if (this.grid.tryAdvanceStage && this.grid.tryAdvanceStage(this.agent)) {
                sound.victory();
                const stageNum = this.grid.getCurrentStageIndex();
                const total = this.grid.getTotalStages();
                this.renderer.setViewportStage(stageNum);
                this.showMessage(`Floor ${stageNum + 1}/${total} reached! Advancing...`, 'success');
                this.renderer.flash('rgba(34, 197, 94, 0.3)');
                this.updateUI();
                this.render();
                return;
            }

            this.done = true;
            const tile = this.grid.getTile(this.agent.x, this.agent.y);

            if (tile === TileType.GOAL) {
                this.handleVictory();
            } else if (tile === TileType.PIT) {
                sound.pit();
                const lostMsg = this.pendingGold > 0 ? ` ${this.pendingGold}G lost!` : '';
                this.pendingGold = 0;
                if (!this.isTraining && isBuiltIn) {
                    this.triggerGameOver('Fell into a pit! Instant death.');
                } else {
                    this.showMessage(`FELL INTO PIT! Instant death...${lostMsg}`, 'danger');
                }
                this.renderer.flash('rgba(0, 0, 0, 0.8)');
            } else {
                // HP death
                sound.death();
                const lostMsg = this.pendingGold > 0 ? ` ${this.pendingGold}G lost!` : '';
                this.pendingGold = 0;
                if (!this.isTraining && isBuiltIn) {
                    this.triggerGameOver('HP reached 0! The party leader has fallen.');
                } else {
                    this.showMessage(`DIED! Steps: ${this.steps}${lostMsg}`, 'danger');
                }
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
            if (this.grid.getTotalStages && this.grid.getTotalStages() > 1) {
                this.pendingGold += 5;
                this.showMessage(`MONSTER! HP -30, Defeated! +5G (Pending)`, 'warning');
            } else {
                this.runState.gold += 5;
                this.showMessage(`MONSTER! HP -30, Defeated! +5G`, 'warning');
            }
            this.renderer.flash('rgba(147, 51, 234, 0.4)');
        } else {
            sound.move();
        }

        this.updateUI();
        this.render();
    }

    handleVictory() {
        // Custom/preset dungeons: no economy impact (except pending gold)
        if (this.currentDungeon.startsWith('custom_') || this.currentDungeon.startsWith('dungeon_') || this.currentDungeon.startsWith('preset_')) {
            sound.victory();
            const floorInfo = this.grid.getTotalStages ? ` (${this.grid.getTotalStages()} Floors)` : '';
            let goldMsg = '';
            if (this.pendingGold > 0) {
                this.runState.gold += this.pendingGold;
                goldMsg = ` +${this.pendingGold}G confirmed!`;
                this.pendingGold = 0;
                this.saveProgress();
            }
            this.showMessage(`CLEAR!${floorInfo} Steps: ${this.steps}${goldMsg}`, 'success');
            this.renderer.flash('rgba(34, 197, 94, 0.4)');
            this.updateUI();
            return;
        }

        const config = DUNGEON_CONFIG[this.currentDungeon];
        const isFirstClear = !this.runState.clearedDungeons.has(this.currentDungeon);

        let reward;
        let unlockedNext = false;

        if (isFirstClear) {
            reward = config.firstReward;
            this.runState.clearedDungeons.add(this.currentDungeon);
            this.runState.gold += reward;

            // Unlock next dungeon
            const currentIndex = DUNGEON_ORDER.indexOf(this.currentDungeon);
            if (currentIndex >= 0 && currentIndex < DUNGEON_ORDER.length - 1) {
                const nextDungeon = DUNGEON_ORDER[currentIndex + 1];
                if (!this.runState.unlockedDungeons.has(nextDungeon)) {
                    this.runState.unlockedDungeons.add(nextDungeon);
                    unlockedNext = true;
                }
            }

            if (unlockedNext) {
                sound.victory();
                setTimeout(() => sound.unlock(), 600);
                const nextName = this.getDungeonDisplayName(DUNGEON_ORDER[DUNGEON_ORDER.indexOf(this.currentDungeon) + 1]);
                this.showMessage(`FIRST CLEAR! +${reward}G ${nextName} Unlocked!`, 'success');
            } else {
                sound.victory();
                this.showMessage(`FIRST CLEAR! +${reward}G (Steps: ${this.steps})`, 'success');
            }

            this.updateDungeonSelect();
        } else {
            sound.victory();
            reward = config.repeatReward;
            this.runState.gold += reward;
            this.showMessage(`CLEAR! +${reward}G (Steps: ${this.steps})`, 'success');
        }

        this.saveProgress();
        this.renderer.flash('rgba(34, 197, 94, 0.4)');
        this.updateUI();
    }

    // ========== Game Over & New Run ==========

    triggerGameOver(cause) {
        this.isGameOver = true;
        this.done = true;

        // Save meta (totalSteps) before showing overlay
        this.runState.saveMeta();

        // Show overlay
        this.gameOverCause.textContent = cause;
        this.gameOverStats.innerHTML = [
            `Run #${this.runState.runNumber}`,
            `Gold: ${this.runState.gold}G`,
            `Cleared: ${this.runState.clearedDungeons.size} dungeons`,
            `Steps this run: ${this.steps}`
        ].join('<br>');

        this.gameOverOverlay.style.display = 'flex';
        sound.death();
    }

    startNewRun() {
        this.isGameOver = false;
        this.gameOverOverlay.style.display = 'none';

        this.runState.startNewRun();
        this.updateCharacterGrid();
        this.updateDungeonSelect();
        this.loadCustomDungeonOptions();
        this.updateUI();

        // Switch to first available character if current is locked
        if (!this.runState.isCharacterAvailable(this.currentCharacter)) {
            this.currentCharacter = 'qkun';
            document.querySelectorAll('.char-card').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.char === 'qkun');
            });
            this.characterDesc.textContent = CHARACTERS.qkun.desc;
        }

        this.loadDungeon('level_01_easy');
        this.dungeonSelect.value = 'level_01_easy';
        this.showMessage(`Run #${this.runState.runNumber} started! Gold: ${this.runState.gold}G`, 'info');
    }

    // ========== Training System ==========

    startTraining() {
        if (this.isTraining) return;
        if (this.isGameOver) return;

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

        // Viewport: reset to stage 0 for multi-stage visual training
        if (this.grid.getTotalStages && this.grid.getTotalStages() > 1) {
            this.renderer.setViewportStage(0);
        }

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
        const maxSteps = this.grid.suggestedMaxSteps || 200;

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
        this.runState.totalSteps++;

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
            // Multi-stage: try advancing to next floor before ending episode
            if (this.grid.tryAdvanceStage && this.grid.tryAdvanceStage(agent)) {
                const stageNum = this.grid.getCurrentStageIndex();
                this.renderer.setViewportStage(stageNum);
                this.render();
                this.scheduleVisualStep();
                return;
            }

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
                this.runState.totalSteps += (result.steps || 0);
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

        // Compute and save clear rate
        const successCount = this.recentResults.filter(r => r).length;
        const finalClearRate = this.recentResults.length > 0
            ? Math.round(successCount / this.recentResults.length * 100)
            : 0;
        this.saveClearRate(this.currentDungeon, finalClearRate);
        this.showClearRate(finalClearRate);

        this.saveQTable();
        this.runState.saveMeta();
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

    // ========== Clear Rate ==========

    saveClearRate(dungeonId, rate) {
        try {
            const key = `rld_clearrate_${this.currentCharacter}_${dungeonId}`;
            localStorage.setItem(key, JSON.stringify(rate));
        } catch (e) {
            console.warn('Failed to save clear rate:', e);
        }
    }

    loadClearRate(dungeonId) {
        try {
            const key = `rld_clearrate_${this.currentCharacter}_${dungeonId}`;
            const saved = localStorage.getItem(key);
            return saved !== null ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    showClearRate(rate) {
        this.clearRateStat.style.display = '';
        this.clearRateText.textContent = `${rate}%`;
        if (rate >= 80) {
            this.clearRateText.style.color = '#4ade80';
        } else if (rate >= 30) {
            this.clearRateText.style.color = '#fbbf24';
        } else {
            this.clearRateText.style.color = '#ef4444';
        }
    }

    hideClearRate() {
        this.clearRateStat.style.display = 'none';
        this.clearRateText.textContent = '-';
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
        this.goldText.textContent = this.pendingGold > 0
            ? `${this.runState.gold} (+${this.pendingGold})`
            : this.runState.gold;

        // Run number
        this.runText.textContent = `#${this.runState.runNumber}`;

        // Food display (show only during manual play on built-in dungeons)
        const isBuiltIn = !this.currentDungeon.startsWith('custom_') && !this.currentDungeon.startsWith('dungeon_') && !this.currentDungeon.startsWith('preset_');
        const showFood = isBuiltIn && !this.isTraining;
        this.foodStat.style.display = showFood ? '' : 'none';
        this.foodText.textContent = this.runState.food;

        // Provisions section visibility
        if (this.provisionsSection) {
            this.provisionsSection.style.display = (isBuiltIn && this.currentMode === 'play') ? '' : 'none';
        }

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
