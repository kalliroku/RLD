/**
 * Modifier system — per-run modifiers picked from the daily seed so every
 * player gets the same set for the same day. M4 expansion: 12 modifiers in
 * two categories (environment / constraint). Daily-only (D-2026-05-12-9 — no
 * campaign exposure, no balance gate impact).
 *
 *   Environment (6):
 *     - slippery       : 30% chance per step that movement deflects sideways
 *                        (lighter cousin of grid.slippery FrozenLake at 2/3)
 *     - heavy_fog      : agent visibility range 5 → 3
 *     - dim_torch      : agent visibility range 5 → 2 (stronger fog)
 *     - poison_floor   : every empty-tile step costs 1 HP
 *     - acid_rain      : every 10 steps costs 3 HP (time pressure)
 *     - wind_gust      : 10% chance per step the action is wasted (lost turn)
 *
 *   Constraint (6):
 *     - two_only       : daily picks 2 characters from the available pool
 *     - hp_cap_50      : max HP capped at 50
 *     - mirror_input   : left/right inputs swapped (manual play only — daily
 *                        economy is isolated so food/HP-based constraints lose
 *                        their bite in daily mode)
 *     - no_heal        : heal tiles produce no HP recovery
 *     - damage_boost   : monster + trap damage × 1.5 (daily gold isolated, so
 *                        a gold-multiplier modifier would also be inert)
 *     - silent_q       : Q-value heatmap + sparkline visualization disabled
 *                        (RL-flavor inverse — the dungeon hides what the agent
 *                        thinks, forcing reliance on the simulation alone)
 *
 * All randomness is driven by `mulberry32(seed)` — never Math.random — so the
 * world-generation determinism guaranteed by D-2026-05-12-4 (학습 stochasticity
 * ≠ 세계 생성) extends to modifiers too.
 */

import { mulberry32 } from './rng.js';
import { Action } from './agent.js';

export const MODIFIERS = {
    // ── Environment ──
    slippery: {
        id: 'slippery', category: 'environment',
        name: '미끄러운 바닥',
        desc: '이동이 30% 확률로 옆으로 빗나갑니다.',
    },
    heavy_fog: {
        id: 'heavy_fog', category: 'environment',
        name: '안개 짙음',
        desc: '시야 범위 5 → 3 칸으로 축소.',
    },
    dim_torch: {
        id: 'dim_torch', category: 'environment',
        name: '횃불 꺼짐',
        desc: '시야 범위 5 → 2 칸으로 더욱 축소.',
    },
    poison_floor: {
        id: 'poison_floor', category: 'environment',
        name: '독 바닥',
        desc: '빈 칸을 밟을 때마다 HP -1.',
    },
    acid_rain: {
        id: 'acid_rain', category: 'environment',
        name: '산성비',
        desc: '10 스텝마다 HP -3 (시간 압박).',
    },
    wind_gust: {
        id: 'wind_gust', category: 'environment',
        name: '돌풍',
        desc: '10% 확률로 행동이 묶입니다.',
    },
    // ── Constraint ──
    two_only: {
        id: 'two_only', category: 'constraint',
        name: '두 명만',
        desc: '세르파 2명만 사용 가능.',
    },
    hp_cap_50: {
        id: 'hp_cap_50', category: 'constraint',
        name: 'HP 50 제한',
        desc: '최대 HP 가 50 으로 묶입니다.',
    },
    mirror_input: {
        id: 'mirror_input', category: 'constraint',
        name: '좌우 반전',
        desc: '수동 플레이 좌/우 입력이 뒤바뀝니다.',
    },
    no_heal: {
        id: 'no_heal', category: 'constraint',
        name: '회복 차단',
        desc: '회복 타일 효과가 사라집니다.',
    },
    damage_boost: {
        id: 'damage_boost', category: 'constraint',
        name: '치명상',
        desc: '몬스터·함정 피해 × 1.5.',
    },
    silent_q: {
        id: 'silent_q', category: 'constraint',
        name: '침묵의 학습',
        desc: 'Q-value 히트맵과 학습 sparkline 이 숨겨집니다.',
    },
};

export const MODIFIER_IDS = Object.keys(MODIFIERS);

const SLIPPERY_RATE = 0.30;
const WIND_GUST_RATE = 0.10;
export const DEFAULT_VISIBILITY_RANGE = 5;
export const HEAVY_FOG_VISIBILITY_RANGE = 3;
export const DIM_TORCH_VISIBILITY_RANGE = 2;
export const POISON_FLOOR_DAMAGE = 1;
export const ACID_RAIN_DAMAGE = 3;
export const ACID_RAIN_INTERVAL = 10;
export const HP_CAP_LIMIT = 50;
export const DAMAGE_BOOST_MULTIPLIER = 1.5;

// Salts keep the per-effect PRNG streams independent from each other and from
// the dungeon generator stream — same seed, different sub-streams.
const SALT_MOVEMENT = 0x6D6F4421;
const SALT_PICK     = 0xA5F0F00D;
const SALT_CHARS    = 0x43485220;
const SALT_WIND     = 0x57494E44;

export class ModifierSet {
    constructor(ids = [], seed = 0) {
        this.ids = new Set(ids);
        this.seed = seed >>> 0;
        // Per-effect PRNG streams — created lazily so an inactive modifier
        // doesn't consume a stream.
        this._movementRng = null;
        this._charRng = null;
        this._windRng = null;
    }

    has(id) { return this.ids.has(id); }

    isEmpty() { return this.ids.size === 0; }

    list() {
        return Array.from(this.ids).map(id => MODIFIERS[id]).filter(Boolean);
    }

    /**
     * Resolve movement under the slippery modifier.
     *  - Returns the (possibly deflected) action when slippery is active.
     *  - Returns null when the modifier does not apply — caller must fall back
     *    to its legacy path (e.g. grid.slippery FrozenLake).
     */
    resolveMovement(intendedAction) {
        if (!this.has('slippery')) return null;
        if (!this._movementRng) {
            this._movementRng = mulberry32((this.seed ^ SALT_MOVEMENT) >>> 0);
        }
        const r = this._movementRng();
        if (r >= SLIPPERY_RATE) return intendedAction;
        // Within the slip window, 50/50 left vs right perpendicular
        const isLeft = this._movementRng() < 0.5;
        if (isLeft) {
            return [Action.LEFT, Action.RIGHT, Action.DOWN, Action.UP][intendedAction];
        }
        return [Action.RIGHT, Action.LEFT, Action.UP, Action.DOWN][intendedAction];
    }

    visibilityRange(baseRange = DEFAULT_VISIBILITY_RANGE) {
        // dim_torch is stronger and takes precedence over heavy_fog if both active.
        if (this.has('dim_torch')) return DIM_TORCH_VISIBILITY_RANGE;
        if (this.has('heavy_fog')) return HEAVY_FOG_VISIBILITY_RANGE;
        return baseRange;
    }

    /**
     * wind_gust — 10% per-step chance to waste the turn. Seeded so the daily
     * is reproducible. Returns true when the action should be skipped.
     */
    shouldSkipTurn() {
        if (!this.has('wind_gust')) return false;
        if (!this._windRng) {
            this._windRng = mulberry32((this.seed ^ SALT_WIND) >>> 0);
        }
        return this._windRng() < WIND_GUST_RATE;
    }

    /** poison_floor — flat damage every step that lands on an empty tile. */
    poisonStepDamage() {
        return this.has('poison_floor') ? POISON_FLOOR_DAMAGE : 0;
    }

    /** acid_rain — flat damage every Nth step (caller tracks step count). */
    acidRainDamage(stepCount) {
        if (!this.has('acid_rain')) return 0;
        if (stepCount <= 0 || stepCount % ACID_RAIN_INTERVAL !== 0) return 0;
        return ACID_RAIN_DAMAGE;
    }

    /** hp_cap_50 — clamp the effective max HP. */
    clampMaxHp(maxHp) {
        return this.has('hp_cap_50') ? Math.min(maxHp, HP_CAP_LIMIT) : maxHp;
    }

    /** mirror_input — flip LEFT/RIGHT (manual play only). Pass the user action,
     *  receive the mirrored one. UP/DOWN unchanged. */
    mirrorInput(action) {
        if (!this.has('mirror_input')) return action;
        if (action === Action.LEFT) return Action.RIGHT;
        if (action === Action.RIGHT) return Action.LEFT;
        return action;
    }

    /** no_heal — heal tiles produce 0 HP. */
    healDisabled() {
        return this.has('no_heal');
    }

    /** damage_boost — multiplier applied to monster/trap damage to the agent. */
    damageMultiplier() {
        return this.has('damage_boost') ? DAMAGE_BOOST_MULTIPLIER : 1.0;
    }

    /** silent_q — Q-value heatmap + sparkline visualization should hide. */
    visualizationMuted() {
        return this.has('silent_q');
    }

    /**
     * For two_only: pick N characters from the available pool (already filtered
     * to characters this run can use). Seeded so every player gets the same 2.
     */
    pickCharacterPool(availableIds, count = 2) {
        if (!this.has('two_only')) return availableIds.slice();
        if (!this._charRng) {
            this._charRng = mulberry32((this.seed ^ SALT_CHARS) >>> 0);
        }
        const pool = availableIds.slice();
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(this._charRng() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, Math.min(count, pool.length));
    }
}

/**
 * Pick `count` modifier ids deterministically from `seed`. No repeats.
 * Pure function; callers can rerun with the same seed and get the same set.
 */
export function pickModifiers(seed, count = 1) {
    const rng = mulberry32(((seed >>> 0) ^ SALT_PICK) >>> 0);
    const candidates = MODIFIER_IDS.slice();
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates.slice(0, Math.min(count, candidates.length));
}
