/**
 * Seeded PRNG utilities — shared across world generation (dungeon-generator.js),
 * daily seed mode (T2B-1), and modifier picking (T2B-2).
 *
 * NOTE: Math.random() in agent.js / nn.js / ppo.js stays untouched.
 * Seeding applies to *world generation*, not *learning stochasticity* (D-4).
 */

// Mulberry32: 32-bit state, ~2^32 period, decent uniformity for game PCG.
export function mulberry32(seed) {
    let s = seed | 0;
    return function () {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// FNV-1a 32-bit. Deterministic, no timezone/locale dependence.
export function hashStringSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

// UTC-based YYYY-MM-DD so every player gets the same key regardless of timezone.
export function utcDateKey(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function dailySeed(date = new Date()) {
    return hashStringSeed(utcDateKey(date));
}
