/**
 * Toast Notification System
 * Floating toasts above the game canvas, stacking up to 3.
 */

const TOAST_ICONS = {
    gold: '\u{1FA99}',
    damage: '\u{1F4A5}',
    success: '\u2705',
    warning: '\u26A0\uFE0F',
    info: '\u2139\uFE0F'
};

export class ToastManager {
    constructor(containerId = 'toast-container') {
        this.container = document.getElementById(containerId);
        this.toasts = [];
        this.maxToasts = 3;
    }

    show(text, type = 'info', duration = 3000) {
        if (!this.container) return;

        // Remove oldest if at max
        while (this.toasts.length >= this.maxToasts) {
            this._dismiss(this.toasts[0]);
        }

        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
        el.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${text}</span>`;
        this.container.appendChild(el);

        // Trigger entrance animation
        requestAnimationFrame(() => el.classList.add('toast-show'));

        const entry = { el, timer: null };
        this.toasts.push(entry);

        entry.timer = setTimeout(() => this._dismiss(entry), duration);
    }

    _dismiss(entry) {
        if (!entry || !entry.el.parentNode) return;
        clearTimeout(entry.timer);
        entry.el.classList.remove('toast-show');
        entry.el.classList.add('toast-hide');
        entry.el.addEventListener('animationend', () => {
            entry.el.remove();
        }, { once: true });
        // Fallback removal
        setTimeout(() => entry.el.remove(), 400);
        const idx = this.toasts.indexOf(entry);
        if (idx !== -1) this.toasts.splice(idx, 1);
    }
}
