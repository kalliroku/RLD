/**
 * Daily Mode — 시드 기반 일일 챌린지 (T2B-1).
 * Daily state is *separate* from campaign run-state (`rld_run_state`) so that
 * NG+ resets or save migrations don't wipe daily history.
 */

import { dailySeed, utcDateKey } from './rng.js';
import { pickModifiers } from './modifiers.js';

const DAILY_HISTORY_KEY = 'rld_daily_history';

export class DailyHistory {
    constructor() {
        this.records = [];
        this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(DAILY_HISTORY_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                this.records = Array.isArray(data) ? data : [];
            }
        } catch (e) {
            console.warn('Failed to load daily history:', e);
            this.records = [];
        }
    }

    save() {
        try {
            localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(this.records));
        } catch (e) {
            console.warn('Failed to save daily history:', e);
        }
    }

    get(dateKey) {
        return this.records.find(r => r.dateKey === dateKey) || null;
    }

    /**
     * Record an attempt. First successful clear is preserved (bestSteps may
     * still improve on retries). Returns flags to drive UI messaging.
     */
    recordAttempt(dateKey, { seed, cleared, steps, deaths = 0, modifierIds = [] }) {
        const now = Date.now();
        let rec = this.get(dateKey);
        if (!rec) {
            rec = {
                dateKey,
                seed,
                cleared: false,
                bestSteps: null,
                attempts: 0,
                deaths: 0,
                modifierIds,
                completedAtMs: null,
                firstAttemptAtMs: now,
            };
            this.records.push(rec);
        }

        rec.attempts += 1;
        if (!cleared) rec.deaths += deaths || 1;

        let isFirstClear = false;
        let isImprovement = false;
        const prevBest = rec.bestSteps;

        if (cleared) {
            if (!rec.cleared) {
                rec.cleared = true;
                rec.bestSteps = steps;
                rec.completedAtMs = now;
                isFirstClear = true;
            } else if (prevBest == null || steps < prevBest) {
                rec.bestSteps = steps;
                isImprovement = true;
            }
        }

        this.save();
        return { isFirstClear, isImprovement, prevBest, record: rec };
    }

    getYesterday(todayKey = utcDateKey()) {
        return this.get(yesterdayKey(todayKey));
    }

    /**
     * Returns N most-recent days (including today) in reverse-chronological order.
     * Each entry: { dateKey, record (or null) }. Used for the 7-day carousel.
     */
    getRecent(todayKey = utcDateKey(), days = 7) {
        const today = new Date(todayKey + 'T00:00:00Z');
        const out = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const k = utcDateKey(d);
            out.push({ dateKey: k, record: this.get(k) });
        }
        return out;
    }

    clear() {
        this.records = [];
        this.save();
    }
}

export function yesterdayKey(todayKey = utcDateKey()) {
    const today = new Date(todayKey + 'T00:00:00Z');
    const y = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    return utcDateKey(y);
}

/**
 * Resolve today's seed + modifierIds. Pure function so tests can mock the date.
 * One modifier per day for MVP (T2B-2). Seeded — every player gets the same set.
 */
export function getDailyChallenge(date = new Date(), modifierCount = 1) {
    const dateKey = utcDateKey(date);
    const seed = dailySeed(date);
    return {
        dateKey,
        seed,
        modifierIds: pickModifiers(seed, modifierCount),
    };
}
