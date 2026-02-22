/**
 * run-balance.js — CLI entry point for balance simulation
 * Usage: node sim/run-balance.js [runs=10] [strategy=all]
 */

import { GameSimulator } from './simulator.js';
import { StraightForward, BalancedPlayer, FarmHeavy, HybridPlayer } from './strategies.js';

const ALL_STRATEGIES = { StraightForward, BalancedPlayer, FarmHeavy, HybridPlayer };

// Parse CLI args
const args = process.argv.slice(2);
const RUNS = parseInt(args[0]) || 10;
const strategyFilter = args[1] || 'all';

const strategies = strategyFilter === 'all'
    ? Object.values(ALL_STRATEGIES)
    : ALL_STRATEGIES[strategyFilter] ? [ALL_STRATEGIES[strategyFilter]] : Object.values(ALL_STRATEGIES);

function avg(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pct(num, denom) {
    return denom > 0 ? (num / denom * 100).toFixed(1) : '0.0';
}

console.log(`\n${'='.repeat(60)}`);
console.log(`  RLD Balance Simulator — ${RUNS} runs per strategy`);
console.log(`${'='.repeat(60)}\n`);

for (const strategy of strategies) {
    const results = [];
    const t0 = Date.now();

    for (let i = 0; i < RUNS; i++) {
        const sim = new GameSimulator(strategy);
        const stats = sim.runPlaythrough();
        results.push(stats);

        // Progress indicator
        if ((i + 1) % Math.max(1, Math.floor(RUNS / 10)) === 0 || i === RUNS - 1) {
            process.stdout.write(`\r  [${strategy.name}] ${i + 1}/${RUNS}...`);
        }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\r${'─'.repeat(60)}`);
    console.log(`  ${strategy.name} (${RUNS} runs, ${elapsed}s)`);
    console.log(`${'─'.repeat(60)}`);

    // Clear rate
    const fullClears = results.filter(r => r.cleared === r.totalDungeons).length;
    console.log(`  Clear rate:       ${fullClears}/${RUNS} (${pct(fullClears, RUNS)}%)`);
    console.log(`  Avg cleared:      ${avg(results.map(r => r.cleared)).toFixed(1)} / ${results[0]?.totalDungeons || 31}`);

    // Turns
    console.log(`  Avg turns:        ${avg(results.map(r => r.totalTurns)).toFixed(1)} (median: ${median(results.map(r => r.totalTurns))})`);

    // Gold
    console.log(`  Avg final gold:   ${avg(results.map(r => r.finalGold)).toFixed(0)}`);
    console.log(`  Avg training cost:${avg(results.map(r => r.totalTrainingCost)).toFixed(0)}`);
    console.log(`  Avg farming income:${avg(results.map(r => r.farmingIncome)).toFixed(0)}`);

    // Deaths
    console.log(`  Avg deaths:       ${avg(results.map(r => r.deaths)).toFixed(1)}`);

    // Manual play stats (if any)
    const manualAttempts = avg(results.map(r => r.manualAttempts || 0));
    if (manualAttempts > 0) {
        const manualClears = avg(results.map(r => r.manualClears || 0));
        const manualFails = avg(results.map(r => r.manualFailures || 0));
        console.log(`  Manual play: ${manualClears.toFixed(1)} clears, ${manualFails.toFixed(1)} fails (${manualAttempts.toFixed(1)} attempts)`);
        console.log(`  Avg food used:    ${avg(results.map(r => r.totalFoodUsed || 0)).toFixed(0)}G`);
    }

    // Chapter progression (average turn to reach each chapter)
    const maxChapters = 7;
    const chapterTurns = {};
    for (let ch = 1; ch <= maxChapters; ch++) {
        const turns = results.map(r => r.chapterReachTurns[ch]).filter(t => t !== undefined);
        if (turns.length > 0) {
            chapterTurns[ch] = { avgTurn: avg(turns).toFixed(1), reached: turns.length };
        }
    }
    if (Object.keys(chapterTurns).length > 0) {
        console.log(`  Chapter progression:`);
        for (const [ch, data] of Object.entries(chapterTurns)) {
            console.log(`    Ch.${ch}: turn ${data.avgTurn} avg (${data.reached}/${RUNS} reached)`);
        }
    }

    // Bottleneck analysis (aggregate across runs)
    const bottleneckCounts = {};
    for (const r of results) {
        for (const b of r.bottlenecks) {
            const key = `${b.dungeon}:${b.reason}`;
            if (!bottleneckCounts[key]) {
                bottleneckCounts[key] = { dungeon: b.dungeon, reason: b.reason, count: 0 };
            }
            bottleneckCounts[key].count++;
        }
    }
    const topBottlenecks = Object.values(bottleneckCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    if (topBottlenecks.length > 0) {
        console.log(`  Top bottlenecks:`);
        for (const b of topBottlenecks) {
            console.log(`    ${b.dungeon}: ${b.reason} (${b.count}/${RUNS} runs)`);
        }
    }

    // Gold curve summary: avg gold at turns 10, 50, 100, 200
    const checkpoints = [10, 50, 100, 200, 300, 500];
    const goldAtCheckpoints = {};
    for (const cp of checkpoints) {
        const golds = results.map(r => {
            const entry = r.goldHistory.find(h => h.turn >= cp);
            return entry ? entry.gold : null;
        }).filter(g => g !== null);
        if (golds.length > 0) {
            goldAtCheckpoints[cp] = avg(golds).toFixed(0);
        }
    }
    if (Object.keys(goldAtCheckpoints).length > 0) {
        console.log(`  Gold curve:`);
        const parts = Object.entries(goldAtCheckpoints).map(([t, g]) => `t${t}=${g}G`);
        console.log(`    ${parts.join(' → ')}`);
    }

    console.log('');
}

console.log(`${'='.repeat(60)}`);
console.log(`  Simulation complete.`);
console.log(`${'='.repeat(60)}\n`);
