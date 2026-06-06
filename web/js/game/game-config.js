/**
 * game-config.js — Shared constants for game balance
 * Used by both main.js (browser) and sim/ (headless simulator)
 */

import { QLearning } from './qlearning.js';
import { LocalQLearning } from './local-qlearning.js';
import { SARSA } from './sarsa.js';
import { MonteCarlo } from './monte-carlo.js';
import { SarsaLambda } from './sarsa-lambda.js';
import { DynaQ } from './dyna-q.js';
import { Reinforce } from './reinforce.js';
import { ActorCritic } from './actor-critic.js';
import { QVLearning } from './qv-learning.js';
import { ACLA } from './acla.js';
import { Ensemble } from './ensemble.js';
import { ExpectedSarsa } from './expected-sarsa.js';
import { DoubleQLearning } from './double-qlearning.js';
import { TreeBackup } from './tree-backup.js';
import { PrioritizedSweeping } from './prioritized-sweeping.js';

// Character registry
// B-105 / D-4: personality 가 카드 표면 라벨, algo 학명은 hover 툴팁으로 격하 (알고리즘=캐릭터)
export const CHARACTERS = {
    qkun:   { name: '퀴니',    algo: 'Q-Learning',   personality: '충성스러운 덜렁이',      cls: QLearning,      desc: '한 번 가본 길을 그대로 외우는 강아지 세르파. 자주 넘어져도 우직하게 다 기억합니다.' },
    scout:  { name: '스카우트', algo: 'Local Q',      personality: '근시안 정찰병',          cls: LocalQLearning, desc: '주변을 관찰해서 학습합니다. 처음 보는 던전도 경험을 활용!' },
    sarsa:  { name: '사르사',   algo: 'SARSA',        personality: '겁쟁이',                cls: SARSA,          desc: '실수에서 배우는 신중파. 안전한 길을 선호합니다.' },
    monte:  { name: '몬테',     algo: 'Monte Carlo',  personality: '끝까지 가봐야 직성',     cls: MonteCarlo,     desc: '끝까지 가봐야 안다! 완주 후 복기하는 사색가.' },
    tracer: { name: '트레이서', algo: 'SARSA(λ)',     personality: '흔적 추적자',           cls: SarsaLambda,    desc: '발자취를 남기며 학습. 먼 과거의 선택도 평가합니다.' },
    dyna:   { name: '다이나',   algo: 'Dyna-Q',       personality: '공상가',                cls: DynaQ,          desc: '상상력의 달인. 경험을 머릿속에서 반복 재생합니다.' },
    gradi:  { name: '그래디',   algo: 'REINFORCE',    personality: '감으로 찍는 싸구려',    cls: Reinforce,      desc: '직감형 탐험가. 확률로 판단, 다양한 경로를 시도합니다.' },
    critic: { name: '크리틱',   algo: 'Actor-Critic', personality: '잔소리꾼',              cls: ActorCritic,    desc: '배우와 비평가를 겸비. 안정적이고 효율적입니다.' },
    qvkun:  { name: 'QV군',    algo: 'QV-Learning',  personality: '이중인격',              cls: QVLearning,     desc: 'Q와 V를 동시에 학습. 과대추정을 줄여 안정적입니다.' },
    acla:   { name: '아클라',   algo: 'ACLA',         personality: '변덕쟁이',              cls: ACLA,           desc: '학습 오토마톤. 확률을 직접 조작해 빠르게 정책을 바꿉니다.' },
    ensemble: { name: '앙상블', algo: 'Ensemble',     personality: '합의체',                cls: Ensemble,       desc: '5개 알고리즘의 합의. 볼츠만 곱으로 최적 행동을 선택합니다.' },
    exsa:     { name: '에크사', algo: 'Expected SARSA', personality: '계산기',              cls: ExpectedSarsa, desc: '기대값으로 학습. 분산 없는 업데이트로 퀴니와 사르사를 모두 지배합니다.' },
    doubleq:  { name: '더블Q', algo: 'Double Q',     personality: '의심쟁이',              cls: DoubleQLearning, desc: '두 개의 눈으로 편향 없이 판단. 과대추정의 해결사.' },
    treeback: { name: '트리백', algo: 'Tree Backup',  personality: '선견자',                cls: TreeBackup,      desc: 'n걸음 앞을 내다보는 전략가. 기대값의 나무를 키웁니다.' },
    sweeper:  { name: '스위퍼', algo: 'Pri. Sweep',   personality: '효율주의자',            cls: PrioritizedSweeping, desc: '중요한 것부터 정리하는 효율주의자. 다이나의 진화형.' },
};

// Dungeon config: cost to enter, first clear reward, repeat reward
export const DUNGEON_CONFIG = {
    // Ch.1: 첫 발걸음 (tutorial — generous rewards to kickstart economy)
    level_01_easy:     { cost: 0,  firstReward: 100,  repeatReward: 10 },
    level_02_trap:     { cost: 5,  firstReward: 150,  repeatReward: 15 },
    level_03_maze:     { cost: 10, firstReward: 200,  repeatReward: 20 },
    // Ch.2: 위험한 길
    level_04_pit:      { cost: 10, firstReward: 250, repeatReward: 25 },
    level_05_gold:     { cost: 15, firstReward: 300, repeatReward: 30 },
    level_06_risk:     { cost: 20, firstReward: 350, repeatReward: 35 },
    level_07_gauntlet: { cost: 25, firstReward: 500, repeatReward: 50 },
    // Ch.3: 넓은 세계
    level_08_deadly:   { cost: 30, firstReward: 600, repeatReward: 60 },
    level_09_treasure: { cost: 40, firstReward: 800, repeatReward: 80 },
    level_10_final:    { cost: 50, firstReward: 1000, repeatReward: 100 },
    level_11_hp_test:  { cost: 0,  firstReward: 400, repeatReward: 40, useHpState: true },
    level_12_hp_gauntlet: { cost: 0, firstReward: 600, repeatReward: 60, useHpState: true },
    // Ch.4: 직감과 비평
    level_13_cliff:    { cost: 0,  firstReward: 400, repeatReward: 40 },
    level_14_long_hall: { cost: 0, firstReward: 500, repeatReward: 50 },
    level_15_multi_room: { cost: 0, firstReward: 400, repeatReward: 40 },
    level_16_open_field: { cost: 0, firstReward: 400, repeatReward: 40 },
    level_17_two_paths: { cost: 0, firstReward: 500, repeatReward: 50 },
    // Ch.5: 합의의 힘 — B-103: 8→4 던전 축소 (Lv.20~23 컷, paper_maze 가 ensemble 의 핵심 벤치마크라 보존)
    level_18_dead_end: { cost: 0, firstReward: 500, repeatReward: 50 },
    level_19_bridge: { cost: 0, firstReward: 500, repeatReward: 50 },
    level_24_paper_maze: { cost: 0, firstReward: 400, repeatReward: 40 },
    level_25_paper_hard: { cost: 0, firstReward: 500, repeatReward: 50 },
    // Ch.6: 불확실한 바닥
    level_26_frozen_lake: { cost: 0, firstReward: 600, repeatReward: 60, slippery: true },
    level_27_ice_maze: { cost: 0, firstReward: 700, repeatReward: 70, slippery: true },
    level_28_frozen_cliff: { cost: 0, firstReward: 800, repeatReward: 80, slippery: true },
    // Ch.7: 심연 — B-104: 보상 ×1.3 (식량 압력 -30% 상쇄, Ch.7 이 마지막 챕터라 인플레 부작용 없음)
    level_29_big_maze: { cost: 0, firstReward: 1950, repeatReward: 195, maxSteps: 1000 },
    level_30_generated_cave: { cost: 0, firstReward: 2600, repeatReward: 260, maxSteps: 2000 },
    level_31_generated_rooms: { cost: 0, firstReward: 2600, repeatReward: 260, maxSteps: 2000 }
};

// Dungeon order for unlock progression
export const DUNGEON_ORDER = [
    'level_01_easy',
    'level_02_trap',
    'level_03_maze',
    'level_04_pit',
    'level_05_gold',
    'level_06_risk',
    'level_07_gauntlet',
    'level_08_deadly',
    'level_09_treasure',
    'level_10_final',
    'level_11_hp_test',
    'level_12_hp_gauntlet',
    'level_13_cliff',
    'level_14_long_hall',
    'level_15_multi_room',
    'level_16_open_field',
    'level_17_two_paths',
    'level_18_dead_end',
    'level_19_bridge',
    'level_24_paper_maze',
    'level_25_paper_hard',
    'level_26_frozen_lake',
    'level_27_ice_maze',
    'level_28_frozen_cliff',
    'level_29_big_maze',
    'level_30_generated_cave',
    'level_31_generated_rooms'
];

// B-1: Operating cost per episode (base cost, scaled by sqrt(level) in getOperatingCost)
// Design: free trio (qkun/sarsa/monte) are cheap; advanced serpas cost more
export const BASE_OP_COST = {
    qkun: 3, sarsa: 3, monte: 3,
    gradi: 2,
    tracer: 5, dyna: 6,
    critic: 5, qvkun: 5, acla: 5, exsa: 5, doubleq: 5,
    ensemble: 8, treeback: 7, sweeper: 7
};

// B-6: Dungeon hints (purchasable information)
// W17: text 필드 → key 박힘. briefing.js 의 t(hints[i].key) 로 매 토글 재평가 (D-2026-05-19-1 narrative 흡수).
export const DUNGEON_HINTS = {
    level_01_easy: [
        { key: 'hint.level_01_easy.0', cost: 50 },
    ],
    level_02_trap: [
        { key: 'hint.level_02_trap.0', cost: 50 },
    ],
    level_03_maze: [
        { key: 'hint.level_03_maze.0', cost: 50 },
    ],
    level_04_pit: [
        { key: 'hint.level_04_pit.0', cost: 50 },
    ],
    level_05_gold: [
        { key: 'hint.level_05_gold.0', cost: 50 },
        { key: 'hint.level_05_gold.1', cost: 100 },
    ],
    level_06_risk: [
        { key: 'hint.level_06_risk.0', cost: 50 },
        { key: 'hint.level_06_risk.1', cost: 100 },
    ],
    level_07_gauntlet: [
        { key: 'hint.level_07_gauntlet.0', cost: 50 },
        { key: 'hint.level_07_gauntlet.1', cost: 100 },
    ],
    level_08_deadly: [
        { key: 'hint.level_08_deadly.0', cost: 80 },
        { key: 'hint.level_08_deadly.1', cost: 120 },
    ],
    level_09_treasure: [
        { key: 'hint.level_09_treasure.0', cost: 80 },
        { key: 'hint.level_09_treasure.1', cost: 120 },
    ],
    level_10_final: [
        { key: 'hint.level_10_final.0', cost: 100 },
        { key: 'hint.level_10_final.1', cost: 150 },
    ],
    level_11_hp_test: [
        { key: 'hint.level_11_hp_test.0', cost: 50 },
    ],
    level_12_hp_gauntlet: [
        { key: 'hint.level_12_hp_gauntlet.0', cost: 80 },
        { key: 'hint.level_12_hp_gauntlet.1', cost: 120 },
    ],
    level_13_cliff: [
        { key: 'hint.level_13_cliff.0', cost: 80 },
    ],
    level_14_long_hall: [
        { key: 'hint.level_14_long_hall.0', cost: 80 },
    ],
    level_15_multi_room: [
        { key: 'hint.level_15_multi_room.0', cost: 80 },
    ],
    level_16_open_field: [
        { key: 'hint.level_16_open_field.0', cost: 80 },
    ],
    level_17_two_paths: [
        { key: 'hint.level_17_two_paths.0', cost: 80 },
        { key: 'hint.level_17_two_paths.1', cost: 120 },
    ],
    level_18_dead_end: [
        { key: 'hint.level_18_dead_end.0', cost: 80 },
        { key: 'hint.level_18_dead_end.1', cost: 120 },
    ],
    level_19_bridge: [
        { key: 'hint.level_19_bridge.0', cost: 100 },
    ],
    level_24_paper_maze: [
        { key: 'hint.level_24_paper_maze.0', cost: 80 },
    ],
    level_25_paper_hard: [
        { key: 'hint.level_25_paper_hard.0', cost: 100 },
        { key: 'hint.level_25_paper_hard.1', cost: 150 },
    ],
    level_26_frozen_lake: [
        { key: 'hint.level_26_frozen_lake.0', cost: 100 },
        { key: 'hint.level_26_frozen_lake.1', cost: 150 },
    ],
    level_27_ice_maze: [
        { key: 'hint.level_27_ice_maze.0', cost: 120 },
    ],
    level_28_frozen_cliff: [
        { key: 'hint.level_28_frozen_cliff.0', cost: 120 },
        { key: 'hint.level_28_frozen_cliff.1', cost: 180 },
    ],
    level_29_big_maze: [
        { key: 'hint.level_29_big_maze.0', cost: 150 },
        { key: 'hint.level_29_big_maze.1', cost: 200 },
    ],
    level_30_generated_cave: [
        { key: 'hint.level_30_generated_cave.0', cost: 200 },
        { key: 'hint.level_30_generated_cave.1', cost: 300 },
    ],
    level_31_generated_rooms: [
        { key: 'hint.level_31_generated_rooms.0', cost: 200 },
        { key: 'hint.level_31_generated_rooms.1', cost: 300 },
    ],
};

// Training constants
export const MAX_EPISODES = 10000;
export const CONVERGENCE_WINDOW = 20;
export const CONVERGENCE_THRESHOLD = 0.95;

// Helper: create algorithm instance for a character on a grid
export function createAlgorithm(charName, grid, config, overrides = {}) {
    const charDef = CHARACTERS[charName];
    if (!charDef) {
        return new QLearning(grid, overrides);
    }

    const baseOpts = {
        alpha: overrides.alpha ?? 0.1,
        gamma: overrides.gamma ?? 0.99,
        epsilon: overrides.epsilon ?? 1.0,
        epsilonMin: overrides.epsilonMin ?? 0.01,
        epsilonDecay: overrides.epsilonDecay ?? 0.995,
        useHpState: config.useHpState ?? false
    };

    switch (charName) {
        case 'scout':
            return new LocalQLearning(grid, baseOpts);
        case 'gradi':
            return new Reinforce(grid, { ...baseOpts, alpha: 0.01 });
        case 'critic':
            return new ActorCritic(grid, { ...baseOpts, alphaActor: 0.01, alphaCritic: 0.1 });
        case 'tracer':
            return new SarsaLambda(grid, { ...baseOpts, lambda: 0.9 });
        case 'dyna':
            return new DynaQ(grid, { ...baseOpts, planningSteps: 10 });
        case 'treeback':
            return new TreeBackup(grid, { ...baseOpts, alpha: 0.5, n: 4 });
        case 'sweeper':
            return new PrioritizedSweeping(grid, { ...baseOpts, alpha: 0.5, planningSteps: 5, theta: 0.0001 });
        case 'acla':
            return new ACLA(grid, { ...baseOpts, alphaActor: 0.05, alphaCritic: 0.1 });
        case 'ensemble':
            return new Ensemble(grid, { ...baseOpts, temperature: 1.0 });
        default:
            return new charDef.cls(grid, baseOpts);
    }
}

// Helper: get dungeon level number from ID
export function getDungeonLevel(dungeonId) {
    const m = dungeonId.match(/level_(\d+)/);
    return m ? parseInt(m[1]) : 1;
}

// Helper: get operating cost per episode
// sqrt scaling: prevents late-game cost explosion while keeping early game affordable
// B-104: Ch.7 (Lv.29~31) 운영비 -30% — D-4 후속 발란스 (BASE_OP_COST 자체는 수정 금지)
export function getOperatingCost(charName, dungeonId) {
    const base = BASE_OP_COST[charName] ?? 10;
    const level = getDungeonLevel(dungeonId);
    const chapter7Discount = level >= 29 ? 0.7 : 1.0;
    return Math.ceil(base * Math.sqrt(level) * chapter7Discount);
}
