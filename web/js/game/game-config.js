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
export const CHARACTERS = {
    qkun:   { name: 'Q군',     algo: 'Q-Learning',   cls: QLearning,      desc: '좌표를 외워서 학습합니다. 던전별 전문가.' },
    scout:  { name: '스카우트', algo: 'Local Q',      cls: LocalQLearning, desc: '주변을 관찰해서 학습합니다. 처음 보는 던전도 경험을 활용!' },
    sarsa:  { name: '사르사',   algo: 'SARSA',        cls: SARSA,          desc: '실수에서 배우는 신중파. 안전한 길을 선호합니다.' },
    monte:  { name: '몬테',     algo: 'Monte Carlo',  cls: MonteCarlo,     desc: '끝까지 가봐야 안다! 완주 후 복기하는 사색가.' },
    tracer: { name: '트레이서', algo: 'SARSA(λ)',     cls: SarsaLambda,    desc: '발자취를 남기며 학습. 먼 과거의 선택도 평가합니다.' },
    dyna:   { name: '다이나',   algo: 'Dyna-Q',       cls: DynaQ,          desc: '상상력의 달인. 경험을 머릿속에서 반복 재생합니다.' },
    gradi:  { name: '그래디',   algo: 'REINFORCE',    cls: Reinforce,      desc: '직감형 탐험가. 확률로 판단, 다양한 경로를 시도합니다.' },
    critic: { name: '크리틱',   algo: 'Actor-Critic', cls: ActorCritic,    desc: '배우와 비평가를 겸비. 안정적이고 효율적입니다.' },
    qvkun:  { name: 'QV군',    algo: 'QV-Learning',  cls: QVLearning,     desc: 'Q와 V를 동시에 학습. 과대추정을 줄여 안정적입니다.' },
    acla:   { name: '아클라',   algo: 'ACLA',         cls: ACLA,           desc: '학습 오토마톤. 확률을 직접 조작해 빠르게 정책을 바꿉니다.' },
    ensemble: { name: '앙상블', algo: 'Ensemble',     cls: Ensemble,       desc: '5개 알고리즘의 합의. 볼츠만 곱으로 최적 행동을 선택합니다.' },
    exsa:     { name: '에크사', algo: 'Expected SARSA', cls: ExpectedSarsa, desc: '기대값으로 학습. 분산 없는 업데이트로 Q군과 사르사를 모두 지배합니다.' },
    doubleq:  { name: '더블Q', algo: 'Double Q',     cls: DoubleQLearning, desc: '두 개의 눈으로 편향 없이 판단. 과대추정의 해결사.' },
    treeback: { name: '트리백', algo: 'Tree Backup',  cls: TreeBackup,      desc: 'n걸음 앞을 내다보는 전략가. 기대값의 나무를 키웁니다.' },
    sweeper:  { name: '스위퍼', algo: 'Pri. Sweep',   cls: PrioritizedSweeping, desc: '중요한 것부터 정리하는 효율주의자. 다이나의 진화형.' },
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
    // Ch.5: 합의의 힘
    level_18_dead_end: { cost: 0, firstReward: 500, repeatReward: 50 },
    level_19_bridge: { cost: 0, firstReward: 500, repeatReward: 50 },
    level_20_sacrifice: { cost: 0, firstReward: 600, repeatReward: 60 },
    level_21_desert: { cost: 0, firstReward: 600, repeatReward: 60 },
    level_22_arena: { cost: 0, firstReward: 700, repeatReward: 70, useHpState: true },
    level_23_mirage: { cost: 0, firstReward: 600, repeatReward: 60 },
    level_24_paper_maze: { cost: 0, firstReward: 400, repeatReward: 40 },
    level_25_paper_hard: { cost: 0, firstReward: 500, repeatReward: 50 },
    // Ch.6: 불확실한 바닥
    level_26_frozen_lake: { cost: 0, firstReward: 600, repeatReward: 60, slippery: true },
    level_27_ice_maze: { cost: 0, firstReward: 700, repeatReward: 70, slippery: true },
    level_28_frozen_cliff: { cost: 0, firstReward: 800, repeatReward: 80, slippery: true },
    // Ch.7: 심연
    level_29_big_maze: { cost: 0, firstReward: 1500, repeatReward: 150, maxSteps: 1000 },
    level_30_generated_cave: { cost: 0, firstReward: 2000, repeatReward: 200, maxSteps: 2000 },
    level_31_generated_rooms: { cost: 0, firstReward: 2000, repeatReward: 200, maxSteps: 2000 }
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
    'level_20_sacrifice',
    'level_21_desert',
    'level_22_arena',
    'level_23_mirage',
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
export const DUNGEON_HINTS = {
    level_01_easy: [
        { text: '5x5 크기의 작은 미로입니다.', cost: 50 },
    ],
    level_02_trap: [
        { text: '함정이 있습니다. 신중하게.', cost: 50 },
    ],
    level_03_maze: [
        { text: '7x7 미로. 길을 잃기 쉽습니다.', cost: 50 },
    ],
    level_04_pit: [
        { text: '낙사 구간이 있습니다. 즉사 주의!', cost: 50 },
    ],
    level_05_gold: [
        { text: '7x7 규모입니다. 함정에 주의.', cost: 50 },
        { text: '"낙관적인 녀석이면 충분합니다."', cost: 100 },
    ],
    level_06_risk: [
        { text: '보상이 크지만 위험도 큽니다.', cost: 50 },
        { text: '치유 타일을 잘 활용하세요.', cost: 100 },
    ],
    level_07_gauntlet: [
        { text: '연속 함정 구간입니다.', cost: 50 },
        { text: 'HP 관리가 핵심입니다.', cost: 100 },
    ],
    level_08_deadly: [
        { text: '미로 + 함정 + 구덩이.', cost: 80 },
        { text: '"체력이 좋은 녀석을 보내라."', cost: 120 },
    ],
    level_09_treasure: [
        { text: '보물이 숨겨져 있습니다.', cost: 80 },
        { text: '몬스터를 피하면 안전합니다.', cost: 120 },
    ],
    level_10_final: [
        { text: '최종 시험. 모든 요소가 등장합니다.', cost: 100 },
        { text: '"최고의 세르파가 필요합니다."', cost: 150 },
    ],
    level_11_hp_test: [
        { text: 'HP 상태를 인식하는 던전입니다.', cost: 50 },
    ],
    level_12_hp_gauntlet: [
        { text: 'HP 인식 + 연속 전투.', cost: 80 },
        { text: '"힐러가 있으면 좋겠지만..."', cost: 120 },
    ],
    level_13_cliff: [
        { text: '절벽 옆 좁은 길. 한 발짝 실수가 치명적.', cost: 80 },
    ],
    level_14_long_hall: [
        { text: '긴 복도. 스텝 효율이 중요합니다.', cost: 80 },
    ],
    level_15_multi_room: [
        { text: '여러 방을 연결하는 구조.', cost: 80 },
    ],
    level_16_open_field: [
        { text: '넓은 공간. 탐색 범위가 넓습니다.', cost: 80 },
    ],
    level_17_two_paths: [
        { text: '두 갈래 길. 하나는 안전, 하나는 위험.', cost: 80 },
        { text: '"빠른 녀석이 유리합니다."', cost: 120 },
    ],
    level_18_dead_end: [
        { text: '막다른 골목이 많습니다.', cost: 80 },
        { text: '"상상력이 풍부한 녀석이 좋습니다."', cost: 120 },
    ],
    level_19_bridge: [
        { text: '좁은 다리. 돌아갈 수 없습니다.', cost: 100 },
    ],
    level_20_sacrifice: [
        { text: '절벽 걷기. 한쪽은 낭떠러지.', cost: 100 },
        { text: '"신중한 녀석을 보내라."', cost: 150 },
    ],
    level_21_desert: [
        { text: '사막 횡단. 식량이 많이 필요합니다.', cost: 100 },
    ],
    level_22_arena: [
        { text: '몬스터 아레나. HP 관리 필수.', cost: 100 },
        { text: '"체력이 좋은 녀석이 유리합니다."', cost: 150 },
    ],
    level_23_mirage: [
        { text: '신기루. 길이 보이지 않습니다.', cost: 100 },
    ],
    level_24_paper_maze: [
        { text: '종이 미로. 벽이 얇습니다.', cost: 80 },
    ],
    level_25_paper_hard: [
        { text: '종이 미로 강화판.', cost: 100 },
        { text: '"여러 알고리즘의 합의가 필요합니다."', cost: 150 },
    ],
    level_26_frozen_lake: [
        { text: '얼음 호수. 미끄럽습니다! (확률적 이동)', cost: 100 },
        { text: '"기대값으로 학습하는 녀석이 유리합니다."', cost: 150 },
    ],
    level_27_ice_maze: [
        { text: '얼음 미로. 미끄러지면 벽에 부딪힙니다.', cost: 120 },
    ],
    level_28_frozen_cliff: [
        { text: '얼음 절벽. 미끄러지면 추락.', cost: 120 },
        { text: '"이중 학습으로 편향을 줄이는 게 핵심."', cost: 180 },
    ],
    level_29_big_maze: [
        { text: '25x25 대형 미로. 스텝 한도 1000.', cost: 150 },
        { text: '"모델 기반 학습이 효율적입니다."', cost: 200 },
    ],
    level_30_generated_cave: [
        { text: '50x50 동굴. 자동 생성됩니다.', cost: 200 },
        { text: '"우선순위 정리가 필요합니다."', cost: 300 },
    ],
    level_31_generated_rooms: [
        { text: '50x50 방 구조. 자동 생성됩니다.', cost: 200 },
        { text: '"n걸음 앞을 내다보는 전략이 필요합니다."', cost: 300 },
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
export function getOperatingCost(charName, dungeonId) {
    const base = BASE_OP_COST[charName] ?? 10;
    const level = getDungeonLevel(dungeonId);
    return Math.ceil(base * Math.sqrt(level));
}
