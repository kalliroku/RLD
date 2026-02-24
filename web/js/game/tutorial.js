/**
 * TutorialManager - Context-based tutorial + progressive disclosure
 * Shows tutorial tips at key moments. localStorage-based tracking.
 */

const STORAGE_KEY = 'rld_tutorial';

const STEPS = [
    { id: 'welcome', trigger: 'init', text: 'Welcome to RL Dungeon! Use arrow keys to move your serpa through the dungeon. Reach the green goal to clear it.' },
    { id: 'first_dungeon', trigger: 'first_clear', text: 'Great job! You cleared your first dungeon. Try the next one, or use AI Training to let your serpa learn automatically.' },
    { id: 'ai_training', trigger: 'first_train', text: 'AI Training lets your serpa learn the optimal path. Try different speeds - Instant is fastest! Each episode costs gold.' },
    { id: 'economy', trigger: 'chapter2', text: 'Dungeons now cost gold to enter. Sell maps for quick cash, or keep them for exclusive farming runs.' },
    { id: 'farming', trigger: 'first_farm_unlock', text: 'Farming unlocked! Assign a trained serpa to a cleared dungeon to earn gold passively.' }
];

export class TutorialManager {
    constructor() {
        this.completed = new Set();
        this._load();
    }

    _load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const arr = JSON.parse(data);
                arr.forEach(id => this.completed.add(id));
            }
        } catch { /* ignore */ }
    }

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.completed]));
        } catch { /* ignore */ }
    }

    tryShow(triggerId) {
        const step = STEPS.find(s => s.trigger === triggerId && !this.completed.has(s.id));
        if (!step) return false;
        this._showTip(step);
        return true;
    }

    _showTip(step) {
        // Remove existing tip if any
        const existing = document.querySelector('.tutorial-tip');
        if (existing) existing.remove();

        const tip = document.createElement('div');
        tip.className = 'tutorial-tip';
        tip.innerHTML = `
            <div class="tutorial-text">${step.text}</div>
            <button class="tutorial-dismiss">Got it</button>
        `;

        tip.querySelector('.tutorial-dismiss').addEventListener('click', () => {
            tip.classList.add('tutorial-hide');
            setTimeout(() => tip.remove(), 300);
            this.completed.add(step.id);
            this._save();
        });

        document.body.appendChild(tip);
        requestAnimationFrame(() => tip.classList.add('tutorial-show'));
    }

    isCompleted(id) {
        return this.completed.has(id);
    }
}
