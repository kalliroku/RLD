/**
 * DungeonMap - Visual chapter-grouped dungeon selector
 * Replaces flat dropdown with visual node map.
 */

import { DUNGEON_CONFIG, DUNGEON_HINTS } from './game-config.js';
import { CHAPTER_CONFIG } from './run-state.js';

const CHAPTER_ICONS = {
    1: '\u2694\uFE0F',  // swords
    2: '\u26A0\uFE0F',  // warning
    3: '\uD83C\uDF0D',  // globe
    4: '\uD83E\uDDE0',  // brain
    5: '\uD83E\uDD1D',  // handshake
    6: '\u2744\uFE0F',  // snowflake
    7: '\uD83C\uDF00'   // cyclone
};

export class DungeonMap {
    constructor(containerId, onSelect) {
        this.container = document.getElementById(containerId);
        this.onSelect = onSelect;
        this.currentDungeon = null;
    }

    render(runState, getDungeonDisplayName) {
        if (!this.container) return;
        this.container.innerHTML = '';

        for (const ch of CHAPTER_CONFIG) {
            // Check if any dungeon in chapter is unlocked
            const anyUnlocked = ch.dungeons.some(d => runState.unlockedDungeons.has(d));
            if (!anyUnlocked && ch.chapter > 1) {
                // Show locked chapter header
                const header = document.createElement('div');
                header.className = 'dm-chapter dm-chapter-locked';
                header.innerHTML = `<span class="dm-chapter-icon">\uD83D\uDD12</span> Ch.${ch.chapter} ???`;
                this.container.appendChild(header);
                continue;
            }

            const icon = CHAPTER_ICONS[ch.chapter] || '\u2B50';
            const header = document.createElement('div');
            header.className = 'dm-chapter';
            header.innerHTML = `<span class="dm-chapter-icon">${icon}</span> Ch.${ch.chapter} ${ch.name}`;
            this.container.appendChild(header);

            const nodes = document.createElement('div');
            nodes.className = 'dm-nodes';

            for (const dungeonId of ch.dungeons) {
                const isUnlocked = runState.unlockedDungeons.has(dungeonId);
                const isCleared = runState.clearedDungeons.has(dungeonId);
                const isCurrent = dungeonId === this.currentDungeon;
                const levelNum = dungeonId.match(/level_(\d+)/)?.[1] || '?';
                const name = getDungeonDisplayName(dungeonId);

                const node = document.createElement('button');
                node.className = 'dm-node';
                if (!isUnlocked) node.classList.add('dm-locked');
                if (isCleared) node.classList.add('dm-cleared');
                if (isCurrent) node.classList.add('dm-current');
                node.disabled = !isUnlocked;
                node.dataset.dungeon = dungeonId;

                // Check for unpurchased hints
                const hints = DUNGEON_HINTS[dungeonId];
                const hasUnpurchasedHint = hints && hints.some((_, i) => !runState.hasHint(dungeonId, i));

                let label;
                if (!isUnlocked) {
                    label = `<span class="dm-level">${levelNum}</span><span class="dm-name">???</span>`;
                } else {
                    const statusIcon = isCleared ? '<span class="dm-check">\u2713</span>' : '';
                    const hintBadge = hasUnpurchasedHint ? '<span class="dm-hint-badge">?</span>' : '';
                    label = `${statusIcon}<span class="dm-level">${levelNum}</span><span class="dm-name">${name}</span>${hintBadge}`;
                }
                node.innerHTML = label;

                node.addEventListener('click', () => {
                    if (this.onSelect) this.onSelect(dungeonId);
                });

                nodes.appendChild(node);
            }
            this.container.appendChild(nodes);
        }
    }

    setCurrentDungeon(dungeonId) {
        this.currentDungeon = dungeonId;
        // Update visual selection
        if (!this.container) return;
        this.container.querySelectorAll('.dm-node').forEach(n => {
            n.classList.toggle('dm-current', n.dataset.dungeon === dungeonId);
        });
    }
}
