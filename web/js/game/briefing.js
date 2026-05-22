/**
 * BriefingOverlay - Pre-dungeon briefing screen (Darkest Dungeon style)
 * Shows dungeon info, costs, hints, and quick provision purchase.
 */

import { DUNGEON_CONFIG, DUNGEON_HINTS, BASE_OP_COST } from './game-config.js';
import { CHAPTER_CONFIG, DUNGEON_TREASURES, ITEMS } from './run-state.js';
import { t, tHtml, onLangChange } from '../i18n/index.js';

export class BriefingOverlay {
    constructor() {
        this.overlay = document.getElementById('briefing-overlay');
        this.titleEl = document.getElementById('briefing-title');
        this.chapterEl = document.getElementById('briefing-chapter');
        this.detailsEl = document.getElementById('briefing-details');
        this.hintsEl = document.getElementById('briefing-hints');
        this.provisionsEl = document.getElementById('briefing-provisions');
        this.backBtn = document.getElementById('btn-briefing-back');
        this.deployBtn = document.getElementById('btn-briefing-deploy');

        this.pendingDungeon = null;
        this.onDeploy = null;
        this.onBack = null;
        this._lastShowArgs = null;  // W11: 언어 토글 시 자동 re-render 위한 마지막 show() 인자 캐시

        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => {
                this.hide();
                if (this.onBack) this.onBack();
            });
        }
        if (this.deployBtn) {
            this.deployBtn.addEventListener('click', () => {
                this.hide();
                if (this.onDeploy) this.onDeploy(this.pendingDungeon);
            });
        }

        // W11: 언어 토글 시 overlay 가 visible 이면 마지막 인자로 다시 show — toggle stale 가드
        onLangChange(() => {
            if (this.isVisible && this._lastShowArgs) {
                this.show(...this._lastShowArgs);
            }
        });
    }

    show(dungeonId, runState, charName, getDungeonDisplayName) {
        if (!this.overlay) return;
        this.pendingDungeon = dungeonId;
        this._lastShowArgs = [dungeonId, runState, charName, getDungeonDisplayName];

        const config = DUNGEON_CONFIG[dungeonId] || { cost: 0, firstReward: 100, repeatReward: 10 };
        const levelNum = dungeonId.match(/level_(\d+)/)?.[1] || '?';
        const name = getDungeonDisplayName(dungeonId);
        const isCleared = runState.clearedDungeons.has(dungeonId);

        // Chapter info
        const chapterInfo = CHAPTER_CONFIG.find(c => c.dungeons.includes(dungeonId));
        const chapterLabel = chapterInfo ? `Ch.${chapterInfo.chapter} ${t(`chapter.${chapterInfo.chapter}`)}` : '';

        this.titleEl.textContent = `Lv.${levelNum} ${name}`;
        this.chapterEl.textContent = chapterLabel;

        // Cost/reward details
        const reward = isCleared ? config.repeatReward : config.firstReward;
        const rewardLabel = isCleared ? t('overlay.briefing.repeat_reward') : t('overlay.briefing.first_reward');
        const opCost = (BASE_OP_COST[charName] ?? 10) * parseInt(levelNum);
        const treasure = DUNGEON_TREASURES[dungeonId];
        const slippery = config.slippery ? ` ${t('overlay.briefing.mod_slippery')}` : '';
        const hpAware = config.useHpState ? ` ${t('overlay.briefing.mod_hp_aware')}` : '';

        let detailsHtml = `
            <div class="brief-row"><span class="brief-label">${t('overlay.briefing.entry_cost')}</span><span class="brief-val brief-gold">${config.cost}G</span></div>
            <div class="brief-row"><span class="brief-label">${rewardLabel}</span><span class="brief-val brief-reward">${reward}G</span></div>
            <div class="brief-row"><span class="brief-label">${t('overlay.briefing.train_cost')}</span><span class="brief-val">${opCost}G/ep</span></div>
        `;
        if (treasure) {
            detailsHtml += `<div class="brief-row"><span class="brief-label">${t('overlay.briefing.treasure')}</span><span class="brief-val brief-reward">${treasure.value}G</span></div>`;
        }
        if (slippery || hpAware) {
            detailsHtml += `<div class="brief-row"><span class="brief-label">${t('overlay.briefing.modifiers')}</span><span class="brief-val brief-warn">${slippery}${hpAware}</span></div>`;
        }
        detailsHtml += `<div class="brief-row brief-status"><span class="brief-label">${t('overlay.briefing.your_gold')}</span><span class="brief-val ${runState.gold < config.cost ? 'brief-danger' : 'brief-gold'}">${runState.gold}G</span></div>`;
        detailsHtml += `<div class="brief-row brief-status"><span class="brief-label">${t('overlay.briefing.food')}</span><span class="brief-val">${runState.food}</span></div>`;

        this.detailsEl.innerHTML = detailsHtml;

        // Hints
        const hints = DUNGEON_HINTS[dungeonId];
        if (hints && hints.length > 0) {
            let hintHtml = `<div class="brief-section-title">${t('overlay.briefing.hints_title')}</div>`;
            for (let i = 0; i < hints.length; i++) {
                const purchased = runState.hasHint(dungeonId, i);
                if (purchased) {
                    // W17: hints[i].key 박힘 (D-2026-05-19-1 narrative 흡수) — show() 시점 t() 호출, onLangChange 시 자동 재평가 (W11 _lastShowArgs 캐시)
                    hintHtml += `<div class="brief-hint brief-hint-owned">"${t(hints[i].key)}"</div>`;
                } else {
                    hintHtml += `<div class="brief-hint brief-hint-locked">${hints[i].cost}G - ${t('overlay.briefing.hint_locked')}</div>`;
                }
            }
            this.hintsEl.innerHTML = hintHtml;
        } else {
            this.hintsEl.innerHTML = '';
        }

        // Provisions quick-buy
        this.provisionsEl.innerHTML = `
            <div class="brief-section-title">${t('overlay.briefing.provisions_title')}</div>
            <div class="brief-provisions-row">
                <button class="btn-small btn-brief-food" data-amount="10">${tHtml('overlay.briefing.food_buy', { amount: 10, cost: 10 })}</button>
                <button class="btn-small btn-brief-food" data-amount="50">${tHtml('overlay.briefing.food_buy', { amount: 50, cost: 50 })}</button>
            </div>
        `;

        // Wire quick-buy
        this.provisionsEl.querySelectorAll('.btn-brief-food').forEach(btn => {
            btn.addEventListener('click', () => {
                const amt = parseInt(btn.dataset.amount);
                if (runState.gold >= amt) {
                    runState.gold -= amt;
                    runState.food += amt;
                    // Re-render details to update gold/food display
                    this.show(dungeonId, runState, charName, getDungeonDisplayName);
                }
            });
        });

        // Disable deploy if not enough gold
        if (this.deployBtn) {
            this.deployBtn.disabled = runState.gold < config.cost;
        }

        this.overlay.style.display = 'flex';
    }

    hide() {
        if (this.overlay) this.overlay.style.display = 'none';
        this._lastShowArgs = null;  // W11: hidden 상태에서 언어 토글 시 re-render 회피
    }

    get isVisible() {
        return this.overlay && this.overlay.style.display !== 'none';
    }
}
