/**
 * ScreenManager — Handles screen transitions
 * Screens are div elements with class "screen". Only one is visible at a time.
 */

export class ScreenManager {
    constructor() {
        this.screens = {};
        this.currentScreen = null;
        this._listeners = [];

        document.querySelectorAll('.screen').forEach(el => {
            this.screens[el.id] = el;
            if (el.classList.contains('active')) {
                this.currentScreen = el.id;
            }
        });
    }

    show(screenId) {
        if (screenId === this.currentScreen) return;
        const prev = this.currentScreen;
        for (const [id, el] of Object.entries(this.screens)) {
            el.classList.toggle('active', id === screenId);
        }
        this.currentScreen = screenId;
        this._listeners.forEach(fn => fn(screenId, prev));
    }

    onTransition(fn) {
        this._listeners.push(fn);
    }

    get current() {
        return this.currentScreen;
    }
}
