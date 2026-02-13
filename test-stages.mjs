/**
 * Quick test script for Lv.18-23 stages
 * Run: node test-stages.mjs
 */

import { Grid, DUNGEONS, loadDungeon } from './web/js/game/grid.js';
import { Agent } from './web/js/game/agent.js';
import { QLearning } from './web/js/game/qlearning.js';
import { SARSA } from './web/js/game/sarsa.js';
import { MonteCarlo } from './web/js/game/monte-carlo.js';
import { SarsaLambda } from './web/js/game/sarsa-lambda.js';
import { DynaQ } from './web/js/game/dyna-q.js';
import { Reinforce } from './web/js/game/reinforce.js';
import { ActorCritic } from './web/js/game/actor-critic.js';

function createAlgo(AlgoClass, grid, overrides = {}) {
    const opts = {
        alpha: overrides.alpha ?? 0.1,
        gamma: overrides.gamma ?? 0.99,
        epsilon: overrides.epsilon ?? 1.0,
        epsilonMin: overrides.epsilonMin ?? 0.01,
        epsilonDecay: overrides.epsilonDecay ?? 0.995,
        useHpState: overrides.useHpState ?? false,
        ...overrides
    };
    return new AlgoClass(grid, opts);
}

function testAlgo(name, AlgoClass, dungeonName, episodes, algoOpts = {}) {
    const grid = loadDungeon(dungeonName);
    const algo = createAlgo(AlgoClass, grid, algoOpts);

    let firstSuccess = -1, successes = 0, recent = [], convergedAt = -1;
    for (let ep = 0; ep < episodes; ep++) {
        const result = algo.runEpisode();
        if (result.success) {
            successes++;
            if (firstSuccess === -1) firstSuccess = ep + 1;
        }
        recent.push(result.success);
        if (recent.length > 20) recent.shift();
        if (convergedAt === -1 && recent.length >= 20 && recent.filter(r => r).length / 20 >= 0.95)
            convergedAt = ep + 1;
    }
    return { name, firstSuccess, successes, total: episodes, convergedAt };
}

function printResult(r) {
    const conv = r.convergedAt === -1 ? 'FAIL' : `@${r.convergedAt}`;
    const rate = ((r.successes / r.total) * 100).toFixed(1);
    console.log(`  ${r.name.padEnd(15)} first:${String(r.firstSuccess).padStart(5)} conv:${conv.padStart(6)} succ:${rate.padStart(5)}%`);
}

console.log('=== Lv.18 Dead End Labyrinth (TD > MC) ===');
let results = [
    testAlgo('Q군(QL)', QLearning, 'level_18_dead_end', 2000),
    testAlgo('다이나(DQ)', DynaQ, 'level_18_dead_end', 2000, { planningSteps: 10 }),
    testAlgo('몬테(MC)', MonteCarlo, 'level_18_dead_end', 2000),
    testAlgo('그래디(PG)', Reinforce, 'level_18_dead_end', 2000, { alpha: 0.01 }),
];
results.forEach(printResult);

console.log('\n=== Lv.19 Narrow Bridge (SARSA > QL) ===');
results = [
    testAlgo('사르사(S)', SARSA, 'level_19_bridge', 2000),
    testAlgo('Q군(QL)', QLearning, 'level_19_bridge', 2000),
    testAlgo('트레이서(Sλ)', SarsaLambda, 'level_19_bridge', 2000, { lambda: 0.9 }),
];
results.forEach(printResult);

console.log('\n=== Lv.20 The Sacrifice (QL > SARSA) ===');
results = [
    testAlgo('Q군(QL)', QLearning, 'level_20_sacrifice', 2000),
    testAlgo('사르사(S)', SARSA, 'level_20_sacrifice', 2000),
    testAlgo('다이나(DQ)', DynaQ, 'level_20_sacrifice', 2000, { planningSteps: 10 }),
];
results.forEach(printResult);

console.log('\n=== Lv.21 Desert Crossing (DynaQ >> all) ===');
results = [
    testAlgo('다이나(DQ)', DynaQ, 'level_21_desert', 3000, { planningSteps: 10 }),
    testAlgo('Q군(QL)', QLearning, 'level_21_desert', 3000),
    testAlgo('사르사(S)', SARSA, 'level_21_desert', 3000),
];
results.forEach(printResult);

console.log('\n=== Lv.22 Monster Arena (AC > REINFORCE) ===');
results = [
    testAlgo('크리틱(AC)', ActorCritic, 'level_22_arena', 2000, { alphaActor: 0.01, alphaCritic: 0.1, useHpState: true }),
    testAlgo('그래디(PG)', Reinforce, 'level_22_arena', 2000, { alpha: 0.01, useHpState: true }),
    testAlgo('Q군(QL)', QLearning, 'level_22_arena', 2000, { useHpState: true }),
];
results.forEach(printResult);

console.log('\n=== Lv.23 The Mirage (MC > TD) ===');
results = [
    testAlgo('몬테(MC)', MonteCarlo, 'level_23_mirage', 2000),
    testAlgo('Q군(QL)', QLearning, 'level_23_mirage', 2000),
    testAlgo('트레이서(Sλ)', SarsaLambda, 'level_23_mirage', 2000, { lambda: 0.9 }),
];
results.forEach(printResult);

// Verify existing gold stages still work with gold consumption
console.log('\n=== Regression: Lv.5 Gold Rush ===');
results = [
    testAlgo('Q군(QL)', QLearning, 'level_05_gold', 1000),
    testAlgo('다이나(DQ)', DynaQ, 'level_05_gold', 1000, { planningSteps: 10 }),
];
results.forEach(printResult);
