/**
 * Modifier system (T2B-2) — per-run modifiers picked from the daily seed so
 * every player gets the same set for the same day. Three MVP modifiers:
 *
 *   - slippery   : 30% chance per step that movement deflects sideways
 *                  (lighter cousin of grid.slippery FrozenLake which stays 2/3)
 *   - two_only   : daily mode picks 2 characters from the available pool
 *   - heavy_fog  : agent visibility range halved
 *
 * All randomness is driven by `mulberry32(seed)` — never Math.random — so the
 * world-generation determinism guaranteed by [[project_kiosk_design]]
 * (D-2026-05-12-4: 학습 stochasticity ≠ 세계 생성) extends to modifiers too.
 */

import { mulberry32 } from './rng.js';
import { Action } from './agent.js';

export const MODIFIERS = {
    slippery: {
        id: 'slippery',
        name: '미끄러운 바닥',
        desc: '이동이 30% 확률로 옆으로 빗나갑니다.',
    },
    two_only: {
        id: 'two_only',
        name: '두 명만',
        desc: '오늘의 도전은 세르파 2명만 사용 가능.',
    },
    heavy_fog: {
        id: 'heavy_fog',
        name: '안개 짙음',
        desc: '시야 범위가 절반으로 축소됩니다.',
    },
};

export const MODIFIER_IDS = Object.keys(MODIFIERS);

const SLIPPERY_RATE = 0.30;
export const DEFAULT_VISIBILITY_RANGE = 5;
export const HEAVY_FOG_VISIBILITY_RANGE = 3;

// Salts keep the per-effect PRNG streams independent from each other and from
// the dungeon generator stream — same seed, different sub-streams.
const SALT_MOVEMENT = 0x6D6F4421;
const SALT_PICK     = 0xA5F0F00D;
const SALT_CHARS    = 0x43485220;

export class ModifierSet {
    constructor(ids = [], seed = 0) {
        this.ids = new Set(ids);
        this.seed = seed >>> 0;
        // Per-effect PRNG streams — created lazily so an inactive modifier
        // doesn't consume a stream.
        this._movementRng = null;
        this._charRng = null;
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
        if (this.has('heavy_fog')) return HEAVY_FOG_VISIBILITY_RANGE;
        return baseRange;
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
