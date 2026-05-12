/**
 * TutorialManager - Context-based tutorial + progressive disclosure
 * Shows tutorial tips at key moments. localStorage-based tracking.
 */

const STORAGE_KEY = 'rld_tutorial';

// B-107/T2B-3: 한국어 튜토리얼 (영어 → 한국어 통일)
const STEPS = [
    { id: 'welcome', trigger: 'init', text: '환영합니다! 방향키로 세르파를 움직여 녹색 G (목표) 에 도달하세요.' },
    { id: 'first_dungeon', trigger: 'first_clear', text: '첫 던전 클리어! 다음 던전으로 가거나, AI 학습 패널에서 세르파에게 길을 외우게 시켜보세요.' },
    { id: 'ai_training', trigger: 'first_train', text: 'AI 학습은 세르파가 최적 경로를 스스로 찾게 합니다. 속도를 바꿔보세요 — 즉시가 가장 빠릅니다. 에피소드마다 골드가 소비됩니다.' },
    { id: 'economy', trigger: 'chapter2', text: '이제 던전 입장에 골드가 듭니다. 지도를 팔아 즉시 현금으로 바꾸거나, 보관해서 전용 파밍 런을 돌리세요.' },
    { id: 'farming', trigger: 'first_farm_unlock', text: '파밍 해금! 학습 완료된 세르파를 클리어한 던전에 배치하면 자동으로 골드를 벌어옵니다.' }
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
            <button class="tutorial-dismiss">확인</button>
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
