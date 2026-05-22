/**
 * RL Dungeon - Main Entry Point
 */

import { loadDungeon } from './game/grid.js';
import { Grid } from './game/grid.js';
import { Agent, Action } from './game/agent.js';
import { Renderer } from './game/renderer.js';
import { TilemapRenderer } from './game/tilemap-renderer.js';
import { TileType, TileProperties } from './game/tiles.js';
import { sound } from './game/sound.js';
import { music, MusicManager } from './game/music.js';
import { DungeonEditor } from './game/editor.js';
import { MultiStageGrid } from './game/multi-stage-grid.js';
import { RunState, CHARACTER_STATS, CHAPTER_CONFIG, DUNGEON_TREASURES, ITEMS, HIRE_COSTS, DEATH_LIMIT } from './game/run-state.js';
import { CHARACTERS, DUNGEON_CONFIG, DUNGEON_ORDER, BASE_OP_COST, DUNGEON_HINTS,
         MAX_EPISODES, CONVERGENCE_WINDOW, CONVERGENCE_THRESHOLD,
         createAlgorithm as createAlgorithmFromConfig } from './game/game-config.js';
import { ToastManager } from './game/toast.js';
import { DungeonMap } from './game/dungeon-map.js';
import { BriefingOverlay } from './game/briefing.js';
import { TutorialManager } from './game/tutorial.js';
import { ScreenManager } from './game/screen-manager.js';
import { generateDungeon } from './game/dungeon-generator.js';
import { DailyHistory, getDailyChallenge, yesterdayKey } from './game/daily-mode.js';
import { utcDateKey } from './game/rng.js';
import { ModifierSet, MODIFIERS } from './game/modifiers.js';
import { t, initI18n, setLang, getLang, onLangChange } from './i18n/index.js';

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

// (BASE_OP_COST imported from game-config.js)

// (DUNGEON_HINTS imported from game-config.js)

// Training speed delays (ms per step)
const SPEED_DELAYS = {
    1: 1500,  // 1x - slow observation
    2: 750,   // 2x
    3: 500,   // 3x
    0: 0      // Instant - no visualization
};

// (MAX_EPISODES, CONVERGENCE_WINDOW, CONVERGENCE_THRESHOLD imported from game-config.js)

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new TilemapRenderer(this.canvas);

        // B-201: minimap (mobile, large dungeons ≥ 25 wide/tall)
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapWrap = document.getElementById('minimap-wrap');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        this.renderer.onAfterRender = () => this._renderMinimap();

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

        // C-2: Chapter progression
        this.newChapterInfo = null;

        // C-4: Treasure state
        this.carryingTreasure = false;
        this.treasurePosition = null;

        // C-5: Item contracts (manual play only, per episode)
        this.activeDefenseContract = false;
        this.activeTrapNullify = false;

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

        // Step 1: Toast system
        this.toast = new ToastManager('toast-container');

        // Step 2: Resource warning elements
        this.foodWarning = document.getElementById('food-warning');

        // Step 3: Dungeon map
        this.dungeonMap = new DungeonMap('dungeon-map', (dungeonId) => {
            this.selectDungeon(dungeonId);
        });

        // Step 5: Briefing overlay
        this.briefing = new BriefingOverlay();
        this.briefing.onDeploy = (dungeonId) => {
            this.loadDungeon(dungeonId);
            this.tryEnterDungeon();
        };
        this.briefing.onBack = () => {};

        // W11/W12: 언어 토글 시 마지막 editor render thunk 재평가 (briefing 은 자체 구독)
        // W15: composer floor list (dungeon subtab visible 시) 도 함께 재렌더
        // W17: 인-게임 hint area (#hint-area) 도 재렌더 — updateHintUI 호출
        this._lastEditorRender = null;
        this._lastEditorType = null;
        onLangChange(() => {
            if (this._lastEditorRender) {
                this.showEditorMessage(this._lastEditorRender(), this._lastEditorType);
            }
            if (this.currentMode === 'editor' && this.editorSubtab === 'dungeon') {
                this.renderComposerFloors();
            }
            // hint area 는 dungeon 선택 시 채워지는 영역 — currentDungeon 박혀있으면 갱신
            if (this.currentDungeon) {
                this.updateHintUI();
            }
        });

        // Step 6: Tutorial
        this.tutorial = new TutorialManager();

        // T2B-1: Daily mode state
        this.dailyHistory = new DailyHistory();
        this.dailyContext = null;  // { dateKey, seed, modifierIds, characterPool? } when daily challenge is active
        this.dailyPhase = 'intro';  // 'intro' | 'playing' | 'done'
        this.dailyResultEl = null;

        // T2B-2: active modifier set (daily only for MVP; null in campaign).
        this.activeModifierSet = null;
        // Remember the campaign character so daily two_only doesn't permanently switch.
        this.lastPlayCharacter = null;

        // Migrate legacy custom dungeons to Stage Library
        DungeonEditor.migrateToStages();

        // Screen manager
        this.screenManager = new ScreenManager();
        this.setupScreens();

        this.setupEventListeners();
        this.setupModeTabs();
        this.setupEditor();
        this.setupDailyMode();
        this.updateDungeonSelect();
        this.loadCustomDungeonOptions();
        this.updateCharacterGrid();
        this.loadDungeon('level_01_easy');

        // B-3/B-4/B-6/C-5: Initialize economy UI
        this.updateStatsUI();
        this.updateFarmingUI();
        this.updateHintUI();
        this.updateItemUI();

        // Step 6: Progressive disclosure initial state
        this.updateProgressiveDisclosure();

        // Title screen: enable Continue if save exists
        this._updateTitleButtons();

        // B-106: initial sparkline placeholder
        this.renderSparkline();

        // Step 6: Welcome tutorial — 발사는 guild 진입 후 (W7.1 opening card 와 시점 충돌 방지)
    }

    // ========== Screen System ==========

    setupScreens() {
        // Title buttons
        document.getElementById('btn-new-game').addEventListener('click', () => {
            this.runState = new RunState();
            this.runState.saveRunState();
            this._clearAllQTables();
            this.loadDungeon('level_01_easy');
            this.updateStatsUI();
            this.updateFarmingUI();
            this.updateCharacterGrid();

            // W7.1: 첫 새 게임 1회만 오프닝 카드 (rld_opening_seen flag)
            let openingSeen = false;
            try { openingSeen = localStorage.getItem('rld_opening_seen') === 'true'; } catch {}
            const enterGuild = () => {
                this.screenManager.show('screen-guild');
                this.updateGuildHall();
                this.tutorial.tryShow('init');
            };
            if (!openingSeen) {
                this._showOpeningCard(() => {
                    try { localStorage.setItem('rld_opening_seen', 'true'); } catch {}
                    enterGuild();
                });
            } else {
                enterGuild();
            }
        });

        document.getElementById('btn-continue').addEventListener('click', () => {
            this.screenManager.show('screen-guild');
            this.updateGuildHall();
            this.tutorial.tryShow('init');
        });

        document.getElementById('btn-dev-mode').addEventListener('click', () => {
            this.screenManager.show('screen-dev');
        });

        // Dev mode back button
        document.getElementById('btn-back-to-game').addEventListener('click', () => {
            this.screenManager.show('screen-guild');
            this.updateGuildHall();
        });

        // Guild tab switching
        document.querySelectorAll('.guild-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.guild-tab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.guild-tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('guild-tab-' + btn.dataset.gtab).classList.add('active');
            });
        });
    }

    _updateTitleButtons() {
        const hasSave = localStorage.getItem('rld_run_state') !== null;
        document.getElementById('btn-continue').disabled = !hasSave;
    }

    _clearAllQTables() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('rld_qtable_')) keys.push(key);
        }
        keys.forEach(k => localStorage.removeItem(k));
    }

    // ========== Guild Hall ==========

    updateGuildHall() {
        this._updateGuildResources();
        this._updateGuildQuests();
        this._updateGuildParty();
        this._updateGuildShop();
        this._updateGuildMap();
    }

    _updateGuildResources() {
        const rs = this.runState;
        document.getElementById('guild-run').textContent = t('guild.run_format', { n: rs.runNumber });
        document.getElementById('guild-gold').textContent = t('guild.gold_format', { n: rs.gold });
        document.getElementById('guild-food').textContent = t('guild.food_format', { n: rs.food });
        // HP: show current agent HP if available, else maxHp from current character
        const maxHp = rs.getMaxHp(this.currentCharacter);
        const hp = this.agent ? this.agent.hp : maxHp;
        document.getElementById('guild-hp').textContent = t('guild.hp_format', { cur: hp, max: maxHp });
        // B-203: cumulative death counter — tension when near limit.
        const deathsEl = document.getElementById('guild-deaths');
        if (deathsEl) {
            deathsEl.textContent = t('guild.deaths_format', { cur: rs.deathCount, max: DEATH_LIMIT });
            deathsEl.classList.toggle('guild-res-warn', rs.deathCount >= DEATH_LIMIT - 1);
        }
    }

    _updateGuildQuests() {
        const panel = document.getElementById('guild-tab-quest');
        const rs = this.runState;
        let html = '';

        // Group by chapter — Task #6: collapsible (was 30+ LOCKED gray fill)
        const currentCh = this.runState.getCurrentChapter();
        for (const ch of CHAPTER_CONFIG) {
            // Open if: current chapter, or has cleared dungeons (player has reached)
            const isOpen = ch.chapter === currentCh || ch.dungeons.some(d => rs.clearedDungeons.has(d));
            html += `<details class="quest-section" ${isOpen ? 'open' : ''}>`;
            html += `<summary class="quest-section-title">Ch.${ch.chapter} ${t(`chapter.${ch.chapter}`)}</summary>`;
            for (const did of ch.dungeons) {
                const config = DUNGEON_CONFIG[did];
                const cleared = rs.clearedDungeons.has(did);
                const unlocked = rs.unlockedDungeons.has(did);
                const level = this.getDungeonLevel(did);
                const name = this.getDungeonDisplayName(did);

                let badge = '';
                if (cleared) badge = '<span class="quest-card-badge cleared">CLEAR</span>';
                else if (unlocked) badge = '<span class="quest-card-badge new">NEW</span>';
                else badge = '<span class="quest-card-badge locked">LOCKED</span>';

                const reward = cleared
                    ? `Farming: +${config.repeatReward}G`
                    : `First Clear: +${config.firstReward}G`;

                const cardClass = cleared ? 'quest-card cleared' : (unlocked ? 'quest-card' : 'quest-card locked');

                html += `<div class="${cardClass}" data-dungeon="${did}" ${unlocked || cleared ? '' : 'style="opacity:0.4;pointer-events:none"'}>
                    <div class="quest-card-header">
                        <span class="quest-card-name">Lv.${level} ${name}</span>
                        ${badge}
                    </div>
                    <div class="quest-card-info">Cost: ${config.cost}G | ${this._getDungeonSize(did)}</div>
                    <div class="quest-card-reward">${reward}</div>
                </div>`;
            }
            html += `</details>`;
        }

        panel.innerHTML = html;

        // Click handlers for quest cards
        panel.querySelectorAll('.quest-card:not(.locked)').forEach(card => {
            card.addEventListener('click', () => {
                const did = card.dataset.dungeon;
                if (did && (rs.unlockedDungeons.has(did) || rs.clearedDungeons.has(did))) {
                    this._showGuildBriefing(did);
                }
            });
        });
    }

    _getDungeonSize(dungeonId) {
        try {
            const grid = loadDungeon(dungeonId);
            return `${grid.width}x${grid.height}`;
        } catch {
            return '?x?';
        }
    }

    _showGuildBriefing(dungeonId) {
        // For now, load dungeon and switch to dev mode to play
        // TODO: Full briefing screen in future phase
        this.selectDungeon(dungeonId);
        this.screenManager.show('screen-dev');
    }

    _showOpeningCard(onClose) {
        const overlay = document.getElementById('opening-overlay');
        const startBtn = document.getElementById('opening-start');
        if (!overlay || !startBtn) { onClose?.(); return; }
        overlay.style.display = 'flex';
        const handler = () => {
            overlay.style.display = 'none';
            startBtn.removeEventListener('click', handler);
            onClose?.();
        };
        startBtn.addEventListener('click', handler);
    }

    _updateGuildParty() {
        const panel = document.getElementById('guild-tab-party');
        const rs = this.runState;
        let hiredHtml = '<div class="quest-section-title">Hired Serpas</div><div class="serpa-grid">';
        let availableHtml = '<div class="quest-section-title">Available for Hire</div><div class="serpa-grid">';
        let lockedHtml = '';

        for (const [key, char] of Object.entries(CHARACTERS)) {
            if (key === 'scout') continue; // hidden
            const available = rs.isCharacterAvailable(key);
            const stats = CHARACTER_STATS[key];
            const opCost = BASE_OP_COST[key] || 3;
            const charLevel = rs.characterLevels[key] || 1;

            const card = `<div class="serpa-card hired">
                <div class="serpa-card-name">${char.name}</div>
                <div class="serpa-card-algo">${char.algo}</div>
                <div class="serpa-card-stats">Op: ${opCost}G | Lv.${charLevel}</div>
            </div>`;

            if (available) {
                hiredHtml += card;
            } else {
                const hireCost = this._getHireCost(key);
                if (hireCost !== null) {
                    const canAfford = rs.gold >= hireCost;
                    availableHtml += `<div class="serpa-card">
                        <div class="serpa-card-name">${char.name}</div>
                        <div class="serpa-card-algo">${char.algo}</div>
                        <div class="serpa-card-cost">${hireCost}G</div>
                        <div class="serpa-card-stats">Op: ${opCost}G</div>
                        <button class="btn-hire" data-char="${key}" ${canAfford ? '' : 'disabled'}>${canAfford ? 'Hire' : 'Not enough G'}</button>
                    </div>`;
                } else {
                    lockedHtml += `<div class="serpa-card locked">
                        <div class="serpa-card-name">${char.name}</div>
                        <div class="serpa-card-algo">${char.algo}</div>
                        <div class="serpa-card-stats">Locked</div>
                    </div>`;
                }
            }
        }

        hiredHtml += '</div>';
        availableHtml += '</div>';
        if (lockedHtml) {
            lockedHtml = '<div class="quest-section-title">Locked</div><div class="serpa-grid">' + lockedHtml + '</div>';
        }

        panel.innerHTML = hiredHtml + availableHtml + lockedHtml;

        // Hire button handlers
        panel.querySelectorAll('.btn-hire').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const charKey = btn.dataset.char;
                const cost = this._getHireCost(charKey);
                if (cost !== null && rs.gold >= cost) {
                    rs.gold -= cost;
                    rs.hiredCharacters.add(charKey);
                    rs.saveRunState();
                    this.updateGuildHall();
                    this.updateCharacterGrid();
                    this.updateStatsUI();
                }
            });
        });
    }

    _getHireCost(charKey) {
        return HIRE_COSTS[charKey] ?? null;
    }

    _updateGuildShop() {
        const panel = document.getElementById('guild-tab-shop');
        const rs = this.runState;

        let html = '<div class="shop-section"><h4>Food</h4>';
        html += `<div class="shop-food-row">
            <input type="number" id="guild-food-amount" value="50" min="1" max="9999">
            <span class="shop-cost" id="guild-food-cost">(50G)</span>
            <button class="btn-shop" id="guild-btn-buy-food">Buy</button>
        </div>`;
        html += `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:6px">Current: ${rs.food} food</div>`;
        html += '</div>';

        html += '<div class="shop-section"><h4>Items</h4>';
        for (const [itemKey, item] of Object.entries(ITEMS)) {
            const itemName = t(`item.${itemKey}.name`);
            const itemDesc = t(`item.${itemKey}.desc`);
            html += `<div class="shop-item-card">
                <div>
                    <div class="shop-item-info">${itemName}</div>
                    <div class="shop-item-desc">${itemDesc}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="shop-item-cost">${item.cost}G</span>
                    <button class="btn-shop btn-shop-item" data-item="${itemKey}" ${rs.gold >= item.cost ? '' : 'disabled'}>Buy</button>
                </div>
            </div>`;
        }
        html += '</div>';

        panel.innerHTML = html;

        // Food amount → cost display
        const foodInput = document.getElementById('guild-food-amount');
        const foodCost = document.getElementById('guild-food-cost');
        foodInput.addEventListener('input', () => {
            const amt = parseInt(foodInput.value) || 0;
            foodCost.textContent = `(${amt}G)`;
        });

        // Buy food
        document.getElementById('guild-btn-buy-food').addEventListener('click', () => {
            const amt = parseInt(foodInput.value) || 0;
            if (amt > 0 && rs.gold >= amt) {
                rs.gold -= amt;
                rs.food += amt;
                rs.saveRunState();
                this.updateGuildHall();
                this.updateStatsUI();
            }
        });

        // Buy items
        panel.querySelectorAll('.btn-shop-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemKey = btn.dataset.item;
                const item = ITEMS[itemKey];
                if (item && rs.gold >= item.cost) {
                    rs.gold -= item.cost;
                    if (!rs.inventory) rs.inventory = {};
                    rs.inventory[itemKey] = (rs.inventory[itemKey] || 0) + 1;
                    rs.saveRunState();
                    this.updateGuildHall();
                    this.updateStatsUI();
                    this.updateItemUI();
                }
            });
        });
    }

    _updateGuildMap() {
        const panel = document.getElementById('guild-tab-map');
        // Reuse the DungeonMap component — render a simple chapter-based overview
        const rs = this.runState;
        let html = '';
        for (const ch of CHAPTER_CONFIG) {
            html += `<div class="quest-section-title">Ch.${ch.chapter} ${t(`chapter.${ch.chapter}`)}</div>`;
            html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">';
            for (const did of ch.dungeons) {
                const cleared = rs.clearedDungeons.has(did);
                const unlocked = rs.unlockedDungeons.has(did);
                const level = this.getDungeonLevel(did);
                const color = cleared ? 'var(--success)' : unlocked ? 'var(--accent)' : '#333';
                const border = cleared ? 'var(--success)' : unlocked ? 'var(--accent)' : '#222';
                html += `<div style="width:32px;height:32px;border-radius:6px;background:${color};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:${cleared || unlocked ? '#fff' : '#444'}" title="${this.getDungeonDisplayName(did)}">${level}</div>`;
            }
            html += '</div>';
        }
        panel.innerHTML = html;
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

        // Stop training when leaving play
        if (this.currentMode === 'play' && this.isTraining) {
            this.stopTraining();
        }
        // Stop training when leaving daily too (defensive — daily shouldn't train, but)
        if (this.currentMode === 'daily' && this.isTraining) {
            this.stopTraining();
        }

        const prevMode = this.currentMode;
        this.currentMode = mode;

        // Update tab UI
        document.querySelectorAll('.mode-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        const playControls = document.querySelector('.controls:not(.editor-controls):not(.daily-controls)');
        const editorControls = document.getElementById('editor-controls');
        const dailyControls = document.getElementById('daily-controls');

        // Reset body classes
        document.body.classList.remove('editor-mode', 'daily-mode');

        if (mode === 'editor') {
            document.body.classList.add('editor-mode');
            playControls.style.display = 'none';
            editorControls.style.display = '';
            if (dailyControls) dailyControls.style.display = 'none';
            this.editor.activate();
        } else if (mode === 'daily') {
            document.body.classList.add('daily-mode');
            playControls.style.display = 'none';
            editorControls.style.display = 'none';
            if (dailyControls) dailyControls.style.display = '';
            if (prevMode === 'editor') {
                this.editor.deactivate();
                this._lastEditorRender = null;  // W13: editor 떠날 때 thunk 캐시 reset (briefing hide() 대칭)
            }
            this.enterDailyMode();
        } else {
            // play
            playControls.style.display = '';
            editorControls.style.display = 'none';
            if (dailyControls) dailyControls.style.display = 'none';
            if (prevMode === 'editor') {
                this.editor.deactivate();
                this._lastEditorRender = null;  // W13: editor 떠날 때 thunk 캐시 reset (briefing hide() 대칭)
            }
            // T2B-1: returning from daily — restore the campaign dungeon.
            // T2B-2: also restore the campaign character if two_only forced a switch,
            // and the fogOfWar checkbox state (heavy_fog may have forced it on).
            if (prevMode === 'daily' && this.isDailyDungeon(this.currentDungeon)) {
                if (this.fogOfWarCheck) {
                    this.renderer.fogOfWar = this.fogOfWarCheck.checked;
                }
                if (this.lastPlayCharacter && this.lastPlayCharacter !== this.currentCharacter) {
                    this.currentCharacter = this.lastPlayCharacter;
                    document.querySelectorAll('.char-card').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.char === this.currentCharacter);
                    });
                    if (this.characterDesc && CHARACTERS[this.currentCharacter]) {
                        this.characterDesc.textContent = t(`character.desc.${this.currentCharacter}`);
                    }
                }
                const restore = this.lastPlayDungeon || 'level_01_easy';
                this.loadDungeon(restore);
            } else if (!skipReload) {
                // Restore play canvas (unless caller will handle it)
                this.loadDungeon(this.currentDungeon);
            }
        }
        this._renderModifierBand?.();
    }

    // ========== T2B-1: Daily Mode ==========

    setupDailyMode() {
        const startBtn = document.getElementById('btn-daily-start');
        const retryBtn = document.getElementById('btn-daily-retry');
        if (startBtn) startBtn.addEventListener('click', () => this.startDailyChallenge());
        if (retryBtn) retryBtn.addEventListener('click', () => this.startDailyChallenge());
    }

    enterDailyMode() {
        // Stop any ongoing training defensively (already done in switchMode but safe)
        if (this.isTraining) this.stopTraining();
        this.isGameOver = false;
        const overlay = this.gameOverOverlay;
        if (overlay) overlay.style.display = 'none';

        // Remember the campaign dungeon we were on so we can restore it on exit.
        if (!this.isDailyDungeon(this.currentDungeon)) {
            this.lastPlayDungeon = this.currentDungeon;
            this.lastPlayCharacter = this.currentCharacter;
        }

        // Resolve today's challenge + modifiers
        this.dailyContext = getDailyChallenge();
        this._resolveDailyCharacterPool();
        this.dailyPhase = 'intro';
        this.renderDailyIntro();
        // Show a preview of the daily dungeon on canvas (read-only — no input until 도전)
        this.loadDailyDungeon();
    }

    // T2B-2: If two_only is active, deterministically pick 2 character ids from
    // the player's available pool and force currentCharacter into the pair.
    _resolveDailyCharacterPool() {
        if (!this.dailyContext) return;
        const { seed, modifierIds } = this.dailyContext;
        if (!modifierIds.includes('two_only')) {
            this.dailyContext.characterPool = null;
            return;
        }
        // D-2026-05-12-8: daily ≠ campaign progression. Pool draws from every
        // non-hidden algorithm so the daily challenge is fair across save states.
        const available = Object.keys(CHARACTERS).filter(name => !this.runState.isCharacterHidden(name));
        const tmpSet = new ModifierSet(modifierIds, seed);
        const pool = tmpSet.pickCharacterPool(available, 2);
        this.dailyContext.characterPool = pool;
        if (pool.length > 0 && !pool.includes(this.currentCharacter)) {
            this.currentCharacter = pool[0];
            document.querySelectorAll('.char-card').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.char === this.currentCharacter);
            });
            if (this.characterDesc && CHARACTERS[this.currentCharacter]) {
                this.characterDesc.textContent = t(`character.desc.${this.currentCharacter}`);
            }
        }
    }

    renderDailyIntro() {
        if (!this.dailyContext) return;
        const { dateKey, seed, modifierIds } = this.dailyContext;
        const dateEl = document.getElementById('daily-date');
        const seedEl = document.getElementById('daily-seed');
        const modsRow = document.getElementById('daily-modifiers-row');
        const modsEl = document.getElementById('daily-modifiers');
        if (dateEl) dateEl.textContent = dateKey;
        if (seedEl) seedEl.textContent = '#' + seed;
        if (modsRow) modsRow.style.display = modifierIds.length > 0 ? '' : 'none';
        if (modsEl) {
            if (modifierIds.length > 0) {
                modsEl.innerHTML = modifierIds.map(id => {
                    const m = MODIFIERS[id];
                    if (!m) return id;
                    const name = t(`modifier.${id}.name`);
                    const desc = t(`modifier.${id}.desc`);
                    return `<span class="modifier-chip" title="${desc}">${name}</span>`;
                }).join('');
            } else {
                modsEl.textContent = '—';
            }
        }

        // two_only: render a 2-character picker so the player can pick which
        // serpa to send into the daily attempt.
        const poolRow = document.getElementById('daily-pool-row');
        const poolEl = document.getElementById('daily-character-pool');
        const pool = this.dailyContext.characterPool;
        if (poolRow && poolEl) {
            if (pool && pool.length > 0) {
                poolRow.style.display = '';
                poolEl.innerHTML = pool.map(id => {
                    const def = CHARACTERS[id] || { name: id, personality: '' };
                    const isActive = id === this.currentCharacter;
                    return `<button class="daily-char-btn${isActive ? ' active' : ''}" data-char="${id}" title="${def.algo || ''} — ${def.desc || ''}"><span class="daily-char-name">${def.name}</span><span class="daily-char-personality">${def.personality || ''}</span></button>`;
                }).join('');
                poolEl.querySelectorAll('.daily-char-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.char;
                        if (!pool.includes(id)) return;
                        this.currentCharacter = id;
                        if (this.characterDesc && CHARACTERS[id]) {
                            this.characterDesc.textContent = t(`character.desc.${id}`);
                        }
                        document.querySelectorAll('.char-card').forEach(c => {
                            c.classList.toggle('active', c.dataset.char === id);
                        });
                        this.renderDailyIntro();
                    });
                });
            } else {
                poolRow.style.display = 'none';
                poolEl.innerHTML = '';
            }
        }

        // Yesterday record
        const yesterdayEl = document.getElementById('daily-yesterday');
        const yesterdayContent = document.getElementById('daily-yesterday-content');
        const yRec = this.dailyHistory.getYesterday(dateKey);
        if (yesterdayEl && yesterdayContent) {
            if (yRec) {
                yesterdayEl.style.display = '';
                const yKey = yesterdayKey(dateKey);
                yesterdayContent.innerHTML = this.renderDailyRecord(yKey, yRec);
            } else {
                yesterdayEl.style.display = 'none';
            }
        }

        // Today's record (so far)
        const todayEl = document.getElementById('daily-today');
        const todayContent = document.getElementById('daily-today-content');
        const tRec = this.dailyHistory.get(dateKey);
        if (todayEl && todayContent) {
            if (tRec) {
                todayEl.style.display = '';
                todayContent.innerHTML = this.renderDailyRecord(dateKey, tRec);
            } else {
                todayEl.style.display = 'none';
            }
        }

        // 7-day carousel (T2B-1.3)
        const weekEl = document.getElementById('daily-week');
        const weekContent = document.getElementById('daily-week-content');
        if (weekEl && weekContent) {
            const recent = this.dailyHistory.getRecent(dateKey, 7);
            const hasAny = recent.some(r => r.record !== null);
            if (hasAny) {
                weekEl.style.display = '';
                weekContent.innerHTML = recent.map(({ dateKey: dk, record }) => {
                    const dayPart = dk.slice(8);
                    const isToday = dk === dateKey;
                    let cls = 'daily-week-cell';
                    let mark = '—';
                    if (record) {
                        if (record.cleared) { cls += ' cleared'; mark = '✓'; }
                        else { cls += ' attempted'; mark = '✗'; }
                    }
                    if (isToday) cls += ' today';
                    return `<div class="${cls}" title="${dk}"><span class="day-num">${dayPart}</span><span>${mark}</span></div>`;
                }).join('');
            } else {
                weekEl.style.display = 'none';
            }
        }

        // Button labels
        const startBtn = document.getElementById('btn-daily-start');
        const retryBtn = document.getElementById('btn-daily-retry');
        if (startBtn) {
            startBtn.style.display = '';
            startBtn.textContent = tRec
                ? (tRec.cleared ? t('daily.btn.retry_record') : t('daily.btn.retry'))
                : t('daily.btn.start');
        }
        if (retryBtn) retryBtn.style.display = 'none';
    }

    renderDailyRecord(dateKey, rec) {
        if (!rec) return '—';
        const rows = [];
        rows.push(`<div class="row"><span class="label">${t('daily.row.date')}</span><span>${dateKey}</span></div>`);
        rows.push(`<div class="row"><span class="label">${t('daily.row.result')}</span><span>${rec.cleared ? t('daily.row.cleared') : t('daily.row.failed')}</span></div>`);
        if (rec.cleared && rec.bestSteps != null) {
            rows.push(`<div class="row"><span class="label">${t('daily.row.best_steps')}</span><span>${rec.bestSteps}</span></div>`);
        }
        rows.push(`<div class="row"><span class="label">${t('daily.row.attempts')}</span><span>${t('daily.row.attempts_unit', { n: rec.attempts })}</span></div>`);
        if (rec.deaths > 0) {
            rows.push(`<div class="row"><span class="label">${t('daily.row.deaths')}</span><span>${t('daily.row.deaths_unit', { n: rec.deaths })}</span></div>`);
        }
        return rows.join('');
    }

    loadDailyDungeon() {
        if (!this.dailyContext) return;
        const { dateKey, seed, modifierIds } = this.dailyContext;
        const gridStr = generateDungeon(20, 20, { seed });
        this.grid = Grid.fromString(gridStr);
        this.currentDungeon = `daily_${dateKey}`;
        this.renderer.setGrid(this.grid);

        // BGM T4 데일리 트랙 (D-2026-05-21-1) — seed 기반 절차적
        music.setDailySeed(seed);
        music.crossFade('T4');
        this.qlearning = this.createAlgorithm({ cost: 0, firstReward: 0, repeatReward: 0 });
        this.trainStats.innerHTML = '';
        this.renderer.setQData(null, null);

        // T2B-2: build the modifier set for this daily and apply to agent + renderer.
        this.activeModifierSet = new ModifierSet(modifierIds, seed);
        this.reset();
        this._syncAgentModifiers();
        // heavy_fog needs fog rendering even if user toggled it off in campaign.
        if (this.activeModifierSet.has('heavy_fog')) {
            this.renderer.fogOfWar = true;
        }
        this._renderModifierBand();
    }

    _syncAgentModifiers() {
        if (!this.agent) return;
        if (this.activeModifierSet && !this.activeModifierSet.isEmpty()) {
            this.agent.modifierSet = this.activeModifierSet;
            this.agent.visibilityRange = this.activeModifierSet.visibilityRange(5);
        } else {
            this.agent.modifierSet = null;
            this.agent.visibilityRange = 5;
        }
        // M4 silent_q modifier (daily-only): hide Q-heatmap + sparkline.
        // When muted clears, restore the user's checkbox preference rather than
        // forcing it to false (W1 — preserve sticky toggle state across dailies).
        const muted = !!(this.activeModifierSet && this.activeModifierSet.visualizationMuted());
        const userQPref = !!this.showQValuesCheck?.checked;
        if (this.renderer) this.renderer.showQValues = muted ? false : userQPref;
        const sparkWrap = document.getElementById('sparkline-wrap');
        if (sparkWrap) sparkWrap.style.display = muted ? 'none' : '';
        // B-207: muted 시 placeholder 노출 — RL 양념이 사라진 게 아니라 가려졌음을 명시 (D-4)
        const silentPlaceholder = document.getElementById('silent-q-placeholder');
        if (silentPlaceholder) silentPlaceholder.style.display = muted ? '' : 'none';
    }

    _renderModifierBand() {
        const band = document.getElementById('modifier-band');
        if (!band) return;
        const items = this.activeModifierSet ? this.activeModifierSet.list() : [];
        // Only daily mode surfaces the band today (campaign modifiers are MVP-out).
        if (this.currentMode !== 'daily' || items.length === 0) {
            band.style.display = 'none';
            band.innerHTML = '';
            return;
        }
        band.style.display = '';
        const label = `<span class="modifier-label">${t('modifier_band.this_run')}</span>`;
        const chips = items.map(m => {
            const name = t(`modifier.${m.id}.name`);
            const desc = t(`modifier.${m.id}.desc`);
            return `<span class="modifier-chip" title="${desc}"><span class="modifier-name">${name}</span><span class="modifier-desc">${desc}</span></span>`;
        }).join('');
        band.innerHTML = `${label}${chips}`;
    }

    startDailyChallenge() {
        if (!this.dailyContext) this.dailyContext = getDailyChallenge();
        this.dailyPhase = 'playing';
        this.isGameOver = false;
        if (this.gameOverOverlay) this.gameOverOverlay.style.display = 'none';
        // Always re-generate (safe even on retry) and reset state
        this.loadDailyDungeon();
        // Clear any lingering daily result toast in main message area
        if (this.messageEl) this.messageEl.textContent = '';
        this.showMessage(t('daily.start_msg', { seed: this.dailyContext.seed }), 'info');
    }

    handleDailyVictory() {
        if (!this.dailyContext) return;
        const { dateKey, seed, modifierIds } = this.dailyContext;
        const yKey = yesterdayKey(dateKey);
        const yRec = this.dailyHistory.get(yKey);
        const result = this.dailyHistory.recordAttempt(dateKey, {
            seed,
            cleared: true,
            steps: this.steps,
            deaths: 0,
            modifierIds,
        });
        this.dailyPhase = 'done';
        sound.victory();
        this.renderer.flash('rgba(34, 197, 94, 0.4)');

        let msg = t('daily.victory_msg', { steps: this.steps });
        if (result.isFirstClear) {
            msg += ' ' + t('daily.victory.first_clear');
        } else if (result.isImprovement) {
            msg += ' ' + t('daily.victory.improvement', { prev: result.prevBest });
        }
        if (yRec && yRec.cleared && yRec.bestSteps != null) {
            const diff = this.steps - yRec.bestSteps;
            if (diff === 0) msg += ' / ' + t('daily.compare.same');
            else if (diff < 0) msg += ' / ' + t('daily.compare.better', { diff: Math.abs(diff) });
            else msg += ' / ' + t('daily.compare.worse', { diff });
        }
        this.showMessage(msg, 'success');
        if (this.toast) this.toast.show(msg, 'success');

        // Update intro panel with new record and re-render
        this.renderDailyIntro();
    }

    handleDailyGameOver(cause) {
        if (!this.dailyContext) return;
        const { dateKey, seed, modifierIds } = this.dailyContext;
        this.dailyHistory.recordAttempt(dateKey, {
            seed,
            cleared: false,
            steps: this.steps,
            deaths: 1,
            modifierIds,
        });
        this.isGameOver = true;
        this.done = true;
        this.dailyPhase = 'done';
        sound.death();
        this.renderer.flash('rgba(239, 68, 68, 0.3)');
        this.showMessage(t('daily.fail_msg', { cause }), 'danger');
        if (this.toast) this.toast.show(t('daily.fail_toast', { cause }), 'warning');
        this.renderDailyIntro();
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
            this.showEditorI18nMessage('editor.msg.grid_resized', 'info', { w: this.editor.grid.width, h: this.editor.grid.height });
        });

        // Undo/Redo/Clear/Validate buttons
        document.getElementById('btn-undo').addEventListener('click', () => this.editor.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.editor.redo());
        document.getElementById('btn-clear').addEventListener('click', () => {
            this.editor.clearGrid();
            this.showEditorI18nMessage('editor.msg.grid_cleared', 'info');
        });
        document.getElementById('btn-validate').addEventListener('click', () => {
            const result = this.editor.validate();
            if (result.valid) {
                this.showEditorI18nMessage('editor.msg.valid_ready', 'success');
            } else {
                this.showEditorErrorsMessage(result.errors, 'danger');
            }
        });

        // Save
        document.getElementById('btn-save-dungeon').addEventListener('click', () => {
            const nameInput = document.getElementById('dungeon-name-input');
            const name = nameInput.value.trim();
            if (!name) {
                this.showEditorI18nMessage('editor.msg.enter_stage_name', 'warning');
                return;
            }
            const result = this.editor.validate();
            if (!result.valid) {
                this.showEditorErrorsMessage(result.errors, 'danger', 'editor.msg.fix_errors_first');
                return;
            }
            const id = this.editor.saveStage(name);
            this.showEditorI18nMessage('editor.msg.saved', 'success', { name });
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
                this.showEditorI18nMessage('editor.msg.loaded', 'info', { name: item ? item.name : id });
            }
        });

        // Delete
        document.getElementById('btn-delete-dungeon').addEventListener('click', () => {
            const sel = document.getElementById('custom-dungeon-select');
            const id = sel.value;
            if (!id) return;
            if (this.editor.deleteStage(id)) {
                this.showEditorI18nMessage('editor.msg.deleted', 'warning');
                this.refreshCustomDungeonSelects();
            }
        });

        // Play This Dungeon
        document.getElementById('btn-play-dungeon').addEventListener('click', () => {
            const result = this.editor.playDungeon();
            if (!result.success) {
                this.showEditorErrorsMessage(result.errors, 'danger');
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
                this.showEditorErrorsMessage(result.errors, 'danger');
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
                this.showEditorI18nMessage('editor.msg.enter_dungeon_name', 'warning');
                return;
            }
            if (this.composerFloors.length === 0) {
                this.showEditorI18nMessage('editor.msg.add_floor', 'warning');
                return;
            }
            // Validate all floors have at least one stage selected
            for (let i = 0; i < this.composerFloors.length; i++) {
                if (!this.composerFloors[i].stages[0]) {
                    this.showEditorI18nMessage('editor.msg.floor_no_stage', 'warning', { floor: i + 1 });
                    return;
                }
                // Check all variant slots are filled
                for (let vi = 0; vi < this.composerFloors[i].stages.length; vi++) {
                    if (!this.composerFloors[i].stages[vi]) {
                        this.showEditorI18nMessage('editor.msg.floor_variant_empty', 'warning', { floor: i + 1, variant: vi + 1 });
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
            this.showEditorI18nMessage('editor.msg.saved_dungeon', 'success', { name });
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
                this.showEditorI18nMessage('editor.msg.dungeon_not_found', 'danger');
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
            this.showEditorI18nMessage('editor.msg.loaded_dungeon', 'info', { name: data.name });
        });

        // Delete Dungeon
        document.getElementById('btn-delete-dungeon-comp').addEventListener('click', () => {
            const sel = document.getElementById('dungeon-comp-select');
            const id = sel.value;
            if (!id) return;
            if (this.editor.deleteDungeon(id)) {
                this.showEditorI18nMessage('editor.msg.dungeon_deleted', 'warning');
                this.refreshDungeonComposerSelect();
                this.loadCustomDungeonOptions();
            }
        });

        // Play This Dungeon (from composer)
        document.getElementById('btn-play-dungeon-comp').addEventListener('click', () => {
            const name = document.getElementById('dungeon-composer-name').value.trim() || 'Untitled';
            if (this.composerFloors.length === 0) {
                this.showEditorI18nMessage('editor.msg.add_floor', 'warning');
                return;
            }
            for (let i = 0; i < this.composerFloors.length; i++) {
                if (!this.composerFloors[i].stages[0]) {
                    this.showEditorI18nMessage('editor.msg.floor_no_stage', 'warning', { floor: i + 1 });
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
                this.showEditorI18nMessage('editor.msg.resolve_dungeon_failed', 'danger');
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
            this.showEditorI18nMessage('editor.msg.max_floors', 'warning');
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
            container.innerHTML = `<div class="dungeon-floor-empty">${t('editor.msg.no_floors_yet')}</div>`;
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
            removeBtn.title = t('editor.btn.remove_floor');
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
                    rmBtn.title = t('editor.btn.remove_variant');
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

    // W11/W12: thunk 기반 editor render. 마지막 호출 thunk 캐시 후 onLangChange 시 재평가.
    // — i18n dict 키 메시지 → showEditorI18nMessage 사용
    // — errors 배열 ({key, params?}[]) → showEditorErrorsMessage 사용
    // — 순수 raw 텍스트 → showEditorMessage 직접 호출 (onLangChange 갱신 안 됨)
    _renderEditorMessage(thunk, type) {
        this._lastEditorRender = thunk;
        this._lastEditorType = type;
        this.showEditorMessage(thunk(), type);
    }

    showEditorI18nMessage(key, type = 'info', params) {
        this._renderEditorMessage(() => t(key, params), type);
    }

    // W12: editor.js 의 errors 배열을 받음 — [{ key, params? }]. join 결과를 prefix 키에 보간 가능.
    showEditorErrorsMessage(errors, type = 'danger', prefixKey = null) {
        this._renderEditorMessage(() => {
            const joined = errors.map(e => t(e.key, e.params)).join(', ');
            return prefixKey ? t(prefixKey, { errors: joined }) : joined;
        }, type);
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

        // Step 3: Update visual dungeon map
        if (this.dungeonMap) {
            this.dungeonMap.render(this.runState, (id) => this.getDungeonDisplayName(id));
            this.dungeonMap.setCurrentDungeon(this.currentDungeon);
        }
    }

    // Step 3/5: Dungeon map node clicked
    selectDungeon(dungeonId) {
        if (this.isGameOver) return;
        if (!this.runState.unlockedDungeons.has(dungeonId)) {
            this.showMessage('Clear previous dungeons first!', 'warning');
            return;
        }

        // Step 5: Show briefing for built-in dungeons (skip if training or custom)
        if (this.isBuiltInDungeon(dungeonId) && !this.isTraining) {
            this.showBriefing(dungeonId);
            return;
        }

        this.loadDungeon(dungeonId);
    }

    // Step 5: Show pre-dungeon briefing overlay
    showBriefing(dungeonId) {
        if (!this.briefing) return;
        this.briefing.onDeploy = (id) => {
            this.loadDungeon(id);
            this.tryEnterDungeon();
            this.saveProgress();
        };
        this.briefing.show(dungeonId, this.runState, this.currentCharacter,
            (id) => this.getDungeonDisplayName(id));
    }

    getDungeonDisplayName(dungeonId) {
        // W16: dict 양사전 박힘 — dungeon.<level_id> 패턴. fallback = dungeonId (커스텀/preset 등).
        const key = `dungeon.${dungeonId}`;
        const val = t(key);
        return val === key ? dungeonId : val;
    }

    getDungeonLevel(dungeonId) {
        const m = dungeonId.match(/level_(\d+)/);
        return m ? parseInt(m[1]) : 1;
    }

    getOperatingCost(charName, dungeonId) {
        const base = BASE_OP_COST[charName] ?? 10;
        const level = this.getDungeonLevel(dungeonId);
        // B-104: Ch.7 (Lv.29~31, 심연) 운영비 -30% — D-4 후속 발란스 (BASE_OP_COST 자체는 수정 금지)
        const chapter7Discount = level >= 29 ? 0.7 : 1.0;
        return Math.ceil(base * level * chapter7Discount);
    }

    isBuiltInDungeon(dungeonId) {
        return !dungeonId.startsWith('custom_')
            && !dungeonId.startsWith('dungeon_')
            && !dungeonId.startsWith('preset_')
            && !dungeonId.startsWith('daily_');
    }

    isDailyDungeon(dungeonId = this.currentDungeon) {
        return typeof dungeonId === 'string' && dungeonId.startsWith('daily_');
    }

    // BGM 트랙 선택 — runState.getChapterForDungeon (SSOT, CHAPTER_CONFIG) 의존.
    // null = 현재 트랙 유지 정책 (custom_*/dungeon_composer_temp/preset_* 진입 시 BGM 끊김 회피).
    // 호출처가 `if (trackId) music.crossFade(trackId)` 박혀있어 null 일 때 crossFade 호출 X.
    _bgmTrackFor(dungeonId) {
        if (!dungeonId) return null;
        if (this.isDailyDungeon(dungeonId)) return MusicManager.trackForDaily();
        const chapter = this.runState.getChapterForDungeon(dungeonId);
        return chapter > 0 ? MusicManager.trackForChapter(chapter) : null;
    }

    /**
     * Run greedy episode to reconstruct answer path after instant training.
     * Uses epsilon=0 to get the best learned policy, without modifying algorithm files.
     */
    reconstructAnswerPath() {
        if (!this.qlearning || !this.grid) return;
        const dungeonId = this.currentDungeon;
        if (!this.isBuiltInDungeon(dungeonId)) return;

        const startPos = this.grid.startPos;
        if (!startPos) return;

        const maxSteps = this.grid.suggestedMaxSteps || 200;
        const agent = new Agent(startPos.x, startPos.y);

        // Save and override epsilon for greedy run
        const savedEpsilon = this.qlearning.epsilon;
        this.qlearning.epsilon = 0;

        let steps = 0;
        let success = false;

        while (steps < maxSteps) {
            const action = this.qlearning.chooseAction
                ? this.qlearning.chooseAction(agent.x, agent.y, agent.hp)
                : this.qlearning.stepAction(agent.x, agent.y, agent.hp);

            const result = agent.move(action, this.grid);
            steps++;

            if (result.done) {
                if (agent.hp > 0 && this.grid.getTile(agent.x, agent.y) === TileType.GOAL) {
                    success = true;
                }
                break;
            }
        }

        this.qlearning.epsilon = savedEpsilon;

        if (success) {
            this.runState.recordAnswerPath(dungeonId, agent.actionHistory, steps, this.currentCharacter);
        }
    }

    /**
     * Create algorithm instance based on current character
     */
    createAlgorithm(config, overrides = {}) {
        return createAlgorithmFromConfig(this.currentCharacter, this.grid, config, overrides);
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
            const charName_i18n = t(`char.${charName}`);
            const personality_i18n = t(`character.personality.${charName}`);
            if (this.runState.gold < cost) {
                this.showMessage(t('hire.need_gold', { name: charName_i18n, cost, gold: this.runState.gold }), 'danger');
                return;
            }
            // T2B-3: 학명 → 성격 태그 (알고리즘=캐릭터, D-4)
            const ok = confirm(t('hire.confirm', { name: charName_i18n, personality: personality_i18n, cost }));
            if (!ok) return;
            this.runState.hireCharacter(charName);
            this.updateCharacterGrid();
            this.updateUI();
            this.showMessage(t('hire.success', { name: charName_i18n, cost }), 'success');
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
        this.characterDesc.textContent = t(`character.desc.${charName}`);

        // Reload dungeon with new character's algorithm
        this.loadDungeon(this.currentDungeon);
    }

    // B-201: minimap render — only large dungeons (≥25 in either dim).
    // CSS keeps the wrap hidden on desktop; data-active gates display on mobile.
    _renderMinimap() {
        if (!this.minimapWrap || !this.minimapCtx) return;
        const g = this.grid;
        const THRESHOLD = 25;
        if (!g || (g.width < THRESHOLD && g.height < THRESHOLD)) {
            if (this.minimapWrap.dataset.active !== 'false') this.minimapWrap.dataset.active = 'false';
            return;
        }
        if (this.minimapWrap.dataset.active !== 'true') this.minimapWrap.dataset.active = 'true';

        const maxDim = 120;
        const cell = Math.max(1, Math.floor(maxDim / Math.max(g.width, g.height)));
        const w = g.width * cell;
        const h = g.height * cell;
        if (this.minimapCanvas.width !== w || this.minimapCanvas.height !== h) {
            this.minimapCanvas.width = w;
            this.minimapCanvas.height = h;
        }
        const ctx = this.minimapCtx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        for (let y = 0; y < g.height; y++) {
            for (let x = 0; x < g.width; x++) {
                // i18n t() shadowing 방지 — `tile` 사용 (i18n 1차 마이그레이션 후속, I1 리뷰)
                const tile = g.getTile(x, y);
                let color = null;
                if (tile === TileType.WALL) color = '#4a4a4a';
                else if (tile === TileType.GOAL) color = '#22c55e';
                else if (tile === TileType.GOLD) color = '#facc15';
                else if (tile === TileType.MONSTER || tile === TileType.TRAP) color = '#ef4444';
                else if (tile === TileType.HEAL) color = '#10b981';
                else if (tile === TileType.START) color = '#3b82f6';
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x * cell, y * cell, cell, cell);
                }
            }
        }

        if (this.agent && typeof this.agent.x === 'number') {
            ctx.fillStyle = '#fff';
            const size = Math.max(cell * 2, 3);
            const cx = this.agent.x * cell + cell / 2 - size / 2;
            const cy = this.agent.y * cell + cell / 2 - size / 2;
            ctx.fillRect(Math.max(0, cx), Math.max(0, cy), size, size);
        }
    }

    updateCharacterGrid() {
        document.querySelectorAll('.char-card').forEach(btn => {
            const charName = btn.dataset.char;
            btn.classList.toggle('locked', this.runState.isCharacterLocked(charName));
            btn.classList.toggle('char-hidden', this.runState.isCharacterHidden(charName));
            btn.classList.toggle('char-farming', this.runState.isFarming(charName));
        });
    }

    setupEventListeners() {
        // Initialize sound + music on first interaction (browser AudioContext autoplay policy)
        const initSound = () => {
            sound.init();
            music.init();
            document.removeEventListener('keydown', initSound);
            document.removeEventListener('click', initSound);
            document.removeEventListener('touchstart', initSound);
        };
        document.addEventListener('keydown', initSound);
        document.addEventListener('click', initSound);
        document.addEventListener('touchstart', initSound);

        // Character select cards
        // B-105: 카드 표면 = 성격 태그, 학명은 hover 툴팁 (알고리즘=캐릭터, D-4)
        document.querySelectorAll('.char-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCharacter(e.currentTarget.dataset.char);
            });
            const def = CHARACTERS[btn.dataset.char];
            if (!def) return;
            const algoSpan = btn.querySelector('.char-algo');
            if (algoSpan && def.personality) algoSpan.textContent = def.personality;
            btn.setAttribute('title', `${def.algo} — ${def.desc}`);
        });

        // B-206: one-shot toast if existing save already has deathCount >= LIMIT
        // (B-203 introduced the limit retroactively — surface it once on first load).
        const DEATH_NOTIFIED_KEY = 'rld_death_limit_notified';
        try {
            if (this.runState.deathCount >= DEATH_LIMIT && localStorage.getItem(DEATH_NOTIFIED_KEY) !== '1') {
                if (this.toast) {
                    this.toast.show(t('death_limit.toast', { cur: this.runState.deathCount, max: DEATH_LIMIT }), 'warning');
                }
                localStorage.setItem(DEATH_NOTIFIED_KEY, '1');
            }
        } catch (e) { /* localStorage unavailable */ }

        // M5 i18n: 언어 토글 — ko ↔ en. label 은 *다음 언어* 표시.
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            const updateLangLabel = () => {
                langToggle.textContent = getLang() === 'ko' ? 'EN' : '한국어';
            };
            updateLangLabel();
            langToggle.addEventListener('click', () => {
                setLang(getLang() === 'ko' ? 'en' : 'ko');
                updateLangLabel();
                // 동적 텍스트 갱신 (data-i18n 외 element — _updateGuildResources 등)
                this.updateUI();
                // stats-toggle 텍스트도 갱신 (data-i18n 미적용 element)
                const expanded = document.getElementById('stats-panel')?.classList.contains('expanded');
                const stEl = document.getElementById('stats-toggle');
                if (stEl) stEl.textContent = expanded ? t('stats_toggle.show_less') : t('stats_toggle.show_more');
                // character-desc 갱신
                if (this.characterDesc && this.currentCharacter) {
                    this.characterDesc.textContent = t(`character.desc.${this.currentCharacter}`);
                }
                // modifier band / daily intro 갱신
                this._renderModifierBand?.();
                this.renderDailyIntro?.();
            });
        }

        // B-202: mobile bottom tab bar (≤700px) — smooth scroll to anchored section
        document.querySelectorAll('.bottom-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const target = document.querySelector(tab.dataset.target);
                if (!target) return;
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // 변수명 'tab' 사용 — i18n t() shadowing 방지 (forEach iterator 가 t 였으면 t() 가려졌음)
                document.querySelectorAll('.bottom-tab').forEach(other => other.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        // B-204: mobile stats toggle (Run / Reward / Food / Clear Rate hidden by default ≤700px)
        // Preference persisted in localStorage so it survives page reload.
        const statsToggle = document.getElementById('stats-toggle');
        const statsPanel = document.getElementById('stats-panel');
        if (statsToggle && statsPanel) {
            const STATS_EXPANDED_KEY = 'rld_ui_stats_expanded';
            const applyExpanded = (expanded) => {
                statsPanel.classList.toggle('expanded', expanded);
                statsToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                statsToggle.textContent = expanded ? t('stats_toggle.show_less') : t('stats_toggle.show_more');
            };
            try {
                if (localStorage.getItem(STATS_EXPANDED_KEY) === '1') applyExpanded(true);
            } catch (e) { /* localStorage unavailable (Safari private mode etc.) */ }
            statsToggle.addEventListener('click', () => {
                const expanded = !statsPanel.classList.contains('expanded');
                applyExpanded(expanded);
                try { localStorage.setItem(STATS_EXPANDED_KEY, expanded ? '1' : '0'); } catch (e) {}
            });
        }

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

        // C-3: New Game+ button
        document.getElementById('btn-new-game-plus').addEventListener('click', () => this.startNewGamePlus());

        // C-5: Item shop buttons
        document.querySelectorAll('.btn-buy-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.currentTarget.dataset.item;
                if (this.runState.buyItem(itemId)) {
                    const item = ITEMS[itemId];
                    // Contract items: activate + consume immediately (1 episode effect)
                    if (itemId === 'defense_contract') {
                        this.runState.useItem('defense_contract');
                        this.activeDefenseContract = true;
                    }
                    if (itemId === 'trap_nullify') {
                        this.runState.useItem('trap_nullify');
                        this.activeTrapNullify = true;
                    }
                    this.showMessage(`Bought ${t(`item.${itemId}.name`)}! -${item.cost}G`, 'success');
                    this.updateUI();
                    this.updateItemUI();
                } else {
                    this.showMessage('Not enough gold!', 'danger');
                }
            });
        });

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
            this.updateItemUI();
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

        // Music (BGM) toggle (D-2026-05-21-1)
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            musicToggle.addEventListener('change', (e) => {
                music.enabled = e.target.checked;
                if (e.target.checked) {
                    // Re-trigger current dungeon's track
                    const trackId = this._bgmTrackFor(this.currentDungeon);
                    if (trackId) music.crossFade(trackId);
                } else {
                    music.stop(true, 0.3);
                }
            });
        }

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
        // F2: 새 던전 진입 시 식량 임계 경고 flag 리셋 (다음 임계 도달 시 다시 1회 토스트)
        this._foodWarnShown = false;

        // Task #10: 캔버스 viewport 정착 (3차 외부 비평 — Lv.1 진입 시 y=-475px 회귀)
        requestAnimationFrame(() => {
            this.canvas?.closest('.game-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        // BGM 트랙 전환 (D-2026-05-21-1) — chapter 단위 cross-fade
        const trackId = this._bgmTrackFor(name);
        if (trackId) music.crossFade(trackId);

        // T2B-2 (D-9): every campaign / custom / preset path enters with no
        // runtime modifier. Done once at the top so the custom_ / dungeon_ /
        // preset_ early-return branches below can't leak a daily ModifierSet.
        this.activeModifierSet = null;
        this._syncAgentModifiers();
        this._renderModifierBand?.();

        // Step 3: Sync dungeon map selection
        if (this.dungeonMap) {
            this.dungeonMap.setCurrentDungeon(name);
        }

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
        // B-1: Show operating cost in dungeon info
        const opCost = this.getOperatingCost(this.currentCharacter, name);
        const opNote = ` | Train: ${opCost}G/ep`;
        this.showMessage(`${name} - Cost: ${config.cost}G, Reward: ${config.firstReward}G${hpNote}${slipNote}${charNote}${loadNote}${opNote}`, 'info');

        if (loaded) {
            this.updateVisualization();
        }

        this.reset();

        // B-6: Update hint UI on dungeon change
        this.updateHintUI();
    }

    tryEnterDungeon() {
        const config = DUNGEON_CONFIG[this.currentDungeon] || { cost: 0, firstReward: 0, repeatReward: 0 };
        // T2B-1: daily_* must NOT charge entry fee or count as built-in
        const isBuiltIn = this.isBuiltInDungeon(this.currentDungeon);

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

        // B-3: Apply character maxHp. M4 hp_cap_50 (daily-only): clamp to 50.
        let maxHp = this.runState.getMaxHp(this.currentCharacter);
        if (this.activeModifierSet) maxHp = this.activeModifierSet.clampMaxHp(maxHp);

        if (!this.agent) {
            this.agent = new Agent(x, y, maxHp, maxHp);
        } else {
            this.agent.maxHp = maxHp;
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

        // C-4: Treasure position
        this.carryingTreasure = false;
        this.computeTreasurePosition(this.currentDungeon);

        // C-5: Reset item contract flags (consumed at episode end, not start)
        this.activeDefenseContract = false;
        this.activeTrapNullify = false;

        this.updateUI();
        this.render();
    }

    handleAction(action) {
        if (this.done || this.isGameOver) return;

        // M4 daily modifiers (manual play only — training uses its own loop):
        // - wind_gust: 10% chance per turn to skip the action.
        // - mirror_input: swap LEFT/RIGHT inputs.
        if (!this.isTraining && this.activeModifierSet) {
            if (this.activeModifierSet.shouldSkipTurn()) {
                this.showMessage(t('modifier_effect.wind_gust'), 'warning');
                this.steps++;
                this.render();
                return;
            }
            action = this.activeModifierSet.mirrorInput(action);
        }

        // T2B-1: daily_* must be excluded from "built-in" economy too
        const isBuiltIn = this.isBuiltInDungeon(this.currentDungeon);

        // Food consumption (manual play only, built-in dungeons only)
        if (!this.isTraining && isBuiltIn && this.runState.food > 0) {
            this.runState.consumeFood();
            // F1: 변화 floating "-2" — 매 스텝 식량 차감 가시성
            this._flashFoodDelta(-2);
            // F2: 임계 경고 — food < 20 첫 도달 시 1회 토스트
            if (this.runState.food < 20 && !this._foodWarnShown) {
                this._foodWarnShown = true;
                this.showMessage(t('food.warn.threshold'), 'warning');
            }
        } else if (!this.isTraining && isBuiltIn && this.runState.food <= 0 && this.steps > 0) {
            // C-5: Escape rope — prevent game over
            if (this.runState.hasItem('escape_rope')) {
                this.runState.useItem('escape_rope');
                this.done = true;
                if (this.carryingTreasure) {
                    const val = this.runState.collectTreasure(this.currentDungeon);
                    this.carryingTreasure = false;
                    this.showMessage(t('rope.escape_with_treasure', { val }), 'warning');
                } else {
                    this.showMessage(t('rope.escape'), 'warning');
                }
                this.updateUI(); this.updateItemUI(); this.render();
                return;
            }
            // Food ran out — game over
            this.triggerGameOver(t('game_over.starvation'));
            return;
        }

        // Total step counter
        this.runState.totalSteps++;

        // Learning from Demonstration: save state before action
        const prevState = [this.agent.x, this.agent.y, this.agent.hp];

        const result = this.agent.move(action, this.grid);
        this.steps++;

        // M4 environment modifiers (daily-only):
        // - poison_floor: HP -1 when stepping onto an EMPTY tile.
        // - acid_rain: HP -3 every Nth step.
        if (!this.isTraining && this.activeModifierSet && result.success && !result.done) {
            const tileNow = this.grid.getTile(this.agent.x, this.agent.y);
            const poison = (tileNow === TileType.EMPTY) ? this.activeModifierSet.poisonStepDamage() : 0;
            const acid = this.activeModifierSet.acidRainDamage(this.steps);
            const totalDmg = poison + acid;
            if (totalDmg > 0) {
                this.agent.hp -= totalDmg;
                if (this.agent.hp <= 0) {
                    this.agent.hp = 0;
                    result.done = true;
                }
            }
        }

        // C-5: Defense contract — recover half damage from monster/trap
        if (!this.isTraining && this.activeDefenseContract && result.success) {
            if (result.tile === TileType.MONSTER) {
                this.agent.hp = Math.min(this.agent.hp + 15, this.agent.maxHp);
            } else if (result.tile === TileType.TRAP) {
                this.agent.hp = Math.min(this.agent.hp + 5, this.agent.maxHp);
            }
        }
        // C-5: Trap nullify — recover full trap damage
        if (!this.isTraining && this.activeTrapNullify && result.success && result.tile === TileType.TRAP) {
            this.agent.hp = Math.min(this.agent.hp + 10, this.agent.maxHp);
        }

        // C-4: Treasure pickup (manual play, on move success)
        if (!this.isTraining && result.success && !result.done && this.treasurePosition) {
            if (this.agent.x === this.treasurePosition.x && this.agent.y === this.treasurePosition.y && !this.carryingTreasure) {
                this.carryingTreasure = true;
                this.showMessage(`Found treasure! Reach the exit to collect it.`, 'success');
                this.renderer.flash('rgba(251, 191, 36, 0.4)');
            }
        }

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
                    // C-5: Escape rope — prevent pit death
                    if (this.runState.hasItem('escape_rope')) {
                        this.runState.useItem('escape_rope');
                        if (this.carryingTreasure) {
                            const val = this.runState.collectTreasure(this.currentDungeon);
                            this.carryingTreasure = false;
                            this.showMessage(`Emergency escape from pit! Rope consumed. Treasure +${val}G!`, 'warning');
                        } else {
                            this.showMessage('Emergency escape from pit! Rope consumed.', 'warning');
                        }
                        this.updateUI(); this.updateItemUI(); this.render();
                        return;
                    }
                    // C-4: Treasure fail on death
                    if (this.carryingTreasure) {
                        this.runState.failTreasure(this.currentDungeon);
                        this.carryingTreasure = false;
                    }
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
                    // C-5: Escape rope — prevent HP death
                    if (this.runState.hasItem('escape_rope')) {
                        this.runState.useItem('escape_rope');
                        if (this.carryingTreasure) {
                            const val = this.runState.collectTreasure(this.currentDungeon);
                            this.carryingTreasure = false;
                            this.showMessage(`Emergency escape! Rope consumed. Treasure +${val}G!`, 'warning');
                        } else {
                            this.showMessage('Emergency escape! Rope consumed.', 'warning');
                        }
                        this.updateUI(); this.updateItemUI(); this.render();
                        return;
                    }
                    // C-4: Treasure fail on death
                    if (this.carryingTreasure) {
                        this.runState.failTreasure(this.currentDungeon);
                        this.carryingTreasure = false;
                    }
                    this.triggerGameOver('HP reached 0! The party leader has fallen.');
                } else {
                    this.showMessage(`DIED! Steps: ${this.steps}${lostMsg}`, 'danger');
                }
                this.renderer.flash('rgba(239, 68, 68, 0.5)');
            }
        } else if (!result.success) {
            sound.bump();
            this.showMessage(t('game.bump_toast'), 'warning', { dedupe: true, duration: 1000 });
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
            } else if (isBuiltIn) {
                this.runState.gold += 5;
                this.showMessage(`MONSTER! HP -30, Defeated! +5G`, 'warning');
            } else {
                // T2B-1: daily / custom — no campaign gold, just kill
                this.showMessage(`MONSTER! HP -30, Defeated!`, 'warning');
            }
            this.renderer.flash('rgba(147, 51, 234, 0.4)');
        } else {
            sound.move();
        }

        this.updateUI();
        this.render();
    }

    handleVictory() {
        // T2B-1: Daily challenge — record + intro panel, no campaign rewards
        if (this.isDailyDungeon(this.currentDungeon)) {
            this.handleDailyVictory();
            this.updateUI();
            return;
        }

        // Custom/preset dungeons: no economy impact (except pending gold)
        if (!this.isBuiltInDungeon(this.currentDungeon)) {
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

        // C-1: Record serpa clear
        this.runState.recordSerpaClear(this.currentCharacter);

        // C-4: Collect treasure on victory
        let treasureMsg = '';
        if (this.carryingTreasure) {
            const val = this.runState.collectTreasure(this.currentDungeon);
            this.carryingTreasure = false;
            if (val > 0) treasureMsg = ` Treasure +${val}G!`;
        }

        // B-2: Record answer path from manual play
        if (this.agent && this.agent.actionHistory.length > 0) {
            this.runState.recordAnswerPath(
                this.currentDungeon,
                this.agent.actionHistory,
                this.agent.actionHistory.length,
                this.currentCharacter
            );
        }

        const config = DUNGEON_CONFIG[this.currentDungeon];
        const isFirstClear = !this.runState.clearedDungeons.has(this.currentDungeon);

        let unlockedNext = false;

        if (isFirstClear) {
            this.runState.clearedDungeons.add(this.currentDungeon);

            // First clear reward
            const firstReward = config.firstReward || 0;
            if (firstReward > 0) {
                this.runState.gold += firstReward;
            }

            // Unlock next dungeon
            const currentIndex = DUNGEON_ORDER.indexOf(this.currentDungeon);
            if (currentIndex >= 0 && currentIndex < DUNGEON_ORDER.length - 1) {
                const nextDungeon = DUNGEON_ORDER[currentIndex + 1];
                if (!this.runState.unlockedDungeons.has(nextDungeon)) {
                    this.runState.unlockedDungeons.add(nextDungeon);
                    unlockedNext = true;
                }

                // C-2: Detect chapter change
                const prevCh = this.runState.getChapterForDungeon(this.currentDungeon);
                const nextCh = this.runState.getChapterForDungeon(nextDungeon);
                if (nextCh > prevCh) {
                    this.newChapterInfo = this.runState.getChapterConfig(nextCh);
                }
            }

            this.updateDungeonSelect();
            this.updateCharacterGrid();
            this.updateProgressiveDisclosure();

            // Task #5: tutorial/toast chain sequenced after map choice (was 5-message explosion)
            this._pendingFirstClearTutorials = true;

            // C-3: Ending — all dungeons cleared?
            if (this.runState.isAllDungeonsCleared()) {
                sound.victory();
                this.renderer.flash('rgba(34, 197, 94, 0.4)');
                this.showEndingOverlay();
                return;
            }

            // B-5: Show map choice overlay on first clear
            sound.victory();
            this.renderer.flash('rgba(34, 197, 94, 0.4)');
            this.showMapChoiceOverlay(this.currentDungeon, config, unlockedNext);
        } else {
            sound.victory();
            const reward = config.repeatReward;
            this.runState.gold += reward;
            this.showMessage(`CLEAR! +${reward}G (Steps: ${this.steps})${treasureMsg}`, 'success');
            this.saveProgress();
            this.renderer.flash('rgba(34, 197, 94, 0.4)');
        }

        this.updateUI();
        this.updateItemUI();
    }

    // B-5: Map choice overlay (sell vs keep map)
    showMapChoiceOverlay(dungeonId, config, unlockedNext) {
        const overlay = document.getElementById('map-choice-overlay');
        const salePrice = this.runState.getMapSalePrice(dungeonId, DUNGEON_CONFIG);
        const levelMatch = dungeonId.match(/level_(\d+)/);
        const level = levelMatch ? parseInt(levelMatch[1]) : 1;
        const exclusiveRuns = this.runState.getExclusiveRuns(level);
        const exclusiveReward = 3 * config.repeatReward;
        const dungeonName = this.getDungeonDisplayName(dungeonId);

        let unlockMsg = '';
        if (unlockedNext) {
            const nextName = this.getDungeonDisplayName(DUNGEON_ORDER[DUNGEON_ORDER.indexOf(dungeonId) + 1]);
            unlockMsg = `<div class="map-unlock-msg">${nextName} Unlocked!</div>`;
        }
        // C-2: Chapter join message
        if (this.newChapterInfo) {
            const names = this.newChapterInfo.storySerpas.map(s => CHARACTERS[s]?.name || s).join(', ');
            unlockMsg += `<div class="chapter-join-msg">Ch.${this.newChapterInfo.chapter} "${this.newChapterInfo.name}": ${names} joined!</div>`;
            this.newChapterInfo = null;
        }

        document.getElementById('map-choice-dungeon').textContent = `${dungeonName} (Lv.${level})`;
        document.getElementById('map-choice-details').innerHTML =
            `${unlockMsg}` +
            `<div>Sell: +${salePrice}G (instant)</div>` +
            `<div>Keep: ${exclusiveReward}G/farm x ${exclusiveRuns} runs (exclusive)</div>`;

        document.getElementById('btn-sell-map').onclick = () => {
            const earned = this.runState.sellMap(dungeonId, DUNGEON_CONFIG);
            overlay.style.display = 'none';
            this.showMessage(`FIRST CLEAR! Map sold for ${earned}G!`, 'success');
            this.saveProgress();
            this.updateUI();
            this.updateFarmingUI();
            this.updateItemUI();
            if (this._pendingFirstClearTutorials) {
                this._pendingFirstClearTutorials = false;
                this._queueFirstClearTutorials();
            }
        };

        document.getElementById('btn-keep-map').onclick = () => {
            this.runState.keepMap(dungeonId);
            overlay.style.display = 'none';
            this.showMessage(`FIRST CLEAR! Map kept! Exclusive farming: ${exclusiveReward}G x ${exclusiveRuns} runs`, 'success');
            this.saveProgress();
            this.updateUI();
            this.updateFarmingUI();
            this.updateItemUI();
            if (this._pendingFirstClearTutorials) {
                this._pendingFirstClearTutorials = false;
                this._queueFirstClearTutorials();
            }
        };

        overlay.style.display = 'flex';
    }

    // ========== First Clear Tutorial Chain (Task #5: sequenced) ==========

    _queueFirstClearTutorials() {
        // Sequenced after map choice — was 5-message explosion (2차 sonnet P0)
        setTimeout(() => this.tutorial.tryShow('first_clear'), 400);
        setTimeout(() => {
            if (this.runState.clearedDungeons.size === 1 && this.toast) {
                this.toast.show(t('tutorial.train_now'), 'info');
            }
        }, 2200);
        setTimeout(() => {
            const curChapter = this.runState.getCurrentChapter();
            if (curChapter >= 2) this.tutorial.tryShow('chapter2');
            if (this.runState.clearedDungeons.size >= 1) this.tutorial.tryShow('first_farm_unlock');
        }, 4000);
    }

    // ========== Game Over & New Run ==========

    triggerGameOver(cause) {
        // T2B-1: Daily mode — never touch campaign run state
        if (this.isDailyDungeon(this.currentDungeon)) {
            this.handleDailyGameOver(cause);
            return;
        }

        // B-203: cumulative death limit (D-4 verdict — tension mechanism).
        // recordDeath returns true once deathCount ≥ DEATH_LIMIT.
        const reachedDeathLimit = this.runState.recordDeath();
        // C-4: Treasure fail on game over
        if (this.carryingTreasure) {
            this.runState.failTreasure(this.currentDungeon);
            this.carryingTreasure = false;
        }
        this.isGameOver = true;
        this.done = true;
        this.deathLimitReached = reachedDeathLimit;

        // Save meta (totalSteps) before showing overlay
        this.runState.saveMeta();

        // Show overlay
        const deathLine = reachedDeathLimit
            ? t('game_over.death_limit_suffix', { cur: this.runState.deathCount, max: DEATH_LIMIT })
            : '';
        this.gameOverCause.textContent = cause + deathLine;
        this.gameOverStats.innerHTML = [
            `Run #${this.runState.runNumber}`,
            `Gold: ${this.runState.gold}G`,
            `Cleared: ${this.runState.clearedDungeons.size} dungeons`,
            `Deaths: ${this.runState.deathCount}/${DEATH_LIMIT}`,
            `Steps this run: ${this.steps}`
        ].join('<br>');

        this.gameOverOverlay.style.display = 'flex';
        sound.death();
    }

    startNewRun() {
        // Entry from game-over overlay AND from the guild menu "새 런" button.
        // deathLimitReached is only true when triggered by game-over after limit hit;
        // manual guild "새 런" always takes the normal startNewRun branch below.
        this.isGameOver = false;
        this.gameOverOverlay.style.display = 'none';

        // B-203: death-limit branch — fresh playthrough instead of incremented run.
        if (this.deathLimitReached) {
            this.runState.resetForDeathLimit();
            this.deathLimitReached = false;
        } else {
            this.runState.startNewRun();
        }
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
            this.characterDesc.textContent = t('character.desc.qkun');
        }

        this.loadDungeon('level_01_easy');
        this.dungeonSelect.value = 'level_01_easy';
        this.updateFarmingUI();
        this.updateStatsUI();
        this.updateHintUI();
        this.updateItemUI();
        this.showMessage(`Run #${this.runState.runNumber} started! Gold: ${this.runState.gold}G`, 'info');
    }

    // ========== Training System ==========

    startTraining() {
        if (this.isTraining) return;
        if (this.isGameOver) return;

        // B-4: Block if character is farming
        if (this.runState.isFarming(this.currentCharacter)) {
            this.showMessage(`${CHARACTERS[this.currentCharacter].name} is farming! Unassign first.`, 'warning');
            return;
        }

        // B-1: Check gold for operating cost (built-in dungeons only)
        if (this.isBuiltInDungeon(this.currentDungeon)) {
            const opCost = this.getOperatingCost(this.currentCharacter, this.currentDungeon);
            if (this.runState.gold < opCost) {
                this.showMessage(`Not enough gold! Need ${opCost}G/episode`, 'danger');
                return;
            }
        }

        this.isTraining = true;
        this.startTrainBtn.disabled = true;
        this.stopTrainBtn.disabled = false;
        this.trainProgress.style.display = 'block';
        this.trainingMode = this.trainModeSelect.value;

        // Disable fog of war during training
        this.renderer.fogOfWar = false;

        // B-3: Apply agility multiplier to epsilon decay
        // Higher agility → faster convergence: decay^agilityMul (e.g. 0.995^1.5 ≈ 0.9925)
        const agilityMul = this.runState.getAgilityMultiplier(this.currentCharacter);
        const epsilonDecay = Math.pow(0.995, agilityMul);

        // Reset algorithm with fresh parameters (based on character)
        const config = DUNGEON_CONFIG[this.currentDungeon] || {};
        this.qlearning = this.createAlgorithm(config, {
            alpha: 0.1,
            gamma: 0.99,
            epsilon: 1.0,
            epsilonMin: 0.01,
            epsilonDecay
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

        // Create training agent at start position (B-3: apply maxHp from character stats)
        const startPos = this.grid.startPos;
        const maxHp = this.runState.getMaxHp(this.currentCharacter);
        this.trainingAgent = new Agent(startPos.x, startPos.y, maxHp, maxHp);
        this.trainingTotalReward = 0;
        this.trainingSteps = 0;

        this.agent = this.trainingAgent;
        this.renderer.setAgent(this.agent);
        this.steps = 0;
        this.done = false;

        // C-4: Reset treasure state for visual training episode
        this.carryingTreasure = false;

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

        // C-4: Treasure pickup during visual training
        if (result.success && !result.done && this.treasurePosition) {
            if (agent.x === this.treasurePosition.x && agent.y === this.treasurePosition.y && !this.carryingTreasure) {
                this.carryingTreasure = true;
            }
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
        // C-4: Treasure collect/fail on visual episode end
        if (this.carryingTreasure && this.isBuiltInDungeon(this.currentDungeon)) {
            if (success) {
                this.runState.collectTreasure(this.currentDungeon);
            } else {
                this.runState.failTreasure(this.currentDungeon);
            }
            this.carryingTreasure = false;
        }

        // B-2: Record answer path from visual training success
        if (success && this.trainingAgent && this.isBuiltInDungeon(this.currentDungeon)) {
            this.runState.recordAnswerPath(
                this.currentDungeon,
                this.trainingAgent.actionHistory,
                this.trainingAgent.actionHistory.length,
                this.currentCharacter
            );
        }

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

        // B-1: Deduct operating cost per episode
        if (this.isBuiltInDungeon(this.currentDungeon)) {
            const opCost = this.getOperatingCost(this.currentCharacter, this.currentDungeon);
            this.runState.gold -= opCost;
            this.saveProgress();
        }

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
            this.finishTraining(t('training.finish.max_episodes', { max: MAX_EPISODES, rate: clearRate }));
            return;
        }

        if (this.trainingMode === 'until_success' &&
            this.recentResults.length >= CONVERGENCE_WINDOW &&
            successCount / this.recentResults.length >= CONVERGENCE_THRESHOLD) {
            this.finishTraining(t('training.finish.converged', { rate: clearRate, episode: this.trainingEpisode }));
            return;
        }

        // B-1: Check gold for next episode
        if (this.isBuiltInDungeon(this.currentDungeon)) {
            const nextCost = this.getOperatingCost(this.currentCharacter, this.currentDungeon);
            if (this.runState.gold < nextCost) {
                this.finishTraining(t('training.finish.out_of_gold', { cost: nextCost, rate: clearRate }));
                return;
            }
        }

        this.beginVisualEpisode();
    }

    // Instant training: no visualization, fast execution
    async startInstantTraining() {
        const charDef = CHARACTERS[this.currentCharacter];
        this.showMessage(t('training.start.instant', { name: charDef ? charDef.name : this.currentCharacter }), 'info');

        const batchSize = 10;
        const isBuiltIn = this.isBuiltInDungeon(this.currentDungeon);
        const opCost = isBuiltIn ? this.getOperatingCost(this.currentCharacter, this.currentDungeon) : 0;
        let running = true;

        while (running && this.isTraining && this.trainingEpisode < MAX_EPISODES) {
            for (let i = 0; i < batchSize && this.isTraining && this.trainingEpisode < MAX_EPISODES; i++) {
                // B-1: Check gold before each episode
                if (isBuiltIn && this.runState.gold < opCost) {
                    const successCount = this.recentResults.filter(r => r).length;
                    const clearRate = this.recentResults.length > 0
                        ? (successCount / this.recentResults.length * 100).toFixed(0)
                        : 0;
                    this.finishTraining(t('training.finish.out_of_gold', { cost: opCost, rate: clearRate }));
                    running = false;
                    break;
                }

                const result = this.qlearning.runEpisode();
                this.runState.totalSteps += (result.steps || 0);

                // B-1: Deduct operating cost
                if (isBuiltIn) {
                    this.runState.gold -= opCost;
                }

                this.trainingEpisode++;
                this.recentResults.push(result.success);
                if (this.recentResults.length > CONVERGENCE_WINDOW) {
                    this.recentResults.shift();
                }
            }

            if (!running) break;

            const successCount = this.recentResults.filter(r => r).length;
            const clearRate = this.recentResults.length > 0
                ? (successCount / this.recentResults.length * 100).toFixed(0)
                : 0;

            this.updateTrainingUI(clearRate);

            if (this.trainingMode === 'until_success' &&
                this.recentResults.length >= CONVERGENCE_WINDOW &&
                successCount / this.recentResults.length >= CONVERGENCE_THRESHOLD) {
                this.finishTraining(t('training.finish.converged', { rate: clearRate, episode: this.trainingEpisode }));
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
            this.finishTraining(t('training.finish.max_episodes', { max: MAX_EPISODES, rate: clearRate }));
        }
    }

    updateTrainingUI(clearRate) {
        const epsilon = this.qlearning.epsilon;
        const charDef = CHARACTERS[this.currentCharacter];
        const charLabel = charDef ? charDef.name : this.currentCharacter;
        // B-1: Show operating cost in training stats
        let costInfo = '';
        if (this.isBuiltInDungeon(this.currentDungeon)) {
            const opCost = this.getOperatingCost(this.currentCharacter, this.currentDungeon);
            costInfo = ` | Cost: ${opCost}G/ep | Gold: ${this.runState.gold}G`;
        }
        this.trainStats.innerHTML =
            `[${charLabel}] Episode: ${this.trainingEpisode} | Clear: ${clearRate}% | ε: ${epsilon.toFixed(2)}${costInfo}`;

        const percent = Math.min(100, (this.trainingEpisode / MAX_EPISODES) * 100);
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent =
            `${this.trainingEpisode} ep (ε=${epsilon.toFixed(2)})`;

        // B-106: live sparkline of last-N episode success rate
        this.renderSparkline();
    }

    // B-106: sliding-window success-rate sparkline (D-4 근거 4 — RL 양념의 시각 시그니처)
    renderSparkline() {
        const canvas = document.getElementById('sparkline-canvas');
        const valueEl = document.getElementById('sparkline-value');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const results = this.recentResults || [];
        if (results.length === 0) {
            if (valueEl) valueEl.textContent = '—';
            // dashed baseline placeholder
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(2, h / 2);
            ctx.lineTo(w - 2, h / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }

        const W = 20;
        const points = [];
        let sum = 0;
        for (let i = 0; i < results.length; i++) {
            sum += results[i] ? 1 : 0;
            if (i >= W) sum -= results[i - W] ? 1 : 0;
            const denom = Math.min(i + 1, W);
            points.push(sum / denom);
        }

        const lastVal = points[points.length - 1];
        if (valueEl) valueEl.textContent = `${Math.round(lastVal * 100)}%`;

        // Plot polyline
        const pad = 2;
        const usableW = w - pad * 2;
        const usableH = h - pad * 2;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = lastVal >= 0.7 ? '#4ade80'
                        : lastVal >= 0.3 ? '#fbbf24'
                        : '#ef4444';
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const x = pad + (points.length === 1 ? 0 : (i / (points.length - 1)) * usableW);
            const y = pad + (1 - points[i]) * usableH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Last point dot
        const lastX = pad + usableW;
        const lastY = pad + (1 - lastVal) * usableH;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
        ctx.fill();
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
        this.saveProgress();

        // B-2: Reconstruct answer path after training
        this.reconstructAnswerPath();

        this.renderer.fogOfWar = this.fogOfWarCheck.checked;
        this.reset();
        this.updateVisualization();
        this.updateFarmingUI();

        this.showMessage(message, 'success');

        // Step 6: Tutorial trigger on first training
        this.tutorial.tryShow('first_train');
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

        this.finishTraining(t('training.finish.stopped', { episode: this.trainingEpisode, rate: clearRate }));
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

    // ========== B-4: Farming UI ==========

    updateFarmingUI() {
        const container = document.getElementById('farming-list');
        if (!container) return;

        container.innerHTML = '';

        // Show dungeons that have answer paths
        const dungeonIds = Object.keys(this.runState.answerPaths);
        if (dungeonIds.length === 0) {
            container.innerHTML = '<div class="farming-empty">No answer paths recorded yet. Clear dungeons first!</div>';
            return;
        }

        for (const dungeonId of dungeonIds) {
            const path = this.runState.answerPaths[dungeonId];
            const config = DUNGEON_CONFIG[dungeonId];
            if (!config) continue;

            const mapInfo = this.runState.getMapStatus(dungeonId);
            const isExclusive = mapInfo && mapInfo.status === 'exclusive' && mapInfo.exclusiveRunsLeft > 0;
            const reward = isExclusive ? 3 * config.repeatReward : config.repeatReward;
            const exclusiveTag = isExclusive ? ` [Exclusive x${mapInfo.exclusiveRunsLeft}]` : '';
            const dungeonName = this.getDungeonDisplayName(dungeonId);
            const level = this.getDungeonLevel(dungeonId);

            // Find who is farming this dungeon
            const assignedChar = Object.entries(this.runState.farmingAssignments)
                .find(([_, did]) => did === dungeonId)?.[0] || null;

            const row = document.createElement('div');
            row.className = 'farming-row';

            // Build character options for dropdown
            const availableChars = Object.keys(CHARACTERS).filter(name => {
                if (this.runState.isCharacterHidden(name)) return false;
                if (!this.runState.isCharacterAvailable(name)) return false;
                if (this.runState.isFarming(name) && this.runState.getFarmingDungeon(name) !== dungeonId) return false;
                return true;
            });

            let charSelect = `<select class="farming-char-select" data-dungeon="${dungeonId}">`;
            charSelect += `<option value="">-- assign --</option>`;
            for (const cn of availableChars) {
                const charDef = CHARACTERS[cn];
                const canF = this.runState.canFarm(cn, dungeonId, DUNGEON_CONFIG);
                const str = this.runState.getStrength(cn);
                const selected = (assignedChar === cn) ? ' selected' : '';
                const disabled = (!canF && assignedChar !== cn) ? ' disabled' : '';
                charSelect += `<option value="${cn}"${selected}${disabled}>${charDef.name} (Str:${str})</option>`;
            }
            charSelect += `</select>`;

            row.innerHTML = `
                <div class="farming-info">
                    <span class="farming-dungeon">Lv.${level} ${dungeonName}</span>
                    <span class="farming-steps">[${path.steps} steps]${exclusiveTag}</span>
                </div>
                <div class="farming-controls">
                    ${charSelect}
                    <button class="btn-small btn-farm" data-dungeon="${dungeonId}" ${!assignedChar ? 'disabled' : ''}>Farm +${reward}G</button>
                    ${assignedChar ? `<button class="btn-small btn-unassign" data-char="${assignedChar}">X</button>` : ''}
                </div>
            `;

            container.appendChild(row);
        }

        // Wire events
        container.querySelectorAll('.farming-char-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const dungeonId = e.target.dataset.dungeon;
                const charName = e.target.value;

                // Remove old assignment for this dungeon
                const oldChar = Object.entries(this.runState.farmingAssignments)
                    .find(([_, did]) => did === dungeonId)?.[0];
                if (oldChar) this.runState.removeFarming(oldChar);

                if (charName) {
                    this.runState.assignFarming(charName, dungeonId, DUNGEON_CONFIG);
                }
                this.updateFarmingUI();
                this.updateCharacterGrid();
            });
        });

        container.querySelectorAll('.btn-farm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dungeonId = e.target.dataset.dungeon;
                const assignedChar = Object.entries(this.runState.farmingAssignments)
                    .find(([_, did]) => did === dungeonId)?.[0];
                if (!assignedChar) return;

                const result = this.runState.executeFarming(assignedChar, DUNGEON_CONFIG);
                if (result.gold > 0) {
                    const charDef = CHARACTERS[assignedChar];
                    let msg = `${charDef.name} farmed +${result.gold}G!`;
                    if (result.message === 'exclusive_expired') {
                        msg += ' Map leaked to market!';
                    }
                    this.showMessage(msg, 'success');
                }
                this.updateUI();
                this.updateFarmingUI();
                this.updateItemUI();
            });
        });

        container.querySelectorAll('.btn-unassign').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const charName = e.target.dataset.char;
                this.runState.removeFarming(charName);
                this.updateFarmingUI();
                this.updateCharacterGrid();
            });
        });
    }

    // ========== B-3: Character Stats UI ==========

    updateStatsUI() {
        const container = document.getElementById('stats-section');
        if (!container) return;

        const list = container.querySelector('.stats-list');
        if (!list) return;
        list.innerHTML = '';

        const availableChars = Object.keys(CHARACTERS).filter(name => {
            if (this.runState.isCharacterHidden(name)) return false;
            if (!this.runState.isCharacterAvailable(name)) return false;
            return true;
        });

        for (const name of availableChars) {
            const charDef = CHARACTERS[name];
            const stats = CHARACTER_STATS[name];
            if (!stats) continue;

            const level = this.runState.getCharacterLevel(name);
            const str = this.runState.getStrength(name);
            const maxHp = this.runState.getMaxHp(name);
            const canUpgrade = this.runState.canUpgradeCharacter(name);
            const atMax = level >= 3;
            const isFarming = this.runState.isFarming(name);

            let secondaryText = '';
            if (stats.secondary === 'hp') {
                secondaryText = ` | HP: ${maxHp}`;
            } else if (stats.secondary === 'agility') {
                const mul = this.runState.getAgilityMultiplier(name);
                secondaryText = ` | Agility: x${mul.toFixed(1)}`;
            }

            const farmTag = isFarming ? ' <span class="farming-tag">[Farming]</span>' : '';

            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `
                <span class="stat-char-name">[${charDef.name}] Lv.${level}</span>
                <span class="stat-char-details">Str: ${str}${secondaryText}${farmTag}</span>
                ${atMax
                    ? '<span class="stat-max">MAX</span>'
                    : `<button class="btn-small btn-upgrade" data-char="${name}" ${canUpgrade ? '' : 'disabled'}>Upgrade ${stats.cost}G</button>`
                }
            `;
            list.appendChild(row);
        }

        // Wire upgrade buttons
        list.querySelectorAll('.btn-upgrade').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const charName = e.target.dataset.char;
                if (this.runState.upgradeCharacter(charName)) {
                    const charDef = CHARACTERS[charName];
                    const newLevel = this.runState.getCharacterLevel(charName);
                    this.showMessage(`${charDef.name} upgraded to Lv.${newLevel}!`, 'success');
                    this.updateStatsUI();
                    this.updateUI();
                    this.updateFarmingUI();
                }
            });
        });
    }

    // ========== B-6: Hint UI ==========

    updateHintUI() {
        const container = document.getElementById('hint-area');
        if (!container) return;

        const dungeonId = this.currentDungeon;
        const hints = DUNGEON_HINTS[dungeonId];

        if (!hints || !this.isBuiltInDungeon(dungeonId)) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = '';
        container.innerHTML = '';

        for (let i = 0; i < hints.length; i++) {
            const hint = hints[i];
            const purchased = this.runState.hasHint(dungeonId, i);

            const row = document.createElement('div');
            row.className = 'hint-row';

            if (purchased) {
                // W17: hint.text → t(hint.key) (DUNGEON_HINTS schema 변경). onLangChange 시 updateHintUI 재호출로 갱신
                row.innerHTML = `<span class="hint-text">"${t(hint.key)}"</span>`;
            } else {
                row.innerHTML = `
                    <button class="btn-small btn-hint" data-dungeon="${dungeonId}" data-index="${i}" data-cost="${hint.cost}"
                        ${this.runState.gold < hint.cost ? 'disabled' : ''}>
                        ${hint.cost}G
                    </button>
                    <span class="hint-hidden">???</span>
                `;
            }
            container.appendChild(row);
        }

        // Wire hint purchase
        container.querySelectorAll('.btn-hint').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dId = e.target.dataset.dungeon;
                const idx = parseInt(e.target.dataset.index);
                const cost = parseInt(e.target.dataset.cost);
                if (this.runState.purchaseHint(dId, idx, cost)) {
                    this.updateHintUI();
                    this.updateUI();
                    this.showMessage(t('hint.purchased', { cost }), 'success');
                }
            });
        });
    }

    // ========== C-3: Ending + NG+ ==========

    showEndingOverlay() {
        const stats = this.runState.getEndingStats();
        const statsEl = document.getElementById('ending-stats');
        const mvp = stats.mostActiveSerpa;
        const mvpName = mvp ? (CHARACTERS[mvp.name]?.name || mvp.name) : '-';
        const ngLabel = stats.ngPlusCount > 0 ? ` (NG+${stats.ngPlusCount})` : '';
        const bestLabel = stats.bestTotalSteps !== null ? `Best: ${stats.bestTotalSteps} steps` : '';

        statsEl.innerHTML = [
            `Run #${stats.runNumber}${ngLabel}`,
            `Total Steps: ${stats.totalSteps}`,
            `Deaths: ${stats.deathCount}`,
            `Serpas Used: ${stats.usedSerpaCount}`,
            `MVP: ${mvpName}${mvp ? ` (${mvp.clears} clears)` : ''}`,
            `Farming Steps: ${stats.totalFarmingSteps}`,
            bestLabel,
        ].filter(Boolean).join('<br>');

        document.getElementById('ending-overlay').style.display = 'flex';
    }

    startNewGamePlus() {
        document.getElementById('ending-overlay').style.display = 'none';
        this.runState.startNewGamePlus();

        this.isGameOver = false;
        this.updateCharacterGrid();
        this.updateDungeonSelect();
        this.loadCustomDungeonOptions();
        this.updateUI();

        if (!this.runState.isCharacterAvailable(this.currentCharacter)) {
            this.currentCharacter = 'qkun';
            document.querySelectorAll('.char-card').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.char === 'qkun');
            });
            this.characterDesc.textContent = t('character.desc.qkun');
        }

        this.loadDungeon('level_01_easy');
        this.dungeonSelect.value = 'level_01_easy';
        this.updateFarmingUI();
        this.updateStatsUI();
        this.updateHintUI();
        this.updateItemUI();
        this.showMessage(t('ngplus.entered', { n: this.runState.ngPlusCount, gold: this.runState.gold }), 'success');
    }

    // ========== C-4: Treasure System ==========

    computeTreasurePosition(dungeonId) {
        if (!this.isBuiltInDungeon(dungeonId)) {
            this.treasurePosition = null;
            this.renderer.treasurePosition = null;
            return;
        }
        if (!this.runState.hasDungeonTreasure(dungeonId)) {
            this.treasurePosition = null;
            this.renderer.treasurePosition = null;
            return;
        }

        // Scan for EMPTY tiles to place treasure deterministically
        const emptyTiles = [];
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                if (this.grid.getTile(x, y) === TileType.EMPTY) {
                    emptyTiles.push({ x, y });
                }
            }
        }
        if (emptyTiles.length === 0) {
            this.treasurePosition = null;
            this.renderer.treasurePosition = null;
            return;
        }

        const failCount = this.runState.getTreasureFailCount(dungeonId);
        const idx = failCount % emptyTiles.length;
        this.treasurePosition = emptyTiles[idx];
        this.renderer.treasurePosition = this.treasurePosition;
    }

    // ========== C-5: Item UI ==========

    updateItemUI() {
        const display = document.getElementById('inventory-display');
        if (!display) return;

        const items = ['escape_rope', 'defense_contract', 'trap_nullify'];
        const counts = items.map(id => ({ id, count: this.runState.getItemCount(id), info: ITEMS[id] }));
        const hasAny = counts.some(c => c.count > 0);

        if (!hasAny) {
            display.textContent = '';
        } else {
            display.innerHTML = counts
                .filter(c => c.count > 0)
                .map(c => `<span class="inventory-item">${c.info.name} x${c.count}</span>`)
                .join(' | ');
        }

        // Active contracts display
        const activeItems = [];
        if (this.activeDefenseContract) activeItems.push('Defense Active');
        if (this.activeTrapNullify) activeItems.push('Anti-Trap Active');
        if (activeItems.length > 0) {
            display.innerHTML += (hasAny ? '<br>' : '') + `<span class="active-contract">${activeItems.join(' | ')}</span>`;
        }

        // Update buy buttons disabled state
        document.querySelectorAll('.btn-buy-item').forEach(btn => {
            const itemId = btn.dataset.item;
            const item = ITEMS[itemId];
            btn.disabled = this.runState.gold < item.cost;
        });
    }

    // F1: 식량 변화 floating 표시 — 매 스텝 -2 가시화 (사용자 보고: 줄어드는 게 안 보임)
    _flashFoodDelta(delta) {
        if (!this.foodStat || this.foodStat.style.display === 'none') return;
        const tag = document.createElement('span');
        tag.className = 'food-delta' + (delta < 0 ? ' food-delta-down' : ' food-delta-up');
        tag.textContent = (delta > 0 ? '+' : '') + delta;
        this.foodStat.appendChild(tag);
        // CSS animation 후 자동 제거 (1초)
        setTimeout(() => tag.remove(), 1000);
    }

    updateUI() {
        this.goldText.textContent = this.pendingGold > 0
            ? `${this.runState.gold} (+${this.pendingGold})`
            : this.runState.gold;

        // Run number
        this.runText.textContent = `#${this.runState.runNumber}`;

        // Food display (show only during manual play on built-in dungeons)
        const isBuiltIn = this.isBuiltInDungeon(this.currentDungeon);
        const showFood = isBuiltIn && !this.isTraining;
        this.foodStat.style.display = showFood ? '' : 'none';
        this.foodText.textContent = this.runState.food;
        // F2: 임계 경고 색 (food < 20 빨강 = 위험, < 50 노랑 = 주의)
        this.foodText.classList.toggle('food-critical', this.runState.food < 20);
        this.foodText.classList.toggle('food-low', this.runState.food >= 20 && this.runState.food < 50);

        // Provisions section visibility
        if (this.provisionsSection) {
            this.provisionsSection.style.display = (isBuiltIn && this.currentMode === 'play') ? '' : 'none';
        }

        // Step 2: Gold flash warning
        const goldEl = this.goldText;
        if (goldEl) {
            goldEl.classList.toggle('gold-flash', this.runState.gold < 50);
        }

        // Step 2: Food warning banner (only show when mid-dungeon, not at start)
        if (this.foodWarning) {
            const showFoodWarn = isBuiltIn && !this.isTraining && this.runState.food === 0 && !this.done && this.steps > 0;
            this.foodWarning.style.display = showFoodWarn ? '' : 'none';
        }

        if (!this.agent) return;

        const hpPercent = (this.agent.hp / this.agent.maxHp) * 100;
        this.hpFill.style.width = `${hpPercent}%`;
        this.hpText.textContent = `${this.agent.hp}/${this.agent.maxHp}`;
        this.stepsText.textContent = this.steps;

        // Step 2: HP color classes
        const hpBar = this.hpFill.parentElement;
        hpBar.classList.remove('hp-high', 'hp-medium', 'hp-low', 'hp-critical');
        if (hpPercent > 60) hpBar.classList.add('hp-high');
        else if (hpPercent > 30) hpBar.classList.add('hp-medium');
        else if (hpPercent > 15) hpBar.classList.add('hp-low');
        else hpBar.classList.add('hp-critical');

        const reward = this.agent.totalReward;
        this.rewardText.textContent = reward.toFixed(1);
        this.rewardText.style.color = reward >= 0 ? '#4ade80' : '#ef4444';
    }

    showMessage(text, type = 'info', options = {}) {
        this.messageEl.textContent = text;
        this.messageEl.className = 'message ' + type;

        // Step 1: Toast (skip during instant training to avoid spam)
        if (this.toast && !(this.isTraining && this.trainingSpeed === 0)) {
            const toastType = type === 'danger' ? 'damage' : type;
            this.toast.show(text, toastType, options.duration ?? 3000, options.dedupe ?? false);
        }
    }

    // Step 6: Progressive disclosure — show/hide sections based on progress
    // B-004 (Step-0): On first entry (no clears) only Character + Dungeon + Reset + Legend
    // are visible. Everything else unfolds together on the first dungeon clear.
    updateProgressiveDisclosure() {
        const chapter = this.runState.getCurrentChapter();
        const hasAnyCleared = this.runState.clearedDungeons.size > 0;

        // B-004: sections gated behind first clear
        const firstClearGated = [
            'provisions-section',
            'farming-section',
            'training-section',
            'gamemode-section',
            'visualization-section',
            'controls-section',
        ];
        for (const id of firstClearGated) {
            const el = document.getElementById(id);
            if (!el) continue;
            const wasHidden = el.classList.contains('section-hidden');
            el.classList.toggle('section-hidden', !hasAnyCleared);
            if (wasHidden && hasAnyCleared) this._addNewBadge(el);
        }

        // B-004: inline canvas hint visible only in Step-0 (no clears yet)
        const step0Hint = document.getElementById('step0-hint');
        if (step0Hint) step0Hint.style.display = hasAnyCleared ? 'none' : '';

        // Stats section: show after Ch.2
        const statsSection = document.getElementById('stats-section');
        if (statsSection) {
            const wasHidden = statsSection.classList.contains('section-hidden');
            statsSection.classList.toggle('section-hidden', chapter < 2);
            if (wasHidden && chapter >= 2) this._addNewBadge(statsSection);
        }

        // Item shop: show after Ch.2
        const itemShop = document.getElementById('item-shop');
        if (itemShop) {
            const wasHidden = itemShop.classList.contains('section-hidden');
            itemShop.classList.toggle('section-hidden', chapter < 2);
            if (wasHidden && chapter >= 2) this._addNewBadge(itemShop);
        }
    }

    _addNewBadge(section) {
        const h3 = section.querySelector('h3');
        if (!h3 || h3.querySelector('.badge-new')) return;

        // Task #11: NEW! 시퀀셜 (3차 외부 비평 — 6 동시 폭발 회피)
        const queueIdx = this._newBadgeActive ?? 0;
        this._newBadgeActive = queueIdx + 1;
        const delay = queueIdx * 1500;

        setTimeout(() => {
            if (h3.querySelector('.badge-new')) {
                this._newBadgeActive = Math.max(0, (this._newBadgeActive ?? 1) - 1);
                return;
            }
            const badge = document.createElement('span');
            badge.className = 'badge-new';
            badge.textContent = 'NEW!';
            h3.appendChild(badge);
            setTimeout(() => {
                badge.remove();
                this._newBadgeActive = Math.max(0, (this._newBadgeActive ?? 1) - 1);
            }, 15000);
        }, delay);
    }

    render() {
        this.renderer.carryingTreasure = this.carryingTreasure;
        this.renderer.render();
    }
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // i18n: initI18n applies HTML data-i18n attrs from localStorage rld_lang (M5 폴리시)
    initI18n();
    window.game = new Game();
});
