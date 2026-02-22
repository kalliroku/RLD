/**
 * RunState — Roguelike run state management
 * Manages per-run state (gold, hired characters, cleared dungeons, food)
 * and meta state (run number, persisted across runs).
 */

const FREE_CHARACTERS = ['qkun', 'sarsa', 'monte'];
const HIDDEN_CHARACTERS = ['scout'];

const HIRE_COSTS = {
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

const STARTING_GOLD = 500;

const RUN_STATE_KEY = 'rld_run_state';
const RUN_META_KEY = 'rld_run_meta';
const OLD_SAVE_KEY = 'rld_save_data';

export class RunState {
    constructor() {
        // Meta (persists across runs)
        this.runNumber = 1;
        this.totalSteps = 0;

        // Per-run state
        this.gold = STARTING_GOLD;
        this.food = 0;
        this.hiredCharacters = new Set();
        this.clearedDungeons = new Set();
        this.unlockedDungeons = new Set(['level_01_easy']);

        // Load saved state
        this.loadMeta();
        this.loadRunState();
    }

    // ========== Character queries ==========

    isCharacterFree(name) {
        return FREE_CHARACTERS.includes(name);
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

    // ========== Run lifecycle ==========

    startNewRun() {
        this.runNumber++;
        this.gold = STARTING_GOLD;
        this.food = 0;
        this.hiredCharacters = new Set();
        this.clearedDungeons = new Set();
        this.unlockedDungeons = new Set(['level_01_easy']);

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
                unlockedDungeons: Array.from(this.unlockedDungeons)
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
                totalSteps: this.totalSteps
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
export { FREE_CHARACTERS, HIDDEN_CHARACTERS, HIRE_COSTS, STARTING_GOLD };
