/**
 * Opening sequence (6 pages) — runs once after the first New Game.
 *
 * Pages (per 2026-05-22 user spec, mirror of [[project-opening-scene]]):
 *   [1] black                — auto-fades in
 *   [2] illustration: father in dungeon + father's line
 *   [3] illustration: father leaving toward the arch
 *   [4] black + child cry ("안돼요 가지마요!")
 *   [5] guild bg + repli morning line
 *   [6] guild bg + reta enter line
 *
 * Advance: click anywhere or press a key. [1] also auto-advances.
 * Skip: the screen is suppressed entirely if `rld_opening_seen` is set.
 */

import { renderManInDungeon, renderManLeaving } from './opening-art.js';
import { t } from '../i18n/index.js';

const STORAGE_KEY_SEEN = 'rld_opening_seen';

const PAGES = [
    { type: 'black',        autoAdvance: 1400 },
    { type: 'illustration', render: 'manInDungeon', i18n: 'opening.father_line' },
    { type: 'illustration', render: 'manLeaving' },
    { type: 'cry',          i18n: 'opening.child_cry' },
    { type: 'guild',        i18n: 'opening.repli_morning', speakerKey: 'opening.speaker.repli' },
    { type: 'guild',        i18n: 'opening.reta_quest',    speakerKey: 'opening.speaker.reta' },
];

export class OpeningManager {
    constructor() {
        this.screen = document.getElementById('screen-opening');
        this.canvas = document.getElementById('opening-canvas');
        this.textEl = document.getElementById('opening-text');
        this.speakerEl = document.getElementById('opening-speaker');
        this.hintEl = document.getElementById('opening-hint');
        this.pageIdx = -1;
        this.onComplete = null;
        this.autoTimer = null;
        this._advanceLock = false;

        if (this.screen) {
            this.screen.addEventListener('click', () => this.advance());
            // also keyboard
            this._keyHandler = (e) => {
                if (this.screen.classList.contains('active')) {
                    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        this.advance();
                    }
                }
            };
            window.addEventListener('keydown', this._keyHandler);
        }
    }

    static hasBeenSeen() {
        try {
            return localStorage.getItem(STORAGE_KEY_SEEN) === '1';
        } catch (e) {
            return false;
        }
    }

    static markSeen() {
        try {
            localStorage.setItem(STORAGE_KEY_SEEN, '1');
        } catch (e) { /* private mode */ }
    }

    /** Reset the seen flag — used by NG+ or test flows. */
    static reset() {
        try {
            localStorage.removeItem(STORAGE_KEY_SEEN);
        } catch (e) { /* private mode */ }
    }

    start(onComplete) {
        // DOM guard — if the screen wasn't mounted (e.g. headless), just resolve
        // immediately so the caller's flow doesn't stall.
        if (!this.screen) {
            onComplete?.();
            return;
        }
        this.onComplete = onComplete;
        this.pageIdx = -1;
        this.advance();
    }

    advance() {
        if (this._advanceLock) return;
        this._advanceLock = true;
        clearTimeout(this.autoTimer);
        this.pageIdx++;
        if (this.pageIdx >= PAGES.length) {
            OpeningManager.markSeen();
            this.onComplete?.();
            // small unlock delay so the click that triggered finish doesn't immediately
            // re-fire on the next screen
            setTimeout(() => { this._advanceLock = false; }, 200);
            return;
        }
        this.renderCurrent();
        // Brief debounce so a held click doesn't skip multiple pages
        setTimeout(() => { this._advanceLock = false; }, 150);
    }

    renderCurrent() {
        const page = PAGES[this.pageIdx];
        // Reset page-type classes
        this.screen.classList.remove('op-black', 'op-illustration', 'op-cry', 'op-guild');
        this.screen.classList.add('op-' + page.type);

        // Dialog visibility — drive in JS instead of `:has()` selector for broader
        // browser support (Firefox<121, older Safari).
        const dialog = this.screen.querySelector('.opening-dialog');
        if (dialog) dialog.style.display = (page.i18n || page.speakerKey) ? '' : 'none';

        // Speaker
        if (page.speakerKey) {
            this.speakerEl.textContent = t(page.speakerKey);
            this.speakerEl.style.display = '';
        } else {
            this.speakerEl.textContent = '';
            this.speakerEl.style.display = 'none';
        }

        // Text
        if (page.i18n) {
            this.textEl.textContent = t(page.i18n);
            this.textEl.style.display = '';
        } else {
            this.textEl.textContent = '';
            this.textEl.style.display = 'none';
        }

        // Illustration
        if (page.render === 'manInDungeon') {
            renderManInDungeon(this.canvas);
            this.canvas.style.display = '';
        } else if (page.render === 'manLeaving') {
            renderManLeaving(this.canvas);
            this.canvas.style.display = '';
        } else {
            this.canvas.style.display = 'none';
        }

        // Hint visibility
        if (this.hintEl) {
            this.hintEl.style.display = page.autoAdvance ? 'none' : '';
            if (!page.autoAdvance) {
                this.hintEl.textContent = t('opening.hint.click');
            }
        }

        if (page.autoAdvance) {
            this.autoTimer = setTimeout(() => this.advance(), page.autoAdvance);
        }
    }
}
