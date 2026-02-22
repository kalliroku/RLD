/**
 * RunState — Roguelike run state management
 * Manages per-run state (gold, hired characters, cleared dungeons, food,
 * answer paths, character levels, farming, map status, hints, treasure, inventory)
 * and meta state (run number, records, NG+, persisted across runs).
 */

const FREE_CHARACTERS = ['qkun', 'sarsa', 'monte'];
const HIDDEN_CHARACTERS = ['scout'];

const HIRE_COSTS = {
    sarsa: 150,      // free at Ch.2, early hire cost
    monte: 250,      // free at Ch.3, early hire cost
    gradi: 200,
    tracer: 600,
    dyna: 600,
    critic: 1000,
    qvkun: 1000,
    acla: 1000,
    exsa: 1000,
    doubleq: 1000,
    ensemble: 2000,
    treeback: 2000,
    sweeper: 2000
};

const STARTING_GOLD = 800;

// B-3: Character base stats and upgrade costs
const CHARACTER_STATS = {
    qkun:     { baseStr: 100, strPerLv: 30, secondary: null,      cost: 100 },
    gradi:    { baseStr: 80,  strPerLv: 20, secondary: null,      cost: 80 },
    sarsa:    { baseStr: 80,  strPerLv: 20, secondary: 'hp',   hpPerLv: 10,  cost: 150 },
    monte:    { baseStr: 100, strPerLv: 40, secondary: 'hp',   hpPerLv: 5,   cost: 150 },
    tracer:   { baseStr: 80,  strPerLv: 20, secondary: 'hp',   hpPerLv: 5,   cost: 150 },
    dyna:     { baseStr: 60,  strPerLv: 10, secondary: 'agility', cost: 200 },
    critic:   { baseStr: 70,  strPerLv: 15, secondary: 'agility', cost: 200 },
    acla:     { baseStr: 70,  strPerLv: 15, secondary: 'agility', cost: 200 },
    treeback: { baseStr: 80,  strPerLv: 25, secondary: 'agility', cost: 250 },
    sweeper:  { baseStr: 70,  strPerLv: 15, secondary: 'agility', cost: 250 },
    exsa:     { baseStr: 80,  strPerLv: 20, secondary: 'hp',   hpPerLv: 10,  cost: 200 },
    doubleq:  { baseStr: 80,  strPerLv: 20, secondary: 'hp',   hpPerLv: 10,  cost: 200 },
    qvkun:    { baseStr: 70,  strPerLv: 15, secondary: 'hp',   hpPerLv: 5,   cost: 200 },
    ensemble: { baseStr: 100, strPerLv: 30, secondary: 'hp',   hpPerLv: 5,   cost: 300 },
};

// Chapter configuration (§11)
const CHAPTER_CONFIG = [
    { chapter: 1, name: '첫 발걸음', dungeons: ['level_01_easy', 'level_02_trap', 'level_03_maze'], storySerpas: ['qkun'] },
    { chapter: 2, name: '위험한 길', dungeons: ['level_04_pit', 'level_05_gold', 'level_06_risk', 'level_07_gauntlet'], storySerpas: ['sarsa'] },
    { chapter: 3, name: '넓은 세계', dungeons: ['level_08_deadly', 'level_09_treasure', 'level_10_final', 'level_11_hp_test', 'level_12_hp_gauntlet'], storySerpas: ['monte', 'tracer', 'dyna'] },
    { chapter: 4, name: '직감과 비평', dungeons: ['level_13_cliff', 'level_14_long_hall', 'level_15_multi_room', 'level_16_open_field', 'level_17_two_paths'], storySerpas: ['gradi', 'critic'] },
    { chapter: 5, name: '합의의 힘', dungeons: ['level_18_dead_end', 'level_19_bridge', 'level_20_sacrifice', 'level_21_desert', 'level_22_arena', 'level_23_mirage', 'level_24_paper_maze', 'level_25_paper_hard'], storySerpas: ['qvkun', 'acla', 'ensemble'] },
    { chapter: 6, name: '불확실한 바닥', dungeons: ['level_26_frozen_lake', 'level_27_ice_maze', 'level_28_frozen_cliff'], storySerpas: ['exsa', 'doubleq'] },
    { chapter: 7, name: '심연', dungeons: ['level_29_big_maze', 'level_30_generated_cave', 'level_31_generated_rooms'], storySerpas: ['treeback', 'sweeper'] },
];

// All 31 built-in dungeon IDs (for ending detection)
const ALL_DUNGEON_IDS = [
    'level_01_easy', 'level_02_trap', 'level_03_maze',
    'level_04_pit', 'level_05_gold', 'level_06_risk', 'level_07_gauntlet',
    'level_08_deadly', 'level_09_treasure', 'level_10_final', 'level_11_hp_test', 'level_12_hp_gauntlet',
    'level_13_cliff', 'level_14_long_hall', 'level_15_multi_room', 'level_16_open_field', 'level_17_two_paths',
    'level_18_dead_end', 'level_19_bridge', 'level_20_sacrifice', 'level_21_desert', 'level_22_arena', 'level_23_mirage', 'level_24_paper_maze', 'level_25_paper_hard',
    'level_26_frozen_lake', 'level_27_ice_maze', 'level_28_frozen_cliff',
    'level_29_big_maze', 'level_30_generated_cave', 'level_31_generated_rooms'
];

// Dungeon treasures (§8.3) — not all dungeons have treasure
const DUNGEON_TREASURES = {
    level_05_gold:            { value: 100 },
    level_09_treasure:        { value: 300 },
    level_10_final:           { value: 500 },
    level_15_multi_room:      { value: 150 },
    level_20_sacrifice:       { value: 250 },
    level_22_arena:           { value: 400 },
    level_25_paper_hard:      { value: 200 },
    level_28_frozen_cliff:    { value: 350 },
    level_29_big_maze:        { value: 600 },
    level_31_generated_rooms: { value: 800 },
};

// Items (§5, §8.4)
const ITEMS = {
    escape_rope:      { name: '긴급 탈출 로프', cost: 100, description: '즉시 입구로 귀환 (사망 방지)' },
    defense_contract: { name: '방어 용병 계약', cost: 150, description: '1에피소드 피해 반감' },
    trap_nullify:     { name: '함정 해제사 계약', cost: 200, description: '1에피소드 함정 무효' },
};

const RUN_STATE_KEY = 'rld_run_state';
const RUN_META_KEY = 'rld_run_meta';
const OLD_SAVE_KEY = 'rld_save_data';

export class RunState {
    constructor() {
        // Meta — playthrough-level (persists across runs within a playthrough)
        this.runNumber = 1;
        this.totalSteps = 0;
        this.deathCount = 0;
        this.serpaClearCounts = {};   // { charName: totalClears }
        this.totalFarmingSteps = 0;

        // Meta — cross-playthrough (persists even across NG+)
        this.ngPlusCount = 0;
        this.bestTotalSteps = null;  // null = no completion yet

        // Per-run state
        this.gold = STARTING_GOLD;
        this.food = 0;
        this.hiredCharacters = new Set();
        this.clearedDungeons = new Set();
        this.unlockedDungeons = new Set(['level_01_easy']);

        // B-2: Answer paths (best clear path per dungeon)
        this.answerPaths = {};  // { dungeonId: { actions: [...], steps: N, character: 'qkun' } }

        // B-3: Character levels (1-3, max 2 upgrades)
        this.characterLevels = {};  // { charName: 1~3 }

        // B-4: Farming assignments
        this.farmingAssignments = {};  // { charName: dungeonId }

        // B-5: Map status per dungeon
        this.mapStatus = {};  // { dungeonId: { status: 'exclusive'|'normal', exclusiveRunsLeft: N } }

        // B-6: Purchased hints
        this.purchasedHints = {};  // { dungeonId: [hintIndex, ...] }

        // Treasure status (per-run)
        this.treasureStatus = {};  // { dungeonId: { collected: bool, failCount: N } }

        // Inventory (per-run)
        this.inventory = {};  // { itemId: count }

        // Load saved state
        this.loadMeta();
        this.loadRunState();
    }

    // ========== Chapter queries (§11) ==========

    getCurrentChapter() {
        let maxChapter = 1;
        for (const ch of CHAPTER_CONFIG) {
            for (const dungeonId of ch.dungeons) {
                if (this.unlockedDungeons.has(dungeonId)) {
                    maxChapter = Math.max(maxChapter, ch.chapter);
                    break;
                }
            }
        }
        return maxChapter;
    }

    getChapterForDungeon(dungeonId) {
        for (const ch of CHAPTER_CONFIG) {
            if (ch.dungeons.includes(dungeonId)) {
                return ch.chapter;
            }
        }
        return 0;
    }

    getChapterName(chapterNum) {
        const ch = CHAPTER_CONFIG.find(c => c.chapter === chapterNum);
        return ch ? ch.name : '';
    }

    getChapterConfig(chapterNum) {
        return CHAPTER_CONFIG.find(c => c.chapter === chapterNum) || null;
    }

    // ========== Character queries ==========

    isCharacterFree(name) {
        // Chapter-based: serpas join free when their chapter is reached
        const chapter = this.getCurrentChapter();
        for (const ch of CHAPTER_CONFIG) {
            if (ch.chapter <= chapter && ch.storySerpas.includes(name)) {
                return true;
            }
        }
        return false;
    }

    isCharacterAvailable(name) {
        return this.isCharacterFree(name) || this.hiredCharacters.has(name);
    }

    isCharacterLocked(name) {
        return !this.isCharacterFree(name) && !this.hiredCharacters.has(name) && !HIDDEN_CHARACTERS.includes(name);
    }

    isCharacterHidden(name) {
        return HIDDEN_CHARACTERS.includes(name);
    }

    getHireCost(name) {
        return HIRE_COSTS[name] ?? 0;
    }

    // ========== Actions ==========

    hireCharacter(name) {
        const cost = this.getHireCost(name);
        if (this.gold < cost) return false;
        if (this.isCharacterAvailable(name)) return false;
        if (this.isCharacterHidden(name)) return false;

        this.gold -= cost;
        this.hiredCharacters.add(name);
        this.saveRunState();
        return true;
    }

    buyFood(amount) {
        const cost = amount; // 1G per food
        if (this.gold < cost) return false;
        this.gold -= cost;
        this.food += amount;
        this.saveRunState();
        return true;
    }

    consumeFood() {
        if (this.food <= 0) return false;
        this.food--;
        return true;
    }

    // ========== B-2: Answer Paths ==========

    recordAnswerPath(dungeonId, actions, steps, character) {
        const existing = this.answerPaths[dungeonId];
        if (!existing || steps < existing.steps) {
            this.answerPaths[dungeonId] = {
                actions: [...actions],
                steps,
                character
            };
            this.saveRunState();
            return true;
        }
        return false;
    }

    getAnswerPath(dungeonId) {
        return this.answerPaths[dungeonId] || null;
    }

    // ========== B-3: Character Stats & Upgrades ==========

    getCharacterLevel(name) {
        return this.characterLevels[name] || 1;
    }

    getUpgradeCost(name) {
        const stats = CHARACTER_STATS[name];
        if (!stats) return Infinity;
        return stats.cost;
    }

    canUpgradeCharacter(name) {
        if (!this.isCharacterAvailable(name)) return false;
        if (this.getCharacterLevel(name) >= 3) return false;
        return this.gold >= this.getUpgradeCost(name);
    }

    upgradeCharacter(name) {
        if (!this.canUpgradeCharacter(name)) return false;
        const cost = this.getUpgradeCost(name);
        this.gold -= cost;
        this.characterLevels[name] = this.getCharacterLevel(name) + 1;
        this.saveRunState();
        return true;
    }

    getStrength(name) {
        const stats = CHARACTER_STATS[name];
        if (!stats) return 100;
        const level = this.getCharacterLevel(name);
        return stats.baseStr + stats.strPerLv * (level - 1);
    }

    getMaxHp(name) {
        const stats = CHARACTER_STATS[name];
        if (!stats) return 100;
        if (stats.secondary !== 'hp') return 100;
        const level = this.getCharacterLevel(name);
        return 100 + (stats.hpPerLv || 0) * (level - 1);
    }

    getAgilityMultiplier(name) {
        const stats = CHARACTER_STATS[name];
        if (!stats || stats.secondary !== 'agility') return 1.0;
        const level = this.getCharacterLevel(name);
        return 1.0 + 0.5 * (level - 1);
    }

    // ========== B-4: Farming ==========

    assignFarming(charName, dungeonId, dungeonConfig) {
        if (!this.isCharacterAvailable(charName)) return false;
        if (!this.canFarm(charName, dungeonId, dungeonConfig)) return false;
        this.farmingAssignments[charName] = dungeonId;
        this.saveRunState();
        return true;
    }

    removeFarming(charName) {
        if (!this.farmingAssignments[charName]) return false;
        delete this.farmingAssignments[charName];
        this.saveRunState();
        return true;
    }

    isFarming(charName) {
        return !!this.farmingAssignments[charName];
    }

    getFarmingDungeon(charName) {
        return this.farmingAssignments[charName] || null;
    }

    canFarm(charName, dungeonId, dungeonConfig) {
        const path = this.getAnswerPath(dungeonId);
        if (!path) return false;
        const strength = this.getStrength(charName);
        if (path.steps > strength) return false;
        if (!this.isCharacterAvailable(charName)) return false;
        return true;
    }

    executeFarming(charName, dungeonConfig) {
        const dungeonId = this.farmingAssignments[charName];
        if (!dungeonId) return { gold: 0 };

        const config = dungeonConfig[dungeonId];
        if (!config) return { gold: 0 };

        const path = this.getAnswerPath(dungeonId);
        const farmingSteps = path ? path.steps : 0;

        const mapInfo = this.mapStatus[dungeonId];
        let reward;
        let message = '';

        if (mapInfo && mapInfo.status === 'exclusive' && mapInfo.exclusiveRunsLeft > 0) {
            reward = 3 * config.repeatReward;
            mapInfo.exclusiveRunsLeft--;
            if (mapInfo.exclusiveRunsLeft <= 0) {
                mapInfo.status = 'normal';
                message = 'exclusive_expired';
            }
        } else {
            reward = config.repeatReward;
        }

        this.gold += reward;

        // Record farming steps in total (§10.1)
        if (farmingSteps > 0) {
            this.totalFarmingSteps += farmingSteps;
            this.totalSteps += farmingSteps;
            this.saveMeta();
        }

        this.saveRunState();
        return { gold: reward, steps: farmingSteps, message };
    }

    // ========== B-5: Map Status ==========

    getMapStatus(dungeonId) {
        return this.mapStatus[dungeonId] || null;
    }

    getExclusiveRuns(dungeonLevel) {
        if (dungeonLevel <= 5) return 4;
        if (dungeonLevel <= 20) return 8;
        return 13;
    }

    sellMap(dungeonId, dungeonConfig) {
        const config = dungeonConfig[dungeonId];
        if (!config) return 0;

        const levelMatch = dungeonId.match(/level_(\d+)/);
        const level = levelMatch ? parseInt(levelMatch[1]) : 1;
        const exclusiveRuns = this.getExclusiveRuns(level);
        const exclusiveReward = 3 * config.repeatReward;
        const mapValue = exclusiveReward * exclusiveRuns;
        const salePrice = Math.floor(mapValue / 10);

        this.mapStatus[dungeonId] = { status: 'normal', exclusiveRunsLeft: 0 };
        this.gold += salePrice;
        this.saveRunState();
        return salePrice;
    }

    keepMap(dungeonId) {
        const levelMatch = dungeonId.match(/level_(\d+)/);
        const level = levelMatch ? parseInt(levelMatch[1]) : 1;
        const exclusiveRuns = this.getExclusiveRuns(level);

        this.mapStatus[dungeonId] = { status: 'exclusive', exclusiveRunsLeft: exclusiveRuns };
        this.saveRunState();
    }

    getMapSalePrice(dungeonId, dungeonConfig) {
        const config = dungeonConfig[dungeonId];
        if (!config) return 0;
        const levelMatch = dungeonId.match(/level_(\d+)/);
        const level = levelMatch ? parseInt(levelMatch[1]) : 1;
        const exclusiveRuns = this.getExclusiveRuns(level);
        const exclusiveReward = 3 * config.repeatReward;
        const mapValue = exclusiveReward * exclusiveRuns;
        return Math.floor(mapValue / 10);
    }

    // ========== B-6: Hints ==========

    purchaseHint(dungeonId, hintIndex, cost) {
        if (this.gold < cost) return false;
        if (!this.purchasedHints[dungeonId]) {
            this.purchasedHints[dungeonId] = [];
        }
        if (this.purchasedHints[dungeonId].includes(hintIndex)) return false;
        this.gold -= cost;
        this.purchasedHints[dungeonId].push(hintIndex);
        this.saveRunState();
        return true;
    }

    hasHint(dungeonId, hintIndex) {
        return this.purchasedHints[dungeonId]?.includes(hintIndex) ?? false;
    }

    // ========== Treasure (§8.3) ==========

    hasDungeonTreasure(dungeonId) {
        if (!DUNGEON_TREASURES[dungeonId]) return false;
        const status = this.treasureStatus[dungeonId];
        return !status || !status.collected;
    }

    isTreasureCollected(dungeonId) {
        const status = this.treasureStatus[dungeonId];
        return status ? status.collected : false;
    }

    getTreasureValue(dungeonId) {
        const treasure = DUNGEON_TREASURES[dungeonId];
        return treasure ? treasure.value : 0;
    }

    getTreasureFailCount(dungeonId) {
        const status = this.treasureStatus[dungeonId];
        return status ? (status.failCount || 0) : 0;
    }

    collectTreasure(dungeonId) {
        if (!this.hasDungeonTreasure(dungeonId)) return 0;
        const value = this.getTreasureValue(dungeonId);
        if (!this.treasureStatus[dungeonId]) {
            this.treasureStatus[dungeonId] = { collected: false, failCount: 0 };
        }
        this.treasureStatus[dungeonId].collected = true;
        this.gold += value;
        this.saveRunState();
        return value;
    }

    failTreasure(dungeonId) {
        if (!DUNGEON_TREASURES[dungeonId]) return;
        if (!this.treasureStatus[dungeonId]) {
            this.treasureStatus[dungeonId] = { collected: false, failCount: 0 };
        }
        if (!this.treasureStatus[dungeonId].collected) {
            this.treasureStatus[dungeonId].failCount++;
            this.saveRunState();
        }
    }

    // ========== Items (§5, §8.4) ==========

    getItemInfo(itemId) {
        return ITEMS[itemId] || null;
    }

    getItemCount(itemId) {
        return this.inventory[itemId] || 0;
    }

    hasItem(itemId) {
        return this.getItemCount(itemId) > 0;
    }

    buyItem(itemId) {
        const item = ITEMS[itemId];
        if (!item) return false;
        if (this.gold < item.cost) return false;
        this.gold -= item.cost;
        this.inventory[itemId] = (this.inventory[itemId] || 0) + 1;
        this.saveRunState();
        return true;
    }

    useItem(itemId) {
        if (!this.hasItem(itemId)) return false;
        this.inventory[itemId]--;
        if (this.inventory[itemId] <= 0) {
            delete this.inventory[itemId];
        }
        this.saveRunState();
        return true;
    }

    // ========== Ending detection (§10) ==========

    isAllDungeonsCleared() {
        return ALL_DUNGEON_IDS.every(id => this.clearedDungeons.has(id));
    }

    getClearedCount() {
        let count = 0;
        for (const id of ALL_DUNGEON_IDS) {
            if (this.clearedDungeons.has(id)) count++;
        }
        return count;
    }

    getTotalDungeonCount() {
        return ALL_DUNGEON_IDS.length;
    }

    // ========== Record tracking (§10.1) ==========

    recordDeath() {
        this.deathCount++;
        this.saveMeta();
    }

    recordSerpaClear(charName) {
        this.serpaClearCounts[charName] = (this.serpaClearCounts[charName] || 0) + 1;
        this.saveMeta();
    }

    getMostActiveSerpa() {
        let best = null;
        let bestCount = 0;
        for (const [name, count] of Object.entries(this.serpaClearCounts)) {
            if (count > bestCount) {
                best = name;
                bestCount = count;
            }
        }
        return best ? { name: best, clears: bestCount } : null;
    }

    getUsedSerpaCount() {
        return Object.keys(this.serpaClearCounts).length;
    }

    getEndingStats() {
        return {
            totalSteps: this.totalSteps,
            deathCount: this.deathCount,
            runNumber: this.runNumber,
            serpaClearCounts: { ...this.serpaClearCounts },
            totalFarmingSteps: this.totalFarmingSteps,
            mostActiveSerpa: this.getMostActiveSerpa(),
            usedSerpaCount: this.getUsedSerpaCount(),
            clearedCount: this.getClearedCount(),
            ngPlusCount: this.ngPlusCount,
            bestTotalSteps: this.bestTotalSteps,
        };
    }

    // ========== New Game+ (§10.3) ==========

    isNewGamePlus() {
        return this.ngPlusCount > 0;
    }

    startNewGamePlus() {
        // Record completion
        if (this.bestTotalSteps === null || this.totalSteps < this.bestTotalSteps) {
            this.bestTotalSteps = this.totalSteps;
        }
        this.ngPlusCount++;

        // Reset playthrough-level meta
        this.totalSteps = 0;
        this.deathCount = 0;
        this.serpaClearCounts = {};
        this.totalFarmingSteps = 0;
        this.runNumber = 1;

        // Reset per-run state
        this.gold = STARTING_GOLD;
        this.food = 0;
        this.hiredCharacters = new Set();
        this.clearedDungeons = new Set();
        this.unlockedDungeons = new Set(['level_01_easy']);
        this.answerPaths = {};
        this.characterLevels = {};
        this.farmingAssignments = {};
        this.mapStatus = {};
        this.purchasedHints = {};
        this.treasureStatus = {};
        this.inventory = {};

        this.saveMeta();
        this.saveRunState();
    }

    // ========== Run lifecycle ==========

    startNewRun() {
        this.runNumber++;
        this.gold = STARTING_GOLD;
        this.food = 0;
        this.hiredCharacters = new Set();
        this.clearedDungeons = new Set();
        this.unlockedDungeons = new Set(['level_01_easy']);

        // Reset per-run economy state
        this.answerPaths = {};
        this.characterLevels = {};
        this.farmingAssignments = {};
        this.mapStatus = {};
        this.purchasedHints = {};
        this.treasureStatus = {};
        this.inventory = {};

        this.saveMeta();
        this.saveRunState();
    }

    // ========== Persistence — Run state ==========

    saveRunState() {
        try {
            const data = {
                gold: this.gold,
                food: this.food,
                hiredCharacters: Array.from(this.hiredCharacters),
                clearedDungeons: Array.from(this.clearedDungeons),
                unlockedDungeons: Array.from(this.unlockedDungeons),
                answerPaths: this.answerPaths,
                characterLevels: this.characterLevels,
                farmingAssignments: this.farmingAssignments,
                mapStatus: this.mapStatus,
                purchasedHints: this.purchasedHints,
                treasureStatus: this.treasureStatus,
                inventory: this.inventory,
            };
            localStorage.setItem(RUN_STATE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save run state:', e);
        }
    }

    loadRunState() {
        try {
            const saved = localStorage.getItem(RUN_STATE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.gold = data.gold ?? STARTING_GOLD;
                this.food = data.food ?? 0;
                this.hiredCharacters = new Set(data.hiredCharacters ?? []);
                this.clearedDungeons = new Set(data.clearedDungeons ?? []);
                this.unlockedDungeons = new Set(data.unlockedDungeons ?? ['level_01_easy']);
                this.answerPaths = data.answerPaths ?? {};
                this.characterLevels = data.characterLevels ?? {};
                this.farmingAssignments = data.farmingAssignments ?? {};
                this.mapStatus = data.mapStatus ?? {};
                this.purchasedHints = data.purchasedHints ?? {};
                this.treasureStatus = data.treasureStatus ?? {};
                this.inventory = data.inventory ?? {};
            } else {
                // Try migrate from old save
                this.migrateFromOldSave();
            }
        } catch (e) {
            console.warn('Failed to load run state:', e);
        }
    }

    // ========== Persistence — Meta ==========

    saveMeta() {
        try {
            const data = {
                runNumber: this.runNumber,
                totalSteps: this.totalSteps,
                deathCount: this.deathCount,
                serpaClearCounts: this.serpaClearCounts,
                totalFarmingSteps: this.totalFarmingSteps,
                ngPlusCount: this.ngPlusCount,
                bestTotalSteps: this.bestTotalSteps,
            };
            localStorage.setItem(RUN_META_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save meta:', e);
        }
    }

    loadMeta() {
        try {
            const saved = localStorage.getItem(RUN_META_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.runNumber = data.runNumber ?? 1;
                this.totalSteps = data.totalSteps ?? 0;
                this.deathCount = data.deathCount ?? 0;
                this.serpaClearCounts = data.serpaClearCounts ?? {};
                this.totalFarmingSteps = data.totalFarmingSteps ?? 0;
                this.ngPlusCount = data.ngPlusCount ?? 0;
                this.bestTotalSteps = data.bestTotalSteps ?? null;
            }
        } catch (e) {
            console.warn('Failed to load meta:', e);
        }
    }

    // ========== Migration ==========

    migrateFromOldSave() {
        try {
            const old = localStorage.getItem(OLD_SAVE_KEY);
            if (!old) return;

            const data = JSON.parse(old);
            // Start fresh run with starting gold, but keep dungeon progress
            this.gold = STARTING_GOLD;
            this.food = 0;
            this.hiredCharacters = new Set();
            this.clearedDungeons = new Set(data.clearedDungeons ?? []);
            this.unlockedDungeons = new Set(data.unlockedDungeons ?? ['level_01_easy']);

            // Save in new format
            this.saveRunState();
            this.saveMeta();

            // Remove old key
            localStorage.removeItem(OLD_SAVE_KEY);
            console.log('Migrated old save data to new run state format');
        } catch (e) {
            console.warn('Migration from old save failed:', e);
        }
    }
}

// Export constants for use in UI
export {
    FREE_CHARACTERS, HIDDEN_CHARACTERS, HIRE_COSTS, STARTING_GOLD, CHARACTER_STATS,
    CHAPTER_CONFIG, ALL_DUNGEON_IDS, DUNGEON_TREASURES, ITEMS
};
