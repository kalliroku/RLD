/**
 * 앙상블 (Boltzmann Multiplication) 테스트
 * 5개 알고리즘 합의 vs 개별 알고리즘 성능 비교
 */

import { loadDungeon } from './web/js/game/grid.js';
import { QLearning } from './web/js/game/qlearning.js';
import { SARSA } from './web/js/game/sarsa.js';
import { ActorCritic } from './web/js/game/actor-critic.js';
import { QVLearning } from './web/js/game/qv-learning.js';
import { ACLA } from './web/js/game/acla.js';
import { Ensemble } from './web/js/game/ensemble.js';

const DUNGEONS = [
    { name: 'level_01_easy',     label: 'Lv.1  Tutorial' },
    { name: 'level_02_trap',     label: 'Lv.2  First Trap' },
    { name: 'level_03_maze',     label: 'Lv.3  Maze' },
    { name: 'level_13_cliff',    label: 'Lv.13 Cliff Walk' },
    { name: 'level_16_open_field', label: 'Lv.16 Open Field' },
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

    // Final clear rate from last 20 episodes
    const finalRate = recent.filter(r => r).length / recent.length;

    return { finalRate, convergedAt, firstSuccess };
}

// ========== Test 1: Basic functionality ==========
console.log('='.repeat(80));
console.log('  Test 1: Ensemble 기본 동작 확인');
console.log('='.repeat(80));

{
    const grid = loadDungeon('level_01_easy');
    const ens = new Ensemble(grid, {
        alpha: 0.1, gamma: 0.99, epsilon: 1.0,
        epsilonMin: 0.01, epsilonDecay: 0.995,
        temperature: 1.0
    });

    console.log(`  subAlgos count: ${ens.subAlgos.length}`);
    console.log(`  subAlgo names: ${ens.subAlgos.map(s => s.name).join(', ')}`);
    console.log(`  subAlgo types: ${ens.subAlgos.map(s => s.type).join(', ')}`);
    console.log(`  epsilon: ${ens.epsilon}`);
    console.log(`  temperature: ${ens.temperature}`);

    // Check sub-algos have epsilon=0
    const allZero = ens.subAlgos.every(s => s.algo.epsilon === 0);
    console.log(`  sub-algo epsilon all 0: ${allZero ? 'PASS' : 'FAIL'}`);

    // Run one episode
    const result = ens.runEpisode();
    console.log(`  runEpisode result: steps=${result.steps}, reward=${result.totalReward.toFixed(1)}, success=${result.success}`);

    // Test chooseAction / getBestAction
    const action1 = ens.chooseAction(0, 0);
    const action2 = ens.getBestAction(0, 0);
    console.log(`  chooseAction(0,0): ${action1} (valid: ${action1 >= 0 && action1 <= 3 ? 'PASS' : 'FAIL'})`);
    console.log(`  getBestAction(0,0): ${action2} (valid: ${action2 >= 0 && action2 <= 3 ? 'PASS' : 'FAIL'})`);

    // Test getCombinedProbs
    const probs = ens.getCombinedProbs(0, 0, 100);
    const probSum = probs.reduce((a, b) => a + b, 0);
    console.log(`  getCombinedProbs sum: ${probSum.toFixed(6)} (${Math.abs(probSum - 1.0) < 0.001 ? 'PASS' : 'FAIL'})`);

    // Test getValueGrid / getPolicyGrid
    const vGrid = ens.getValueGrid();
    const pGrid = ens.getPolicyGrid();
    console.log(`  getValueGrid size: ${vGrid.length}x${vGrid[0].length} (PASS)`);
    console.log(`  getPolicyGrid size: ${pGrid.length}x${pGrid[0].length} (PASS)`);

    // Test serialize / deserialize
    const serialized = ens.serialize();
    const parsed = JSON.parse(serialized);
    console.log(`  serialize type: ${parsed.type} (${parsed.type === 'ensemble' ? 'PASS' : 'FAIL'})`);
    console.log(`  serialized subAlgos: ${parsed.subAlgos.length} (${parsed.subAlgos.length === 5 ? 'PASS' : 'FAIL'})`);

    // Deserialize into a new instance
    const grid2 = loadDungeon('level_01_easy');
    const ens2 = new Ensemble(grid2, {
        alpha: 0.1, gamma: 0.99, epsilon: 1.0,
        epsilonMin: 0.01, epsilonDecay: 0.995,
        temperature: 1.0
    });
    ens2.deserialize(serialized);
    console.log(`  deserialize epsilon: ${ens2.epsilon.toFixed(4)} (${Math.abs(ens2.epsilon - ens.epsilon) < 0.001 ? 'PASS' : 'FAIL'})`);

    // stepAction compatibility
    const stepAct = ens.stepAction(0, 0, 100);
    console.log(`  stepAction(0,0,100): ${stepAct} (valid: ${stepAct >= 0 && stepAct <= 3 ? 'PASS' : 'FAIL'})`);
}

// ========== Test 2: Training convergence ==========
console.log('');
console.log('='.repeat(80));
console.log('  Test 2: 앙상블 vs 개별 알고리즘 수렴 비교');
console.log(`  학습: ${TRAIN_EPISODES} 에피소드 | 수렴: ${CONVERGENCE_WINDOW}ep ${(CONVERGENCE_THRESHOLD * 100)}%`);
console.log('='.repeat(80));
console.log('');

const header = 'Dungeon'.padEnd(22) +
    '│ Q-Learn │ SARSA  │ AC     │ QV     │ ACLA   │ Ensemb │';
console.log(header);
console.log('─'.repeat(22) + '┼' + ('─'.repeat(8) + '┼').repeat(5) + '─'.repeat(8) + '┤');

for (const { name, label } of DUNGEONS) {
    const results = {};

    // Individual algorithms
    results.ql = trainAndTest(QLearning, name);
    results.sarsa = trainAndTest(SARSA, name);
    results.ac = trainAndTest(ActorCritic, name, { alphaActor: 0.01, alphaCritic: 0.1 });
    results.qv = trainAndTest(QVLearning, name);
    results.acla = trainAndTest(ACLA, name, { alphaActor: 0.05, alphaCritic: 0.1 });

    // Ensemble
    results.ens = trainAndTest(Ensemble, name, { temperature: 1.0 });

    function fmt(r) {
        const pct = `${(r.finalRate * 100).toFixed(0)}%`.padStart(4);
        const conv = r.convergedAt > 0 ? `@${r.convergedAt}`.padStart(4) : '  - ';
        return `${pct}${conv}`;
    }

    console.log(
        `${label.padEnd(22)}│ ${fmt(results.ql)} │ ${fmt(results.sarsa)} │ ${fmt(results.ac)} │ ${fmt(results.qv)} │ ${fmt(results.acla)} │ ${fmt(results.ens)} │`
    );
}

console.log('─'.repeat(22) + '┴' + ('─'.repeat(8) + '┴').repeat(5) + '─'.repeat(8) + '┘');
console.log('');
console.log('Format: ClearRate @ConvergedEp (- = not converged within limit)');

// ========== Test 3: Ensemble learns all sub-algos ==========
console.log('');
console.log('='.repeat(80));
console.log('  Test 3: 학습 후 서브 알고리즘 상태 확인');
console.log('='.repeat(80));

{
    const grid = loadDungeon('level_01_easy');
    const ens = new Ensemble(grid, {
        alpha: 0.1, gamma: 0.99, epsilon: 1.0,
        epsilonMin: 0.01, epsilonDecay: 0.995,
        temperature: 1.0
    });

    for (let i = 0; i < 500; i++) ens.runEpisode();

    console.log('  Sub-algorithm state after 500 episodes:');
    for (const sub of ens.subAlgos) {
        const hasData = sub.algo.episodeRewards && sub.algo.episodeRewards.length > 0;
        // Check they don't have individual episode tracking (they shouldn't since epsilon=0 and
        // learn is called directly, not runEpisode)
        const avgReward = sub.algo.getAverageReward ? sub.algo.getAverageReward(50) : 'N/A';

        // Check Q/V tables have non-zero values
        let nonZero = 0;
        if (sub.algo.qTable) {
            for (const [, vals] of sub.algo.qTable) {
                if (Array.isArray(vals)) {
                    nonZero += vals.filter(v => v !== 0).length;
                }
            }
        } else if (sub.algo.policy) {
            // ACLA: check policy differs from uniform
            for (const [, vals] of sub.algo.policy) {
                nonZero += vals.filter(v => Math.abs(v - 0.25) > 0.001).length;
            }
        }

        console.log(`    ${sub.name.padEnd(14)} type=${sub.type}  epsilon=${sub.algo.epsilon}  non-zero entries=${nonZero}`);
    }

    // Verify ensemble combined probs differ from uniform
    const probs = ens.getCombinedProbs(grid.startPos.x, grid.startPos.y, 100);
    const isUniform = probs.every(p => Math.abs(p - 0.25) < 0.01);
    console.log(`  Combined probs at start: [${probs.map(p => p.toFixed(3)).join(', ')}] (not uniform: ${!isUniform ? 'PASS' : 'FAIL'})`);
}

console.log('');
console.log('Done.');
