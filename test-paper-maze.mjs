/**
 * Paper Maze 스테이지 테스트
 * Wiering & van Hasselt (2008) 논문 그리드에서 앙상블 vs 개별 알고리즘
 */

import { loadDungeon } from './web/js/game/grid.js';
import { QLearning } from './web/js/game/qlearning.js';
import { SARSA } from './web/js/game/sarsa.js';
import { ActorCritic } from './web/js/game/actor-critic.js';
import { QVLearning } from './web/js/game/qv-learning.js';
import { ACLA } from './web/js/game/acla.js';
import { Ensemble } from './web/js/game/ensemble.js';

const DUNGEONS = [
    { name: 'level_24_paper_maze', label: 'Lv.24 Paper Maze' },
    { name: 'level_25_paper_hard', label: 'Lv.25 Paper Maze+' },
];

const TRAIN_EPISODES = 2000;
const CONVERGENCE_WINDOW = 20;
const CONVERGENCE_THRESHOLD = 0.95;

function trainAndTest(AlgoClass, dungeonName, algoOpts = {}) {
    const grid = loadDungeon(dungeonName);
    const algo = new AlgoClass(grid, {
        alpha: 0.1, gamma: 0.99, epsilon: 1.0,
        epsilonMin: 0.01, epsilonDecay: 0.995,
        ...algoOpts
    });

    const recent = [];
    let convergedAt = -1;
    let firstSuccess = -1;

    for (let ep = 0; ep < TRAIN_EPISODES; ep++) {
        const result = algo.runEpisode();
        if (result.success && firstSuccess === -1) firstSuccess = ep + 1;
        recent.push(result.success);
        if (recent.length > CONVERGENCE_WINDOW) recent.shift();

        if (convergedAt === -1 && recent.length >= CONVERGENCE_WINDOW) {
            const rate = recent.filter(r => r).length / recent.length;
            if (rate >= CONVERGENCE_THRESHOLD) convergedAt = ep + 1;
        }
    }

    const finalRate = recent.filter(r => r).length / recent.length;
    return { finalRate, convergedAt, firstSuccess };
}

// ===== Grid layout verification =====
console.log('='.repeat(70));
console.log('  Paper Maze Grid Layout Verification');
console.log('='.repeat(70));

for (const { name, label } of DUNGEONS) {
    const grid = loadDungeon(name);
    console.log(`\n  ${label} (${grid.width}x${grid.height}):`);
    console.log(`  Start: (${grid.startPos.x}, ${grid.startPos.y})`);
    console.log(`  Goal:  (${grid.goalPos.x}, ${grid.goalPos.y})`);
    console.log('  Layout:');
    const lines = grid.toString().trim().split('\n');
    for (const line of lines) {
        console.log('    ' + line);
    }
}

// ===== Performance comparison =====
console.log('');
console.log('='.repeat(70));
console.log('  앙상블 vs 개별 알고리즘 on Paper Maze');
console.log(`  학습: ${TRAIN_EPISODES}ep | 수렴: ${CONVERGENCE_WINDOW}ep ${CONVERGENCE_THRESHOLD * 100}%`);
console.log('='.repeat(70));
console.log('');

const algos = [
    { label: 'Q-Learn', cls: QLearning, opts: {} },
    { label: 'SARSA  ', cls: SARSA, opts: {} },
    { label: 'AC     ', cls: ActorCritic, opts: { alphaActor: 0.01, alphaCritic: 0.1 } },
    { label: 'QV     ', cls: QVLearning, opts: {} },
    { label: 'ACLA   ', cls: ACLA, opts: { alphaActor: 0.05, alphaCritic: 0.1 } },
    { label: 'Ensembl', cls: Ensemble, opts: { temperature: 1.0 } },
];

console.log('Dungeon'.padEnd(22) + '│ ' + algos.map(a => a.label.padEnd(12)).join('│ ') + '│');
console.log('─'.repeat(22) + '┼' + algos.map(() => '─'.repeat(13)).join('┼') + '┤');

for (const { name, label } of DUNGEONS) {
    const cells = [];
    for (const { cls, opts } of algos) {
        const r = trainAndTest(cls, name, opts);
        const pct = `${(r.finalRate * 100).toFixed(0)}%`.padStart(4);
        const fs = r.firstSuccess > 0 ? `fs${r.firstSuccess}`.padStart(5) : '   - ';
        const conv = r.convergedAt > 0 ? `@${r.convergedAt}`.padStart(5) : '  -  ';
        cells.push(`${pct}${conv}  `);
    }
    console.log(`${label.padEnd(22)}│ ${cells.join('│ ')}│`);
}

console.log('─'.repeat(22) + '┴' + algos.map(() => '─'.repeat(13)).join('┴') + '┘');
console.log('');
console.log('Format: ClearRate @ConvergedEpisode');
console.log('');
console.log('Done.');
