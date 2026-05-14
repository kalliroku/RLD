/**
 * TutorialManager - Context-based tutorial + progressive disclosure
 * Shows tutorial tips at key moments. localStorage-based tracking.
 *
 * i18n: text 는 dict-ko/en 의 'tutorial.<id>' 키 + 'tutorial.dismiss' 버튼.
 */

import { t } from '../i18n/index.js';

const STORAGE_KEY = 'rld_tutorial';

// B-107/T2B-3: 한국어 튜토리얼. 텍스트는 i18n 사전 'tutorial.<id>' 로 분리 (M5).
const STEPS = [
    { id: 'welcome', trigger: 'init' },
    { id: 'first_dungeon', trigger: 'first_clear' },
    { id: 'ai_training', trigger: 'first_train' },
    { id: 'economy', trigger: 'chapter2' },
    { id: 'farming', trigger: 'first_farm_unlock' }
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
            <div class="tutorial-text">${t(`tutorial.${step.id}`)}</div>
            <button class="tutorial-dismiss">${t('tutorial.dismiss')}</button>
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
