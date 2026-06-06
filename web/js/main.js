/**
 * RL Dungeon - Main Entry Point
 */

import { loadDungeon } from './game/grid.js';
import { Grid } from './game/grid.js';
import { Agent, Action } from './game/agent.js';
import { Renderer } from './game/renderer.js';
import { TilemapRenderer } from './game/tilemap-renderer.js';
import { TileType, TileProperties, isPassable, isLethal } from './game/tiles.js';
import { sound } from './game/sound.js';
import { music, MusicManager } from './game/music.js';
import { DungeonEditor } from './game/editor.js';
import { MultiStageGrid } from './game/multi-stage-grid.js';
import { RunState, CHARACTER_STATS, CHAPTER_CONFIG, DUNGEON_TREASURES, ITEMS, HIRE_COSTS, STARTING_FOOD } from './game/run-state.js';
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
import { t, tHtml, initI18n, setLang, getLang, onLangChange } from './i18n/index.js';
import { renderTitleArt } from './game/title-art.js';
import { OpeningManager } from './game/opening.js';
import { drawGuildHall, drawCharacter, drawRepliPortrait, drawRikaPortrait, drawRepliBackground, drawWallMap, drawShopStall, GUILD_OBJECTS } from './game/opening-art.js';

// Guild onboarding (first guild entry only). NPC introduces the room one beat
// at a time and reveals entry buttons progressively. Korean hardcoded for now —
// i18n keys (guild.onboard.*) to follow. Narrative per STORY.md / D-2026-06-02-18.
const GUILD_ONBOARD_KEY = 'rld_guild_onboarded';
// 튜토리얼 1회성 마커. 첫 던전 세션이 끝나면(클리어/나가기) localStorage 에 박는다 →
// 런 리셋(새 런)과 무관하게 영속. 이 플래그로 (1) 식량 세이프넷 ON/OFF, (2) 풀/단축
// 온보딩을 함께 가른다. clearedDungeons 는 런마다 리셋되므로 세이프넷 게이트로 쓰면
// 새 런마다 다시 켜짐 → 반드시 localStorage 플래그여야 진짜 1회성.
const TUTORIAL_DONE_KEY = 'rld_tutorial_done';
// who → 흉상(drawRepliPortrait/drawRikaPortrait), highlight → 자원 박스 강조,
// reveal → 진입 버튼 공개. 대사는 시나리오 기반 (레플리=일상/안내, 리카=모험가 의뢰).
// 온보딩 비트. side='npc'|'master' (목소리 진영), mode='speak'(기본)|'inner'(속마음).
// who=무대 전면에 세울 NPC. {master}=주인공 이름(현재 '마스터' 자리표시자).
// ※ 카피는 자리표시자 — 톤/문구는 검수 후 조정. (CTA 클릭까지만이 이번 스코프)
// 카피는 i18n dict 로 이관(onboard.*) — speakerKey/textKey 는 _renderGuildBeat 에서 t() 평가.
// {master} 토큰은 t() 결과에 남아 _fmtGuildText 가 '마스터'(guild.master_name)로 치환.
const GUILD_ONBOARD_BEATS = [
    // 레플리 등장 (무대 중앙·전면)
    { side: 'npc', who: 'repli', speakerKey: 'onboard.speaker.repli', textKey: 'onboard.b1' },
    // 떡밥 — 주인공 속마음(불안/의문). 무대의 레플리는 딤+뒤로.
    { side: 'master', mode: 'inner', textKey: 'onboard.b2' },
    // 레플리 G 설명 (전면) — 식량/HP는 길드에서 숨겼으니 G만 짚는다.
    { side: 'npc', who: 'repli', speakerKey: 'onboard.speaker.repli', textKey: 'onboard.b3', highlight: 'gold' },
    { side: 'npc', who: 'repli', speakerKey: 'onboard.speaker.repli', textKey: 'onboard.b4', highlight: 'gold' },
    { side: 'npc', who: 'repli', speakerKey: 'onboard.speaker.repli', textKey: 'onboard.b5', highlight: 'gold' },
    { side: 'npc', who: 'repli', speakerKey: 'onboard.speaker.repli', textKey: 'onboard.b6', highlight: 'gold' },
    // 주인공 속마음(시니컬) — 레플리 딤+뒤로.
    { side: 'master', mode: 'inner', textKey: 'onboard.b7' },
    // 리카 등장 (무대 우측·전면) / 레플리 딤+뒤로.
    { side: 'npc', who: 'rika', speakerKey: 'onboard.speaker.rika', textKey: 'onboard.b8' },
    { side: 'npc', who: 'rika', speakerKey: 'onboard.speaker.rika', textKey: 'onboard.b9', reveal: 'quest' },
    // 레플리 마무리 CTA (전면) / 리카 딤+뒤로 → 끝나면 종이 클릭 가능.
    { side: 'npc', who: 'repli', speakerKey: 'onboard.speaker.repli', textKey: 'onboard.b10', cta: 'quest' },
];

// 단축 온보딩 — 튜토리얼 완료(rld_tutorial_done) 후 재시작(새 게임/새 런)마다 재생.
// 하이라이트·G(골드) 설명·속마음 전부 제거 → [인사 → 잘 해봐요 → 리카 의뢰 → CTA] 4비트.
const GUILD_ONBOARD_BEATS_SHORT = [
    { side: 'npc', who: 'repli', speakerKey: 'onboard.speaker.repli', textKey: 'onboard.b1' },
    { side: 'npc', who: 'repli', speakerKey: 'onboard.speaker.repli', textKey: 'onboard.short_go' },
    { side: 'npc', who: 'rika', speakerKey: 'onboard.speaker.rika', textKey: 'onboard.b8' },
    { side: 'npc', who: 'rika', speakerKey: 'onboard.speaker.rika', textKey: 'onboard.b9', reveal: 'quest' },
    { side: 'npc', who: 'repli', speakerKey: 'onboard.speaker.repli', textKey: 'onboard.b10', cta: 'quest' },
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

        // 클린 플레이 화면 ↔ dev 워크벤치는 game-area(캔버스+오버레이+HUD) 단일 서브트리를 공유.
        // 화면 진입 시 active 화면 slot 으로 노드째 이동 → 캔버스 객체·ctx·렌더러·오버레이 참조 보존(재바인딩 0).
        this._gameArea = document.querySelector('.game-area');
        this._devGameSlot = document.getElementById('dev-game-slot');
        this._playSlot = document.getElementById('play-slot');
        this.screenManager.onTransition((screenId) => {
            if (screenId === 'screen-play') this._relocateGameArea('play');
            else if (screenId === 'screen-dev') this._relocateGameArea('dev');
        });

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

    /** game-area 서브트리를 target('play'|'dev') slot 으로 이동. 같은 노드 이동이라 멱등 + 재바인딩 0. */
    _relocateGameArea(target) {
        const slot = target === 'play' ? this._playSlot : this._devGameSlot;
        if (!slot || !this._gameArea) return;
        if (this._gameArea.parentElement === slot) return;   // 이미 제자리 — no-op
        slot.appendChild(this._gameArea);
    }

    setupScreens() {
        // Title art (procedural pixel illustration, palette A)
        const titleArtCanvas = document.getElementById('title-art-canvas');
        if (titleArtCanvas) renderTitleArt(titleArtCanvas);

        // Opening manager — instantiated once, shown on New Game if not seen yet.
        // Dev: `?opening` query param replays the opening (clears the seen flag).
        this.openingManager = new OpeningManager();
        if (new URLSearchParams(location.search).has('opening')) {
            OpeningManager.reset();
        }

        // Title language toggle (separate from Dev Mode lang toggle)
        const titleLangBtn = document.getElementById('btn-title-lang');
        if (titleLangBtn) {
            const updateLabel = () => {
                titleLangBtn.textContent = getLang() === 'ko' ? 'EN' : '한국어';
            };
            updateLabel();
            titleLangBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                setLang(getLang() === 'ko' ? 'en' : 'ko');
                updateLabel();
                // Re-render title art is palette-static, so just keep
            });
        }

        // Title buttons
        document.getElementById('btn-new-game').addEventListener('click', () => {
            this._beginNewGame();
        });

        // DEV/TEST: always replay the opening + guild onboarding, then enter.
        document.getElementById('btn-new-game-opening').addEventListener('click', () => {
            OpeningManager.reset();
            localStorage.removeItem(GUILD_ONBOARD_KEY);
            localStorage.removeItem(TUTORIAL_DONE_KEY);   // 풀 온보딩 + 식량 세이프넷 재무장(재테스트용)
            this._beginNewGame();
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

        // 클린 플레이 화면 나가기 → 길드 복귀 (dev 워크벤치 거치지 않음)
        const playExitBtn = document.getElementById('btn-play-exit');
        if (playExitBtn) playExitBtn.addEventListener('click', () => {
            // 게임오버 오버레이가 뜬 채 나가면 재출발 시 stale 잔존 → 여기서 정리
            if (this.isGameOver) {
                this.isGameOver = false;
                if (this.gameOverOverlay) this.gameOverOverlay.style.display = 'none';
            }
            // 첫 던전 세션을 한 번 떠나면 튜토리얼 소진 → 세이프넷 OFF + 단축 온보딩 전환.
            this._cancelTutorAssist();
            this._markTutorialDone();
            this.screenManager.show('screen-guild');
            this.updateGuildHall();
        });

        // Scene objects ARE the entry points (HUD-over-scene): each transparent
        // hotspot opens its panel. Held back until onboarding hands off the room.
        document.querySelectorAll('.guild-hotspot').forEach(spot => {
            spot.addEventListener('click', () => {
                if (this._guildOnboarding) return;
                const key = spot.dataset.popup;
                this._openGuildPopup(key, t('guild.tab.' + key));
            });
        });
        const guildPopup = document.getElementById('guild-popup');
        if (guildPopup) {
            guildPopup.querySelectorAll('[data-popup-close]').forEach(el => {
                el.addEventListener('click', () => { this._clearFarmTick(); guildPopup.hidden = true; });
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !guildPopup.hidden) { this._clearFarmTick(); guildPopup.hidden = true; }
            });
        }
        // NPC onboarding dialogue — click OR arrow/Enter/Space to advance (오프닝과 동일)
        const guildDlg = document.getElementById('guild-dialogue');
        if (guildDlg) guildDlg.addEventListener('click', () => this._advanceGuildBeat());
        document.addEventListener('keydown', (e) => {
            if (!this._guildOnboarding) return;
            if (this.screenManager && this.screenManager.current !== 'screen-guild') return;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                this._advanceGuildBeat();
            }
        });
    }

    /** Fresh run setup shared by the 시작 and 오프닝+시작 (dev) buttons. */
    _beginNewGame() {
        this.runState = new RunState();
        this.runState.saveRunState();
        this._clearAllQTables();
        this._onboardingRequested = true;   // 새 게임 → 길드 진입 시 온보딩(풀/단축) 재생
        this.loadDungeon('level_01_easy');
        this.updateStatsUI();
        this.updateFarmingUI();
        this.updateCharacterGrid();
        this._enterGameStart();
    }

    /** New Game post-init flow: show opening prologue if not seen, else go straight to guild. */
    _enterGameStart() {
        if (OpeningManager.hasBeenSeen()) {
            this.screenManager.show('screen-guild');
            this.updateGuildHall();
            return;
        }
        this.screenManager.show('screen-opening');
        this.openingManager.start(() => {
            this.screenManager.show('screen-guild');
            this.updateGuildHall();
        });
    }

    _updateTitleButtons() {
        const hasSave = localStorage.getItem('rld_run_state') !== null;
        const btnNew = document.getElementById('btn-new-game');
        const btnCont = document.getElementById('btn-continue');
        if (hasSave) {
            btnCont.style.display = '';
            btnCont.disabled = false;
            // When a save exists, "Continue" is the primary action and "New Game" is secondary.
            btnNew.classList.remove('title-btn-primary');
            btnCont.classList.add('title-btn-primary');
            // Swap order visually so Continue is on top: rely on flex order to keep it cheap.
            btnCont.style.order = '0';
            btnNew.style.order = '1';
        } else {
            btnCont.style.display = 'none';
            btnCont.classList.remove('title-btn-primary');
            btnNew.classList.add('title-btn-primary');
            btnNew.style.order = '0';
        }
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
        this._drawGuildScene();
        this._updateGuildHotspots();
        this._maybeStartGuildOnboarding();
    }

    /**
     * Which guild entry points are unlocked. The room starts minimal (의뢰 only) and
     * fills in as the guild progresses, per the "보드만 먼저" reveal model.
     * NOTE: party is a placeholder gate (clear-based) until the 세르파 roster lands.
     */
    _guildUnlocks() {
        const rs = this.runState;
        const firstClear = rs.clearedDungeons.size >= 1;
        return {
            quest: true,                          // core loop — always available
            map: rs.unlockedDungeons.size > 1,    // a second destination exists
            shop: firstClear,                     // earned gold → reason to shop
            party: firstClear,                    // TODO: gate on 세르파 보유 when implemented
        };
    }

    /** Position an element over a GUILD_OBJECTS rect (vw/vh, full-viewport canvas). */
    _placeGuildRect(el, rect) {
        if (!el || !rect) return;
        el.style.left = `${rect.x * 100}vw`;
        el.style.top = `${rect.y * 100}vh`;
        el.style.width = `${rect.w * 100}vw`;
        el.style.height = `${rect.h * 100}vh`;
    }

    /** Show/hide each scene-object hotspot to match the unlock state, and place
     * each hotspot + the quest marker from the GUILD_OBJECTS SSOT so the clickzone
     * always sits over its drawing (W-2 — coords no longer live in CSS). */
    _updateGuildHotspots() {
        const u = this._guildUnlocks();
        for (const key of ['quest', 'map', 'shop', 'party']) {
            const el = document.querySelector(`.guild-hotspot[data-popup="${key}"]`);
            if (!el) continue;
            this._placeGuildRect(el, GUILD_OBJECTS[key]);
            el.hidden = !u[key];
        }
        this._placeGuildRect(document.getElementById('guild-quest-marker'), GUILD_OBJECTS.quest);
    }

    /** Open a guild entry panel (quest/party/shop/map) in the popup modal. */
    _openGuildPopup(key, title) {
        const popup = document.getElementById('guild-popup');
        if (!popup) return;
        // opening the quest panel retires the board marker (the cue is spent)
        // + 항상 보드 뷰부터(직전 준비실 잔상 방지), 현재 챕터로 리셋.
        if (key === 'quest') {
            this._questRevealPending = false; this._setGuildQuestMarker(false);
            this._questChapterView = this.runState.getCurrentChapter();
            this._updateGuildQuests();
        }
        document.querySelectorAll('.guild-popup-body .guild-tab-panel')
            .forEach(p => p.classList.remove('active'));
        const panel = document.getElementById('guild-tab-' + key);
        if (panel) panel.classList.add('active');
        const titleEl = document.getElementById('guild-popup-title');
        if (titleEl) titleEl.textContent = title || '';
        // 의뢰 보드/준비실은 풀-페이지(전체 덮기), 나머지 탭은 기존 중앙 모달.
        popup.classList.toggle('is-fullpage', key === 'quest');
        popup.hidden = false;
    }

    // ── Guild onboarding (NPC dialogue + progressive button reveal) ──────────

    /**
     * 온보딩 재생 — 새 게임/새 런에서만(_onboardingRequested). 일반 길드 진입(준비실 취소,
     * dev 복귀 등)엔 안 뜬다. 첫 플레이=풀버전, 튜토리얼 완료(rld_tutorial_done) 후=단축판.
     */
    _maybeStartGuildOnboarding() {
        if (this._guildOnboarding) return;       // already running — don't restart
        if (!this._onboardingRequested) return;  // 새 게임/새 런 트리거에서만
        this._onboardingRequested = false;
        // 풀/단축 비트셋 선택 — _renderGuildBeat/_finishGuildTyping 가 this._beats 참조.
        this._beats = this._tutorialDone() ? GUILD_ONBOARD_BEATS_SHORT : GUILD_ONBOARD_BEATS;
        this._guildOnboarding = true;
        this._guildBeatIdx = 0;
        // Game 인스턴스는 페이지당 1회 — dev 리플레이(localStorage만 지움, reload 없음)에서
        // 이전 플레이의 stale-true 가 남으면 첫 비트부터 종이가 그려진다. 무대도 함께 초기화.
        this._questPosted = false;
        this._guildStage = [];
        this._guildActive = null;
        this._renderGuildBeat();
    }

    _renderGuildBeat() {
        const beat = (this._beats || GUILD_ONBOARD_BEATS)[this._guildBeatIdx];
        const dlg = document.getElementById('guild-dialogue');
        if (!beat) { this._finishGuildOnboarding(); return; }
        // the quest reveal flags the board marker, shown once the dialogue ends and
        // the room is visible again (during a beat the room is dimmed behind the bust).
        // 리카가 의뢰를 가져오면(reveal) 비로소 게시판에 퀘스트 종이가 붙는다.
        // 그 전까지 보드는 빈 코르크판. (_questPosted 는 drawGuildHall 이 소비)
        if (beat.reveal === 'quest') { this._questRevealPending = true; this._questPosted = true; }

        // 무대(stage): 흉상은 한 번 오르면 장면 끝까지 유지(영속). 말하는 NPC=전면(active),
        // 나머지(주인공 차례 포함)=딤+뒤로. 줄마다 생성/제거 X → 깜빡임 없음(MVP 스냅).
        if (!this._guildStage) this._guildStage = [];
        if (beat.side === 'npc' && beat.who) {
            if (!this._guildStage.includes(beat.who)) this._guildStage.push(beat.who);
            this._guildActive = beat.who;
        } else {
            this._guildActive = null;   // 주인공 차례 — 무대의 NPC 전원 recede
        }
        this._drawGuildScene();

        // 설명 중인 자원 박스 하이라이팅 (이전 비트 강조 해제 후 적용)
        document.querySelectorAll('.guild-res.is-highlight').forEach(e => e.classList.remove('is-highlight'));
        if (beat.highlight) {
            const res = document.getElementById('guild-' + beat.highlight);
            if (res) res.classList.add('is-highlight');
        }

        // 대사 색상 4분류 — 캐릭터별이 아니라 (주인공 vs NPC) × (대사 vs 속마음).
        const inner = beat.mode === 'inner';
        if (dlg) {
            dlg.classList.toggle('voice-master', beat.side === 'master');
            dlg.classList.toggle('voice-npc', beat.side !== 'master');
            dlg.classList.toggle('is-inner', inner);
        }
        // 주인공 비트엔 주인공 이름('마스터')을 NPC처럼 표기(속마음도 노출 — 이탤릭으로 구분).
        const speaker = beat.side === 'master' ? this._fmtGuildText('{master}') : (beat.speakerKey ? t(beat.speakerKey) : '');
        this._typeGuildDialogue(speaker, this._guildDisplayText(beat));
        if (dlg) dlg.classList.add('show');
    }

    /** Advance on click; first click finishes an in-progress typewriter. */
    _advanceGuildBeat() {
        if (!this._guildOnboarding) return;
        if (this._guildTyping) { this._finishGuildTyping(); return; }
        this._guildBeatIdx++;
        this._renderGuildBeat();
    }

    _finishGuildOnboarding() {
        this._guildOnboarding = false;
        this._clearGuildTyping();
        localStorage.setItem(GUILD_ONBOARD_KEY, '1');
        const dlg = document.getElementById('guild-dialogue');
        if (dlg) dlg.classList.remove('show', 'ready');
        document.querySelectorAll('.guild-res.is-highlight').forEach(e => e.classList.remove('is-highlight'));
        this._guildStage = [];                     // 무대 비움 → 다음 진입 깨끗하게
        this._guildActive = null;
        this._drawGuildScene();                    // back to the normal scene
        // the board marker glows over the quest parchment so the player knows to
        // click the bulletin board next (no buttons — scene objects are the cue).
        // By design it stays lit until the quest panel is opened (_openGuildPopup);
        // re-entry doesn't re-evaluate it, and a page refresh resets it (acceptable).
        if (this._questRevealPending) this._setGuildQuestMarker(true);
    }

    /** Toggle the glowing quest-board marker over the bulletin board. */
    _setGuildQuestMarker(show) {
        const m = document.getElementById('guild-quest-marker');
        if (m) m.hidden = !show;
    }

    /** {master} → 주인공 이름(현재 guild.master_name='마스터', 나중에 인풋으로 교체 가능). */
    _fmtGuildText(text) {
        return (text || '').replace(/\{master\}/g, this._masterName || t('guild.master_name'));
    }

    /** 비트의 최종 표시 텍스트: 키→t() + {master} 치환 + 속마음이면 괄호로 감싼다(보편 컨벤션). */
    _guildDisplayText(beat) {
        const s = this._fmtGuildText(t(beat.textKey));
        return beat.mode === 'inner' ? `(${s})` : s;
    }

    _typeGuildDialogue(speaker, text) {
        const sp = document.getElementById('guild-dialogue-speaker');
        const tx = document.getElementById('guild-dialogue-text');
        const dlg = document.getElementById('guild-dialogue');
        if (sp) sp.textContent = speaker || '';
        if (!tx) return;
        this._clearGuildTyping();
        if (dlg) dlg.classList.remove('ready');   // 타이핑 중엔 ▼(next) 숨김 (오프닝과 동일)
        tx.textContent = '';
        this._guildTyping = true;
        let i = 0;
        const tick = () => {
            i++;
            tx.textContent = text.slice(0, i);
            if (i < text.length) {
                this._guildTypeTimer = setTimeout(tick, 28);
            } else {
                this._guildTyping = false;
                this._guildTypeTimer = null;
                if (dlg) dlg.classList.add('ready');   // 완료 → ▼ 노출(클릭/키로 다음)
            }
        };
        tick();
    }

    _finishGuildTyping() {
        this._clearGuildTyping();
        const beat = (this._beats || GUILD_ONBOARD_BEATS)[this._guildBeatIdx];
        const tx = document.getElementById('guild-dialogue-text');
        if (tx && beat) tx.textContent = this._guildDisplayText(beat);
        this._guildTyping = false;
        document.getElementById('guild-dialogue')?.classList.add('ready');   // 스킵 완료도 ▼ 노출
    }

    _clearGuildTyping() {
        if (this._guildTypeTimer) { clearTimeout(this._guildTypeTimer); this._guildTypeTimer = null; }
    }

    /**
     * Render the guild office scene (background canvas behind the translucent
     * panels). drawGuildHall scales to any aspect; NPC + 길드장 placed
     * proportionally. Placeholder character art (drawCharacter token) until the
     * room-scale sprites land. Cosmetic only — no sim/run-state coupling.
     */
    _drawGuildScene() {
        const canvas = document.getElementById('guild-scene-canvas');
        if (!canvas) return;
        // size the backing store to the displayed box (device px) for crispness
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));
        if (!w || !h) return;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        // 게시판 종이는 리카의 의뢰 reveal 이후(또는 온보딩 완료 후 재진입) 표시.
        const questPosted = this._questPosted || localStorage.getItem(GUILD_ONBOARD_KEY) === '1';
        drawGuildHall(ctx, w, h, { questPosted });

        // Onboarding: 무대 흉상을 먼저 *불투명하게* 그리고, '구멍 뚫린 스포트라이트'(라디얼
        // 딤)로 전면(active)만 밝게 남기고 나머지를 그림자에 잠근다. 투명도 조정(ghost) 대신
        // 빛/그림자로 전·후면을 가른다. 주인공 차례(active 없음)엔 전체를 평평하게 딤. 흉상 영속.
        const stage = this._guildStage || [];
        if (this._guildOnboarding && stage.length) {
            const baseY = h * 0.90, sc = Math.max(4, Math.round(h / 100));
            // 슬롯: 1명=중앙, 2명=좌(0.34)·우(0.66). ※ 최대 2 NPC 가정 + stage 순서=등장순=좌→우.
            // NPC 3명 이상이면 slots[i] 가 undefined → NaN 좌표. 확장 시 슬롯 테이블 보강 필요.
            const slots = stage.length === 1 ? [0.5] : [0.34, 0.66];
            const activeIdx = this._guildActive ? stage.indexOf(this._guildActive) : -1;

            // 1) 후면(비활성) 흉상을 불투명하게 먼저 — 곧 딤에 잠긴다(축소 = 뒤로).
            stage.forEach((who, i) => {
                if (who === this._guildActive) return;
                this._drawGuildBust(ctx, who, w * slots[i], baseY, sc, false);
            });
            // 2) 평평한 딤 — 방 + 후면 흉상을 통째로 그림자에. (투명도 X → ghost 아님)
            ctx.fillStyle = 'rgba(5,4,3,0.62)';
            ctx.fillRect(0, 0, w, h);
            // 3) 전면(active) 흉상만 딤 *위에* 또렷하게 다시 그린다 (+ 은은한 온기).
            //    주인공 차례(active 없음)엔 redraw 없음 → 무대 전원 그림자(속마음 집중).
            if (activeIdx >= 0) {
                const spotX = w * slots[activeIdx];
                const glow = ctx.createRadialGradient(spotX, h * 0.6, 12, spotX, h * 0.6, h * 0.5);
                glow.addColorStop(0, 'rgba(192,138,58,0.16)');
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, w, h);
                this._drawGuildBust(ctx, this._guildActive, spotX, baseY, sc, true);
            }
            return;
        }

        // Gated scene objects — the room fills in as the guild unlocks features.
        // (Board+desk are room fixtures in drawGuildHall; these appear over them.)
        const u = this._guildUnlocks();
        const mr = GUILD_OBJECTS.map, sr = GUILD_OBJECTS.shop;  // SSOT — match hotspots (W-2)
        if (u.map) drawWallMap(ctx, w * mr.x, h * mr.y, w * mr.w, h * mr.h);
        if (u.shop) drawShopStall(ctx, w * sr.x, h * sr.y, w * sr.w, h * sr.h);

        // 접수원 레플리(배경 단순 figure)가 책상 뒤에 서 있고(중앙), 길드장(플레이어)은
        // 좌측 바닥에. baseY=책상 윗선이라 하반신이 책상 뒤로 가린다. (둘은 항상 표시 — NPC.)
        const repliSc = Math.max(3, Math.round(h / 150));
        drawRepliBackground(ctx, w * 0.50, h * 0.74, repliSc);
        const tile = Math.round(Math.min(w, h) * 0.14);
        drawCharacter(ctx, w * 0.20, h * 0.82, 'player', tile);
    }

    /** Draw one stage bust. active=전면(풀 크기), else recede(85% 축소). 밝기 차는 위의
     *  스포트라이트(그림자)가 처리 — 투명도 조정 안 함(ghost 방지). MVP 스냅(트윈 X). */
    _drawGuildBust(ctx, who, cx, baseY, sc, active) {
        const draw = who === 'rika' ? drawRikaPortrait : drawRepliPortrait;
        const useSc = active ? sc : Math.max(3, Math.round(sc * 0.85));
        draw(ctx, cx, baseY, useSc);
    }

    _updateGuildResources() {
        const rs = this.runState;
        // 간판 진행도 — 챕터 + 누적 답파 수 (Run#은 HUD에서 뺌, 도전/사망/스텝은 엔딩 기록으로).
        const chEl = document.getElementById('guild-chapter');
        if (chEl) {
            const ch = rs.getCurrentChapter();
            chEl.textContent = t('guild.signboard', { ch, name: t('chapter.' + ch), k: rs.clearedDungeons.size });
        }
        document.getElementById('guild-run').textContent = t('guild.run_format', { n: rs.runNumber });
        document.getElementById('guild-gold').textContent = t('guild.gold_format', { n: rs.gold });
        document.getElementById('guild-food').textContent = t('guild.food_format', { n: rs.food });
        // HP: show current agent HP if available, else maxHp from current character
        const maxHp = rs.getMaxHp(this.currentCharacter);
        const hp = this.agent ? this.agent.hp : maxHp;
        document.getElementById('guild-hp').textContent = t('guild.hp_format', { cur: hp, max: maxHp });
        // D-2026-06-02-18: 사망 4/4 표시 제거 (세르파 무한부활 — 하드 사망 한도 폐기).
    }

    // ── 미션 보드 (의뢰 게시판) — 의뢰판 클릭 시 길드 팝업에 렌더 ──────────────
    // 챕터 네비(도달 챕터만) + 미션 카드(상태) + 보스 슬롯(챕터 일반 의뢰 모두 답파 시 해금).
    // 챕터 내 자율 분기/세르파 점유(도전중·파밍중)는 후속 시스템 — 상태 틀은 잡되 Ch.1 현실만 배선.
    _updateGuildQuests() {
        this._clearFarmTick();                          // 보드로 돌아오면 파밍 라이브 틱 정지
        const panel = document.getElementById('guild-tab-quest');
        const rs = this.runState;
        const cur = rs.getCurrentChapter();
        if (!this._questChapterView || this._questChapterView > cur) this._questChapterView = cur;
        const view = this._questChapterView;
        const chCfg = rs.getChapterConfig(view) || { dungeons: [] };
        const dungeons = chCfg.dungeons;
        const bossId = dungeons[dungeons.length - 1];        // 챕터 캡스톤 = 보스
        const normals = dungeons.slice(0, -1);

        // 챕터 네비 — 도달한 챕터(1..cur)만 이동
        const prev = view > 1
            ? `<button class="mboard-nav" data-chnav="${view - 1}">‹</button>`
            : `<span class="mboard-nav disabled">‹</span>`;
        const next = view < cur
            ? `<button class="mboard-nav" data-chnav="${view + 1}">›</button>`
            : `<span class="mboard-nav disabled">›</span>`;
        let html = `<div class="mboard-head">${prev}<span class="mboard-chtitle">Ch.${view} ${t('chapter.' + view)}</span>${next}</div>`;

        // 일반 의뢰 — 해금/답파된 것만 (잠긴 미래는 숨김)
        html += `<div class="mboard-cards">`;
        const shown = normals.filter(d => rs.unlockedDungeons.has(d) || rs.clearedDungeons.has(d));
        for (const did of shown) html += this._renderMissionCard(did, false);
        if (normals.some(d => !rs.unlockedDungeons.has(d) && !rs.clearedDungeons.has(d))) {
            html += `<div class="mboard-more">${t('mission.board.more')}</div>`;
        }
        html += `</div>`;

        // 보스 슬롯 — 일반 의뢰 모두 답파 시 해금
        html += `<div class="mboard-boss-sep">${t('mission.boss_sep')}</div>`;
        const bossOpen = normals.every(d => rs.clearedDungeons.has(d));
        if (rs.clearedDungeons.has(bossId) || (bossOpen && rs.unlockedDungeons.has(bossId))) {
            html += this._renderMissionCard(bossId, true);
        } else {
            const lv = this.getDungeonLevel(bossId), bn = this.getDungeonDisplayName(bossId);
            html += `<div class="mission-card boss locked">
                <div class="mission-card-head"><span class="mission-card-name">🔒 Lv.${lv} ${bn}</span><span class="mission-badge boss">${t('mission.badge.boss')}</span></div>
                <div class="mission-card-sub">${t('mission.board.boss_locked')}</div>
            </div>`;
        }

        panel.innerHTML = html;

        panel.querySelectorAll('[data-chnav]').forEach(b => b.addEventListener('click', () => {
            this._questChapterView = parseInt(b.dataset.chnav, 10);
            this._updateGuildQuests();
        }));
        panel.querySelectorAll('.mission-card[data-dungeon]').forEach(card => {
            if (card.classList.contains('locked')) return;   // 잠김/파밍중은 클릭 불가
            card.addEventListener('click', () => this._renderPrepRoom(card.dataset.dungeon));
        });
    }

    /** 미션 카드 1장 — NEW / CLEAR / 파밍중(잠김) 상태. isBoss=보스 태그. */
    _renderMissionCard(did, isBoss) {
        const rs = this.runState;
        const config = DUNGEON_CONFIG[did] || {};
        const lv = this.getDungeonLevel(did), name = this.getDungeonDisplayName(did);
        const cleared = rs.clearedDungeons.has(did);
        const farmer = this._dungeonFarmer(did);
        const stars = this._dungeonStars(did);
        const bossTag = isBoss ? `<span class="mission-badge boss">${t('mission.badge.boss')}</span>` : '';
        let cls = 'mission-card' + (isBoss ? ' boss' : ''), badge, meta, flavor = true;
        if (farmer) {                                   // 세르파 파밍 중 → 클릭 시 파밍 통제판 재진입
            cls += ' cleared farming';
            badge = `<span class="mission-badge farming">${t('mission.badge.farming')}</span>`;
            meta = tHtml('mission.farming_lock', { name: this._charName(farmer) });   // innerHTML 경로 — 값 escape
            flavor = false;
        } else if (cleared) {
            cls += ' cleared';
            badge = `<span class="mission-badge clear">${t('mission.badge.clear')}</span>`;
            meta = t('mission.reward.farm', { n: config.repeatReward });
        } else {
            badge = `<span class="mission-badge new">${t('mission.badge.new')}</span>`;
            meta = t('mission.reward.first', { n: config.firstReward });
        }
        return `<div class="${cls}" data-dungeon="${did}">
            <div class="mission-card-head"><span class="mission-card-name">Lv.${lv} ${name}</span>${bossTag}${badge}</div>
            <div class="mission-card-meta"><span class="mission-stars">${stars}</span><span>${meta}</span></div>
            ${flavor ? `<div class="mission-card-flavor">"${this._dungeonFlavor(did)}"</div>` : ''}
        </div>`;
    }

    /** 난이도 ★ 티어 (챕터 기반): ch≤2 ★☆☆ / ch≤4 ★★☆ / else ★★★. */
    _dungeonStars(did) {
        const ch = this.runState.getChapterForDungeon(did);
        const n = ch <= 2 ? 1 : (ch <= 4 ? 2 : 3);
        return '★'.repeat(n) + '☆'.repeat(3 - n);
    }

    /** 비유적·단편적 한 줄 힌트(무료 플레이버). 카피는 자리표시자(flavor.*) — 톤 검수 후 조정.
     *  우선순위: 게임플레이 플래그(보물/적/빙판) → 테마(ID 키워드) → 기본.
     *  플래그가 테마보다 우선 — 보물/적/빙판은 실제 메커닉 경고라 더 유용. */
    _dungeonFlavor(did) {
        return t(this._dungeonFlavorKey(did));
    }

    _dungeonFlavorKey(did) {
        const c = DUNGEON_CONFIG[did] || {};
        // 1) 위험 플래그 우선 (이동/생존 메커닉 경고 — 보물 힌트보다 유용. 예: 빙판+보물이면 빙판 경고)
        if (c.useHpState) return 'flavor.enemy';
        if (c.slippery) return 'flavor.ice';
        if (DUNGEON_TREASURES[did]) return 'flavor.treasure';
        // 2) 테마 (던전 ID 키워드) — 플래그 없는 던전의 분위기
        if (did.includes('trap')) return 'flavor.trap';
        if (did.includes('pit')) return 'flavor.pit';
        if (did.includes('cliff')) return 'flavor.cliff';
        if (did.includes('bridge')) return 'flavor.bridge';
        if (did.includes('cave')) return 'flavor.cave';
        if (did.includes('dead_end')) return 'flavor.dead_end';
        if (did.includes('paths')) return 'flavor.paths';
        if (did.includes('field')) return 'flavor.field';
        if (did.includes('hall')) return 'flavor.hall';
        if (did.includes('gauntlet')) return 'flavor.gauntlet';
        if (did.includes('maze')) return 'flavor.maze';
        if (did.includes('risk') || did.includes('deadly')) return 'flavor.danger';
        return 'flavor.default';
    }

    /** 이 던전을 파밍 중인 세르파 키(없으면 null). */
    _dungeonFarmer(did) {
        const fa = this.runState.farmingAssignments || {};
        for (const [char, d] of Object.entries(fa)) if (d === did) return char;
        return null;
    }

    _charName(key) {
        return (CHARACTERS[key] && CHARACTERS[key].name) || key;
    }

    _getDungeonSize(dungeonId) {
        try {
            const grid = loadDungeon(dungeonId);
            return `${grid.width}x${grid.height}`;
        } catch {
            return '?x?';
        }
    }

    // ── 준비실 — 미션 카드 선택 시 같은 팝업 면에 렌더(모달/dev 화면 안 거침). ──────
    // 정보줄(적응형) + 힌트(2단) + 출정 방식 + 식량/입장료 + 출발. 세르파·아이템 탭은 잠김.
    // 출발 시에만 클린 플레이 화면(screen-play)으로 전환 → tryEnterDungeon. (briefing.onDeploy 선례)
    _renderPrepRoom(dungeonId) {
        const rs = this.runState;
        this._clearFarmTick();                          // 면 전환 시 이전 파밍 틱 정지
        // 답파 완료 던전 = 파밍 통제판으로 변신 (방치형 누적 — 직접 재도전 없음, D-대기실변신).
        if (rs.clearedDungeons.has(dungeonId)) { this._renderFarmRoom(dungeonId); return; }
        const panel = document.getElementById('guild-tab-quest');
        const titleEl = document.getElementById('guild-popup-title');
        const config = DUNGEON_CONFIG[dungeonId] || { cost: 0, firstReward: 0, repeatReward: 0 };
        const lv = this.getDungeonLevel(dungeonId), name = this.getDungeonDisplayName(dungeonId);
        const cleared = rs.clearedDungeons.has(dungeonId);
        // 입장료 차단은 tryEnterDungeon(라인 ~3140)과 동일 조건으로 — builtin 던전만 골드 가드(daily 등 면제 던전 오잠금 방지).
        const cantAfford = () => this.isBuiltInDungeon(dungeonId) && rs.gold < (config.cost || 0);
        const best = rs.answerPaths && rs.answerPaths[dungeonId] && rs.answerPaths[dungeonId].steps;
        if (titleEl) titleEl.textContent = t('prep.title', { lv, name });

        // 정보줄(적응형): 미답파면 난이도만, 답파 후 최단보 채움. (지도%/도전횟수는 후속 데이터)
        const parts = [t('prep.difficulty', { stars: this._dungeonStars(dungeonId) })];
        if (cleared) { parts.push(t('prep.cleared')); if (best) parts.push(t('prep.best', { n: best })); }
        else parts.push(t('prep.uncleared'));
        const info = parts.join(' · ');
        const reward = cleared ? t('prep.reward.repeat', { n: config.repeatReward }) : t('prep.reward.first', { n: config.firstReward });

        // 튜토리얼 최소형 — 탭/출정방식 토글/배낭/세르파 명단/상점은 숨김(해금 시 등장).
        // 세르파 파견 시 이 면이 진행 모니터링 UI로, 답파 후엔 파밍 UI로 '변신' (후속). docs/MISSION_BOARD.md
        panel.innerHTML = `
            <div class="prep-room">
                <canvas id="prep-minimap" class="prep-minimap"></canvas>
                <div class="prep-info">${info}</div>
                <div class="prep-flavor">"${this._dungeonFlavor(dungeonId)}"</div>
                <div class="prep-rows">
                    <div class="prep-row"><span>${t('prep.label.food')}</span><span class="food-stepper">
                        <button data-food="-10">−</button><b id="prep-food">${rs.food}</b><button data-food="10">+</button>
                        <small>${t('prep.food_unit')}</small></span></div>
                    <div class="prep-row"><span>${t('prep.label.cost')}</span><span class="prep-gold">${config.cost}G</span></div>
                    <div class="prep-row"><span>${t('prep.label.gold')}</span><span class="prep-gold" id="prep-hold">${rs.gold}G</span></div>
                    <div class="prep-row"><span>${t('prep.label.reward')}</span><span class="prep-reward">${reward}</span></div>
                </div>
                <div class="prep-actions">
                    <button class="btn-prep-back">${t('prep.cancel')}</button>
                    <button class="btn-prep-deploy" ${cantAfford() ? 'disabled' : ''}>${t('prep.deploy')}</button>
                </div>
            </div>`;
        this._renderPrepMinimap(document.getElementById('prep-minimap'), dungeonId);

        const refresh = () => {
            const f = document.getElementById('prep-food'), g = document.getElementById('prep-hold');
            if (f) f.textContent = rs.food;
            if (g) g.textContent = `${rs.gold}G`;
            const deploy = panel.querySelector('.btn-prep-deploy');
            if (deploy) deploy.disabled = cantAfford();   // 식량 구매로 골드<입장료 되면 출발 잠금(깨진 진입 방지)
            this._updateGuildResources();
        };
        panel.querySelectorAll('[data-food]').forEach(b => b.addEventListener('click', () => {
            const d = parseInt(b.dataset.food, 10);
            if (d > 0 && rs.gold >= d) { rs.gold -= d; rs.food += d; }          // 구매 (1G/개)
            else if (d < 0 && rs.food >= -d) { rs.food += d; rs.gold -= d; }     // 환불 (출발 전)
            refresh();
        }));
        panel.querySelector('.btn-prep-back').addEventListener('click', () => {
            if (titleEl) titleEl.textContent = t('guild.tab.quest');
            this._updateGuildQuests();                                          // 보드로 복귀
        });
        panel.querySelector('.btn-prep-deploy').addEventListener('click', () => {
            const popup = document.getElementById('guild-popup');
            if (popup) popup.hidden = true;
            if (titleEl) titleEl.textContent = t('guild.tab.quest');
            this.loadDungeon(dungeonId);
            this.screenManager.show('screen-play');                             // 출발 → 클린 플레이 화면(dev 워크벤치 X)
            this.tryEnterDungeon();
            this.saveProgress();
        });
    }

    // ── 파밍 통제판 — 답파 던전 대기실의 변신형. 방치형 누적(실제 답파 X). ───────────
    // 미배치 → 세르파 선택(canFarm 필터) / 배치됨 → 누적 수금·해제(라이브 틱). 속도=민첩, 상한=체력.
    _renderFarmRoom(dungeonId) {
        const rs = this.runState;
        this._clearFarmTick();                          // 재진입/재렌더 시 이전 틱 정지(틱 누수 방지)
        const panel = document.getElementById('guild-tab-quest');
        const titleEl = document.getElementById('guild-popup-title');
        const lv = this.getDungeonLevel(dungeonId), name = this.getDungeonDisplayName(dungeonId);
        const config = DUNGEON_CONFIG[dungeonId] || { repeatReward: 0 };
        if (titleEl) titleEl.textContent = t('prep.title', { lv, name });

        const best = rs.answerPaths && rs.answerPaths[dungeonId] && rs.answerPaths[dungeonId].steps;
        const infoParts = [t('prep.difficulty', { stars: this._dungeonStars(dungeonId) }), t('prep.cleared')];
        if (best) infoParts.push(t('prep.best', { n: best }));
        const info = infoParts.join(' · ');

        const farmer = this._dungeonFarmer(dungeonId);
        const mapInfo = rs.mapStatus && rs.mapStatus[dungeonId];
        const exLeft = (mapInfo && mapInfo.status === 'exclusive') ? (mapInfo.exclusiveRunsLeft || 0) : 0;
        const exclusiveRow = exLeft > 0 ? `<div class="farm-exclusive">${t('farm.exclusive', { n: exLeft })}</div>` : '';

        let body;
        if (farmer) {
            const intervalSec = Math.max(1, Math.round(rs.getFarmIntervalMs(farmer) / 1000));
            const capH = +(rs.getFarmCapMs(farmer) / 3600000).toFixed(1);
            body = `
                <div class="farm-assigned">
                    <div class="farm-who">${tHtml('farm.assigned', { name: this._charName(farmer) })}</div>
                    <div class="farm-rate">${t('farm.rate', { sec: intervalSec, n: config.repeatReward })}</div>
                    <div class="farm-cap">${t('farm.cap_note', { h: capH })}</div>
                    ${exclusiveRow}
                    <div class="farm-accrued" id="farm-accrued"></div>
                </div>
                <div class="prep-actions">
                    <button class="btn-prep-back">${t('prep.cancel')}</button>
                    <button class="btn-farm-unassign">${t('farm.unassign')}</button>
                    <button class="btn-farm-collect btn-prep-deploy" disabled>${t('farm.collect_empty')}</button>
                </div>`;
        } else {
            const pickable = Object.keys(CHARACTERS).filter(nm =>
                !rs.isCharacterHidden(nm) && rs.isCharacterAvailable(nm) &&
                rs.canFarm(nm, dungeonId, DUNGEON_CONFIG) &&
                !(rs.isFarming(nm) && rs.getFarmingDungeon(nm) !== dungeonId));
            if (pickable.length === 0) {
                body = `
                    <div class="farm-empty">${t('farm.no_serpa')}</div>
                    <div class="prep-actions"><button class="btn-prep-back">${t('prep.cancel')}</button></div>`;
            } else {
                let opts = '';
                for (const nm of pickable) {
                    const sec = Math.max(1, Math.round(rs.getFarmIntervalMs(nm) / 1000));
                    const capH = +(rs.getFarmCapMs(nm) / 3600000).toFixed(1);
                    opts += `<option value="${nm}">${this._charName(nm)} · ${sec}s/회 · ${capH}h</option>`;
                }
                body = `
                    <div class="farm-assign">
                        <div class="farm-assign-title">${t('farm.assign_title')}</div>
                        <div class="farm-assign-hint">${t('farm.assign_hint')}</div>
                        <select class="farm-serpa-select">${opts}</select>
                        ${exclusiveRow}
                    </div>
                    <div class="prep-actions">
                        <button class="btn-prep-back">${t('prep.cancel')}</button>
                        <button class="btn-farm-assign btn-prep-deploy">${t('farm.assign_btn')}</button>
                    </div>`;
            }
        }

        panel.innerHTML = `
            <div class="prep-room farm-room">
                <canvas id="prep-minimap" class="prep-minimap"></canvas>
                <div class="prep-info">${info}</div>
                <div class="prep-flavor">"${this._dungeonFlavor(dungeonId)}"</div>
                ${body}
            </div>`;
        this._renderPrepMinimap(document.getElementById('prep-minimap'), dungeonId);

        panel.querySelector('.btn-prep-back').addEventListener('click', () => {
            if (titleEl) titleEl.textContent = t('guild.tab.quest');
            this._updateGuildQuests();                  // 보드로 복귀(_clearFarmTick 포함)
        });

        if (farmer) {
            const accruedEl = document.getElementById('farm-accrued');
            const collectBtn = panel.querySelector('.btn-farm-collect');
            const tick = () => {
                const acc = rs.getFarmAccrual(farmer, DUNGEON_CONFIG, Date.now());
                const gold = acc ? acc.gold : 0, runs = acc ? acc.runs : 0;
                if (accruedEl) accruedEl.textContent = t('farm.accrued', { n: gold, runs });
                if (collectBtn) {
                    collectBtn.disabled = gold <= 0;
                    collectBtn.textContent = gold > 0 ? t('farm.collect', { n: gold }) : t('farm.collect_empty');
                }
            };
            tick();
            this._farmTickTimer = setInterval(tick, 1000);   // 라이브 누적 표시
            collectBtn.addEventListener('click', () => {
                const r = rs.collectFarmAccrual(farmer, DUNGEON_CONFIG, Date.now());
                if (r.gold > 0) this._updateGuildResources();
                this._renderFarmRoom(dungeonId);             // 누적 리셋 후 재렌더(틱 재시작)
            });
            panel.querySelector('.btn-farm-unassign').addEventListener('click', () => {
                rs.removeFarming(farmer);
                this._renderFarmRoom(dungeonId);             // 피커 상태로 재렌더
            });
        } else {
            const assignBtn = panel.querySelector('.btn-farm-assign');
            if (assignBtn) assignBtn.addEventListener('click', () => {
                const sel = panel.querySelector('.farm-serpa-select');
                const nm = sel && sel.value;
                if (nm && rs.assignFarming(nm, dungeonId, DUNGEON_CONFIG, Date.now())) {
                    this._renderFarmRoom(dungeonId);         // 배치 → 누적 블록으로
                }
            });
        }
    }

    _clearFarmTick() {
        if (this._farmTickTimer) { clearInterval(this._farmTickTimer); this._farmTickTimer = null; }
    }

    /** 대기실 미니맵 — 단순 플랫셀(인게임 텍스처 필드와 다름). 첫 던전은 제공.
     *  (밝혀진 만큼만/안개 반영은 후속 — 지금은 전체 렌더.) */
    _renderPrepMinimap(canvas, dungeonId) {
        if (!canvas) return;
        let g;
        try { g = loadDungeon(dungeonId); } catch { return; }
        const maxDim = 168;
        const cell = Math.max(2, Math.floor(maxDim / Math.max(g.width, g.height)));
        const w = g.width * cell, h = g.height * cell;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#0c0a08'; ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < g.height; y++) {
            for (let x = 0; x < g.width; x++) {
                const tile = g.getTile(x, y);
                let color = '#1d1813';                                  // floor/empty
                if (tile === TileType.WALL) color = '#3a352d';
                else if (tile === TileType.GOAL) color = '#5a8f4e';
                else if (tile === TileType.GOLD) color = '#e6b450';
                else if (tile === TileType.MONSTER || tile === TileType.TRAP) color = '#a83a2f';
                else if (tile === TileType.HEAL) color = '#3a8f7a';
                else if (tile === TileType.START) color = '#5b8fc2';
                ctx.fillStyle = color;
                ctx.fillRect(x * cell, y * cell, cell, cell);
            }
        }
    }

    _showOpeningCard(onClose) {
        const overlay = document.getElementById('opening-overlay');
        const startBtn = document.getElementById('opening-start');
        if (!overlay || !startBtn) { onClose?.(); return; }
        overlay.style.display = 'flex';
        startBtn.focus();
        const handler = () => {
            overlay.style.display = 'none';
            startBtn.removeEventListener('click', handler);
            document.removeEventListener('keydown', keyHandler);
            onClose?.();
        };
        // Task #15: 키보드 진입 (Enter / Space / 방향키 모두 시작)
        const keyHandler = (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow') ||
                e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd' ||
                e.key === 'W' || e.key === 'A' || e.key === 'S' || e.key === 'D') {
                e.preventDefault();
                handler();
            }
        };
        startBtn.addEventListener('click', handler);
        document.addEventListener('keydown', keyHandler);
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
        this.renderer.setCameraFollow(false);   // composer preview = full-map
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

        // New Run button — 게임오버(식량 소진) 후 길드로 복귀해 새 런 시작 (온보딩은 게이트로 재생 X)
        document.getElementById('btn-new-run').addEventListener('click', () => {
            this.startNewRun();
            this.screenManager.show('screen-guild');
            this.updateGuildHall();
        });

        // C-3: New Game+ button — 엔딩 후 길드로 복귀
        document.getElementById('btn-new-game-plus').addEventListener('click', () => {
            this.startNewGamePlus();
            this.screenManager.show('screen-guild');
            this.updateGuildHall();
        });

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
            this.syncCamera();   // overlays need the full-map view
            this.updateVisualization();
        });

        this.showPolicyCheck.addEventListener('change', (e) => {
            this.renderer.showPolicy = e.target.checked;
            this.syncCamera();
            this.updateVisualization();
        });

        // Initialize fog of war state
        this.renderer.fogOfWar = this.fogOfWarCheck.checked;
    }

    handleKeyDown(e) {
        // The opening sequence owns keyboard input while it is on screen —
        // otherwise arrow keys leak into the live run (wall-bump / death SFX).
        if (this.screenManager && this.screenManager.current === 'screen-opening') return;
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

        // Movement is arrow-keys only (single scheme; touch uses the D-pad).
        switch (e.key) {
            case 'ArrowUp':
                action = Action.UP;
                break;
            case 'ArrowDown':
                action = Action.DOWN;
                break;
            case 'ArrowLeft':
                action = Action.LEFT;
                break;
            case 'ArrowRight':
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

        // Task #27 (Cycle 5 P0): 디버그 메시지 박힘 제거 — briefing overlay 가 동일 정보 (Cost/Reward/HP/Slippery/Char/Train) 박힘. 캔버스 위 풀와이드 영문+학명 노출 회귀 해소.

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
        // Task #24: step0 (clearedDungeons.size === 0) 시점에 reset toast 박지 말기 — step0-hint 와 겹침 회피 (3차 진단 P0)
        if (this.runState.clearedDungeons.size > 0) {
            if (isBuiltIn && config.cost > 0) {
                this.showMessage(t('game.paid_entry', { cost: config.cost, food: this.runState.food }), 'warning');
            } else {
                this.showMessage(t('game.reset_log', { food: this.runState.food }), 'info');
            }
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
        this.syncCamera();

        // C-4: Treasure position
        this.carryingTreasure = false;
        this.computeTreasurePosition(this.currentDungeon);

        // C-5: Reset item contract flags (consumed at episode end, not start)
        this.activeDefenseContract = false;
        this.activeTrapNullify = false;

        // 튜토리얼 게임오버 방지 세이프넷 — per-attempt 리셋. 1차 보급(resupplyUsed)을
        // 쓴 뒤에만 2차 자동이동이 활성화. paused=보급 팝업 중 입력 차단, autoMoving=자동이동 중.
        this._cancelTutorAssist();
        this._tutorAssist = { resupplyUsed: false, autoMoving: false, paused: false, allowStep: false };

        this.updateUI();
        this.render();
    }

    handleAction(action) {
        if (this.done || this.isGameOver) return;

        // 튜토리얼 세이프넷 입력 가드 — 보급 팝업 중(paused)엔 전면 차단,
        // 자동이동 중(autoMoving)엔 내부 구동 스텝(allowStep)만 통과시키고 플레이어 입력 무시.
        const ta = this._tutorAssist;
        if (ta && (ta.paused || (ta.autoMoving && !ta.allowStep))) return;

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
            // 튜토리얼 최종 가드 — 첫 던전에선 굶주림 게임오버 절대 금지(세이프넷이 닿지 못한
            // 경우의 보험: BFS 도달 불가 등). 식량 보충 후 계속 진행.
            if (this._isTutorialRun()) {
                this.runState.food = STARTING_FOOD;
                this.updateUI();
                this.render();
                return;
            }
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

        // 튜토리얼 게임오버 방지 — 매 스텝 후 보급/자동이동 트리거 평가 (스텝 결과 반영된 상태에서).
        this._maybeTutorAssist();
    }

    // ========== 튜토리얼 게임오버 방지 세이프넷 ==========
    // 첫 던전(아직 한 번도 클리어 X) 한정. 1차 식량 보급(레플리 정식 등장) → 그 뒤에만
    // 2차 자동 이동(G까지 한 칸씩) 활성화. 식량은 스텝당 -2 라 보급 트리거(food<=2)가
    // 자동이동 트리거(food≈거리×2)보다 항상 나중 → "1차 보급 1회 사용 후 2차 해금" 게이트.
    // 맴돌이(뺑글뺑글)는 식량을 갉아먹으므로, food≈거리×2 트리거가 자연히 escort 로 흡수.

    /** 튜토리얼 1회성 마커 (localStorage 영속 — 런 리셋 무관). */
    _tutorialDone() {
        return localStorage.getItem(TUTORIAL_DONE_KEY) === '1';
    }

    /** 첫 던전 세션 종료(클리어/나가기) 시 1회 박음 → 세이프넷 OFF + 단축 온보딩 전환. */
    _markTutorialDone() {
        if (this._tutorialDone()) return;
        localStorage.setItem(TUTORIAL_DONE_KEY, '1');
    }

    /** 세이프넷은 튜토리얼 미완료 + 빌트인 + 수동 플레이일 때만. 1회성(localStorage). */
    _isTutorialRun() {
        return !this.isTraining
            && this.isBuiltInDungeon(this.currentDungeon)
            && !this._tutorialDone();
    }

    /**
     * agent → grid.goalPos 까지 BFS. walkable = isPassable && !isLethal(PIT 즉사 회피).
     * 반환 { dist, action } (action = 골 쪽 첫 걸음) — 도달 불가/이미 골이면 null.
     * 매 틱 재계산해 슬립 등으로 경로가 틀어져도 self-correct.
     */
    _bfsTowardGoal() {
        const grid = this.grid, goal = grid && grid.goalPos, ag = this.agent;
        if (!grid || !goal || !ag) return null;
        if (ag.x === goal.x && ag.y === goal.y) return null;
        const walkable = (x, y) => {
            if (!grid.isValidPosition(x, y)) return false;
            const tile = grid.getTile(x, y);
            return isPassable(tile) && !isLethal(tile);
        };
        const DIRS = [
            { a: Action.UP, dx: 0, dy: -1 },
            { a: Action.DOWN, dx: 0, dy: 1 },
            { a: Action.LEFT, dx: -1, dy: 0 },
            { a: Action.RIGHT, dx: 1, dy: 0 },
        ];
        const start = `${ag.x},${ag.y}`;
        const dist = new Map([[start, 0]]);
        const firstAction = new Map();        // "x,y" → 시작점에서의 첫 걸음 Action
        const queue = [{ x: ag.x, y: ag.y }];
        let qi = 0;
        while (qi < queue.length) {
            const cur = queue[qi++];
            const ck = `${cur.x},${cur.y}`;
            const cd = dist.get(ck);
            for (const d of DIRS) {
                const nx = cur.x + d.dx, ny = cur.y + d.dy;
                if (!walkable(nx, ny)) continue;
                const nk = `${nx},${ny}`;
                if (dist.has(nk)) continue;
                dist.set(nk, cd + 1);
                firstAction.set(nk, ck === start ? d.a : firstAction.get(ck));
                if (nx === goal.x && ny === goal.y) {
                    return { dist: cd + 1, action: firstAction.get(nk) };
                }
                queue.push({ x: nx, y: ny });
            }
        }
        return null;   // 도달 불가
    }

    /** 매 스텝 후 평가 — 보급(1차) 또는 자동이동(2차) 트리거. */
    _maybeTutorAssist() {
        const ta = this._tutorAssist;
        if (!ta || ta.paused || ta.autoMoving) return;
        if (this.done || this.isGameOver) return;
        if (!this._isTutorialRun()) return;
        const food = this.runState.food;

        if (ta.resupplyUsed) {
            // 2차 — 남은 식량으로 G까지 가는 게 빠듯해지기 직전(food ≤ 거리×2 + 버퍼2)에 escort.
            // 버퍼2 → 도착 시 food=2 로 굶주림 직전 안전 도달.
            const path = this._bfsTowardGoal();
            if (path && path.dist > 0 && food <= path.dist * 2 + 2) {
                this._startAutoMoveAssist();
            }
            return;
        }
        // 1차 — 레플리 보급. _maybeTutorAssist 는 consumeFood 적용 후 호출되므로 이 시점 food 는
        // 0 또는 2 (이동 1회분 이하). food<=2 비교라 둘 다 보급으로 흡수 → 굶주림 게임오버 도달
        // 전에 _startResupply 가 paused=true 로 다음 입력을 막아 직렬화. (food==2 보장 아님 주의)
        if (food <= 2) this._startResupply();
    }

    /** 1차 보급 — 게임 멈추고(paused) 레플리 정식 등장(초상+대사). 버튼 → 식량 보충 + 2차 해금. */
    _startResupply() {
        const ta = this._tutorAssist;
        if (ta.resupplyUsed || ta.paused) return;
        ta.paused = true;
        const overlay = document.getElementById('tutor-rescue-overlay');
        const speaker = document.getElementById('tutor-rescue-speaker');
        const text = document.getElementById('tutor-rescue-text');
        const btn = document.getElementById('btn-tutor-rescue');
        const portrait = document.getElementById('tutor-rescue-portrait');
        if (speaker) speaker.textContent = t('onboard.speaker.repli');
        if (text) text.textContent = t('tutor.rescue.text');
        if (btn) btn.textContent = t('tutor.rescue.ok');
        if (portrait) {
            const ctx = portrait.getContext('2d');
            ctx.clearRect(0, 0, portrait.width, portrait.height);
            drawRepliPortrait(ctx, portrait.width / 2, portrait.height - 12, 7);
        }
        const myTa = ta;     // 리셋으로 ta 가 교체되면 stale 클릭 무시
        const onOk = () => {
            if (this._tutorAssist !== myTa) return;
            if (overlay) overlay.style.display = 'none';
            this.runState.food = STARTING_FOOD;     // 든든하게 보충
            myTa.resupplyUsed = true;
            myTa.paused = false;
            this.updateUI();
            this.render();
        };
        if (btn) btn.addEventListener('click', onOk, { once: true });
        if (overlay) overlay.style.display = 'flex';
        sound.heal();
    }

    /** 2차 자동이동 — 대사 한 줄 → G 향해 한 칸씩(텀 두고). 도달 시 handleVictory 자연 클리어. */
    _startAutoMoveAssist() {
        const ta = this._tutorAssist;
        if (ta.autoMoving) return;
        ta.autoMoving = true;
        this.showMessage(t('tutor.assist.line'), 'info', { duration: 2200 });
        const STEP_MS = 320;
        const tick = () => {
            if (this._tutorAssist !== ta || !ta.autoMoving) return;
            if (this.done || this.isGameOver) { ta.autoMoving = false; return; }
            const path = this._bfsTowardGoal();
            if (!path || path.action == null) { ta.autoMoving = false; return; }
            ta.allowStep = true;
            this.handleAction(path.action);          // 식량 소모 + 골 도달 시 handleVictory
            ta.allowStep = false;
            if (this.done || this.isGameOver) { ta.autoMoving = false; return; }
            ta._timer = setTimeout(tick, STEP_MS);
        };
        ta._timer = setTimeout(tick, STEP_MS);
    }

    /** in-flight 자동이동 타이머/팝업 정리 (던전 리셋·이탈 시). */
    _cancelTutorAssist() {
        const ta = this._tutorAssist;
        if (ta) {
            if (ta._timer) { clearTimeout(ta._timer); ta._timer = null; }
            ta.autoMoving = false;
            ta.paused = false;
            ta.allowStep = false;
        }
        const overlay = document.getElementById('tutor-rescue-overlay');
        if (overlay) overlay.style.display = 'none';
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

        // 첫 던전(빌트인)을 깨면 튜토리얼 소진 → 세이프넷 OFF + 단축 온보딩 전환 (localStorage 영속).
        this._markTutorialDone();

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

            // Task #5+#28: progressive disclosure + tutorial chain 박힘 모두 map choice 후 시퀀셜 (celebration 동시 박힘 회피)
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
            this._showFirstClearCelebration();
            this.showMapChoiceOverlay(this.currentDungeon, config, unlockedNext);
        } else {
            sound.victory();
            const reward = config.repeatReward;
            this.runState.gold += reward;
            this.showMessage(t('game.clear_repeat', { reward, steps: this.steps, treasure: treasureMsg }), 'success');
            this.saveProgress();
            this.renderer.flash('rgba(34, 197, 94, 0.4)');
        }

        this.updateUI();
        this.updateItemUI();
    }

    // Task #23: First clear celebration (cycle 4 — 외부 비평 P0)
    _showFirstClearCelebration() {
        const el = document.getElementById('first-clear-celebration');
        if (!el) return;
        el.style.display = 'flex';
        el.classList.add('show');
        setTimeout(() => {
            el.classList.remove('show');
            el.style.display = 'none';
        }, 1800);
    }

    // Task #29 (Cycle 8 옵션 A — Q3): 첫 클리어 toast 와 함께 우측 'AI 학습' 섹션 강조
    // - 7s 자동 해제 또는 사용자가 학습 시작 클릭 시 즉시 해제 (startTraining)
    _pulseTrainingSection() {
        const el = document.getElementById('training-section');
        if (!el) return;
        el.classList.add('attention-pulse');
        if (this._pulseTrainTimer) clearTimeout(this._pulseTrainTimer);
        this._pulseTrainTimer = setTimeout(() => {
            el.classList.remove('attention-pulse');
            this._pulseTrainTimer = null;
        }, 7000);
    }

    _stopPulseTrainingSection() {
        const el = document.getElementById('training-section');
        if (el) el.classList.remove('attention-pulse');
        if (this._pulseTrainTimer) {
            clearTimeout(this._pulseTrainTimer);
            this._pulseTrainTimer = null;
        }
    }

    // B-5: Map choice overlay (sell vs keep map)
    showMapChoiceOverlay(dungeonId, config, unlockedNext) {
        const overlay = document.getElementById('map-choice-overlay');
        // 지도 팔기는 세르파 합류 후 해금 (canSellMaps 플레이스홀더 = 현재 false). 그 전까진
        // '팔기' 분기를 숨기고 '보관'만 → 첫 던전 지도 = 못 파는 형태.
        const canSell = this.runState.canSellMaps();
        const salePrice = this.runState.getMapSalePrice(dungeonId, DUNGEON_CONFIG);
        const levelMatch = dungeonId.match(/level_(\d+)/);
        const level = levelMatch ? parseInt(levelMatch[1]) : 1;
        const exclusiveRuns = this.runState.getExclusiveRuns(level);
        const exclusiveReward = 3 * config.repeatReward;
        const dungeonName = this.getDungeonDisplayName(dungeonId);

        let unlockMsg = '';
        if (unlockedNext) {
            const nextName = this.getDungeonDisplayName(DUNGEON_ORDER[DUNGEON_ORDER.indexOf(dungeonId) + 1]);
            unlockMsg = `<div class="map-unlock-msg">${t('overlay.map_choice.unlock_next', { name: nextName })}</div>`;
        }
        // C-2: Chapter join message
        if (this.newChapterInfo) {
            const names = this.newChapterInfo.storySerpas.map(s => CHARACTERS[s]?.name || s).join(', ');
            unlockMsg += `<div class="chapter-join-msg">${t('overlay.map_choice.chapter_join', { ch: this.newChapterInfo.chapter, name: this.newChapterInfo.name, members: names })}</div>`;
            this.newChapterInfo = null;
        }

        document.getElementById('map-choice-dungeon').textContent = `${dungeonName} (Lv.${level})`;
        document.getElementById('map-choice-details').innerHTML =
            `${unlockMsg}` +
            (canSell ? `<div>${t('overlay.map_choice.sell_detail', { price: salePrice })}</div>` : '') +
            `<div>${t('overlay.map_choice.keep_detail', { reward: exclusiveReward, runs: exclusiveRuns })}</div>`;

        // 세르파 전: 팔기 버튼 자체를 숨기고 stale 핸들러도 제거(보관만 노출).
        const sellBtn = document.getElementById('btn-sell-map');
        sellBtn.style.display = canSell ? '' : 'none';
        sellBtn.onclick = canSell ? () => {
            const earned = this.runState.sellMap(dungeonId, DUNGEON_CONFIG);
            overlay.style.display = 'none';
            this.showMessage(t('game.first_clear.map_sold', { earned }), 'success');
            this.saveProgress();
            this.updateUI();
            this.updateFarmingUI();
            this.updateItemUI();
            if (this._pendingFirstClearTutorials) {
                this._pendingFirstClearTutorials = false;
                this._queueFirstClearTutorials();
            }
        } : null;

        document.getElementById('btn-keep-map').onclick = () => {
            this.runState.keepMap(dungeonId);
            overlay.style.display = 'none';
            this.showMessage(t('game.first_clear.map_kept', { reward: exclusiveReward, runs: exclusiveRuns }), 'success');
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
        // Task #28 (Cycle 5): progressive disclosure (NEW! 배지 시퀀스) + tutorial 박힘 모두 시퀀셜 — celebration 1.8s 끝난 후
        setTimeout(() => this.updateProgressiveDisclosure(), 200);
        setTimeout(() => this.tutorial.tryShow('first_clear'), 1500);
        setTimeout(() => {
            if (this.runState.clearedDungeons.size === 1 && this.toast) {
                this.toast.show(t('tutorial.train_now'), 'info');
                // Task #29 (Cycle 8 옵션 A — Q3): 우측 'AI 학습' 섹션 일시 강조 (~7s 또는 학습 시작 버튼 클릭 시 해제)
                this._pulseTrainingSection();
            }
        }, 3000);
        setTimeout(() => {
            const curChapter = this.runState.getCurrentChapter();
            if (curChapter >= 2) this.tutorial.tryShow('chapter2');
            if (this.runState.clearedDungeons.size >= 1) this.tutorial.tryShow('first_farm_unlock');
        }, 4500);
    }

    // ========== Game Over & New Run ==========

    triggerGameOver(cause) {
        // T2B-1: Daily mode — never touch campaign run state
        if (this.isDailyDungeon(this.currentDungeon)) {
            this.handleDailyGameOver(cause);
            return;
        }

        // D-2026-06-02-18: 세르파 무한부활 1단계 — 사망은 기록만, 하드 한도 리스타트 없음
        // (부활 G소모 / G=0 파산은 경제루프 재설계 후속).
        this.runState.recordDeath();
        // C-4: Treasure fail on game over
        if (this.carryingTreasure) {
            this.runState.failTreasure(this.currentDungeon);
            this.carryingTreasure = false;
        }
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
            `Deaths: ${this.runState.deathCount}`,
            `Steps this run: ${this.steps}`
        ].join('<br>');

        this.gameOverOverlay.style.display = 'flex';
        sound.death();
    }

    startNewRun() {
        // Entry from game-over overlay AND from the guild menu "새 런" button.
        // D-2026-06-02-18: 사망 한도 리스타트 분기 폐기 → 항상 일반 새 런. (현재는 새 런이
        // 진행도 리셋 — "세르파 부활 시 진행 보존 / G=0 에서만 파산 리셋"은 G-경제 재설계 후속.)
        this.isGameOver = false;
        this.gameOverOverlay.style.display = 'none';

        this._onboardingRequested = true;   // 새 런 → 길드 복귀 시 단축 온보딩 재생 (튜토리얼 완료 후)
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

        // Task #29 (Cycle 8 옵션 A — Q3): 사용자가 학습 시작 박은 순간 attention-pulse 자동 해제
        this._stopPulseTrainingSection();

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
        this.syncCamera();   // training shows the full-map policy/Q view

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

    /**
     * Decide whether the player-follow camera is active and sync the renderer.
     * Follow only during manual single-stage play — training, the editor, and
     * the Q-value/policy overlays all need the full-map view. Render-only: this
     * never touches agent/grid coords, so sim/PPO determinism is unaffected.
     */
    syncCamera() {
        if (!this.grid) return;
        const multiStage = this.grid.getTotalStages && this.grid.getTotalStages() > 1;
        const follow = !multiStage
            && !this.isTraining
            && this.currentMode !== 'editor'
            && !this.renderer.showQValues
            && !this.renderer.showPolicy;
        this.renderer.setCameraFollow(follow);
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
