# RLD 게임 엔진 아키텍처 설계

> 프로그래매틱 테스트, 서버 사이드 시뮬레이션, 멀티플레이어를 위한 아키텍처 로드맵

---

## 1. 현재 문제와 목표

### 1.1 현재 상태

```
web/js/game/grid.js          ← 순수 데이터 (DOM 의존 없음) ✅
web/js/game/agent.js          ← 순수 로직 (DOM 의존 없음) ✅
web/js/game/qlearning.js ...  ← 14개 RL 알고리즘 (DOM 의존 없음) ✅
web/js/game/renderer.js       ← Canvas 렌더링 (DOM 의존)
web/js/game/run-state.js      ← localStorage 의존
web/js/main.js                ← 모든 것이 뒤섞인 God 클래스 (Game)
```

**문제**: Game 클래스가 입력 처리, 상태 관리, UI 업데이트, 렌더링을 전부 담당. 브라우저 없이는 게임 로직 한 줄도 실행 불가. 테스트하려면 직접 브라우저를 열고 수동으로 클릭해야 함.

### 1.2 목표

| 목표 | 설명 |
|------|------|
| **헤드리스 시뮬레이션** | Node.js에서 브라우저 없이 게임 로직 실행 |
| **프로그래매틱 테스트** | 시나리오 작성 → 입력 주입 → 상태 검증 자동화 |
| **결정론적 리플레이** | 시드 + 입력 시퀀스만으로 완벽 재현 |
| **서버 권위 시뮬레이션** | 서버에서 게임 상태 관리, 클라이언트는 렌더링만 |
| **멀티플레이어** | Act 3 PvP 대전 지원 |

---

## 2. 핵심 아키텍처 패턴

### 2.1 State + Reducer 패턴 (순수 함수 상태 전이)

게임 로직의 핵심을 `(state, action) => newState` 순수 함수로 분리한다.

```javascript
// shared/game-state.js — 브라우저/Node.js 양쪽에서 동작
export function createGameState(dungeon, seed) {
    return {
        grid: dungeon.grid,
        agent: { x: dungeon.startX, y: dungeon.startY, hp: 100 },
        turn: 0,
        gold: 0,
        food: 10,
        done: false,
        rng: createSeededRNG(seed)
    };
}

export function applyAction(state, action) {
    // 순수 함수: 같은 입력 → 같은 출력
    const next = structuredClone(state);
    const { dx, dy } = ACTION_DELTAS[action];
    const nx = next.agent.x + dx;
    const ny = next.agent.y + dy;

    if (isWall(next.grid, nx, ny)) return next; // 벽 충돌

    next.agent.x = nx;
    next.agent.y = ny;
    next.food--;
    next.turn++;

    // 타일 효과 적용
    applyTileEffect(next, nx, ny);

    if (next.food <= 0 || next.agent.hp <= 0) next.done = true;
    if (isGoal(next.grid, nx, ny)) { next.done = true; next.victory = true; }

    return next;
}
```

**핵심**: `applyAction`에 DOM 참조, Canvas, localStorage가 전혀 없다. Node.js에서 import 한 줄로 실행 가능.

**참고**: [Eloquent JavaScript Ch.16](https://eloquentjavascript.net/16_game.html) — State + Renderer 분리 패턴의 정석 예제

### 2.2 Command 패턴 (직렬화 가능한 입력)

모든 게임 입력을 직렬화 가능한 객체로 표현한다.

```javascript
// shared/commands.js
export const Action = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };

export function createCommand(actor, action, turn) {
    return { actor, action, turn };
}

// 직렬화/역직렬화
export function serializeCommands(commands) {
    return JSON.stringify(commands);
}
export function deserializeCommands(json) {
    return JSON.parse(json);
}
```

Command 패턴이 풀어주는 것:

| 용도 | 방법 |
|------|------|
| **테스트** | 커맨드 배열 생성 → `applyAction` 반복 호출 → 상태 검증 |
| **리플레이** | 시드 + 커맨드 배열 저장 → 재생 시 동일 순서로 적용 |
| **답파 기록** | 클리어 시 커맨드 배열 = 최단 경로 |
| **파밍** | 저장된 커맨드 배열을 자동 재생 (RL 불필요) |
| **네트워킹** | 커맨드를 WebSocket으로 전송 → 서버에서 applyAction |
| **Undo** | 커맨드에 역연산 포함 가능 |

**참고**: [Game Programming Patterns — Command](https://gameprogrammingpatterns.com/command.html), [Bob Nystrom — A Turn-Based Game Loop](https://journal.stuffwithstuff.com/2014/07/15/a-turn-based-game-loop/)

### 2.3 Seeded RNG (결정론의 기반)

`Math.random()`을 시드 기반 PRNG로 교체. 같은 시드 → 같은 난수 시퀀스 → 완벽 재현.

```javascript
// shared/rng.js
// Alea PRNG (rot.js와 동일 알고리즘)
export class SeededRNG {
    constructor(seed) { this.setSeed(seed); }
    setSeed(seed) { /* Alea 초기화 */ }
    next() { /* 0~1 반환 */ }
    getState() { return [this._s0, this._s1, this._s2, this._c]; }
    setState(s) { /* 상태 복원 */ }
}
```

**계층적 시드 구조** (Cogmind 방식):

```
월드 시드 (42)
  ├── 던전 시드 (hash(42, "level_03")) → 맵 생성용
  ├── 전투 시드 (hash(42, turn)) → 전투 판정용
  └── 전리품 시드 (hash(42, chestId)) → 보물 생성용

렌더링 RNG ← 별도 시드 (게임 로직과 완전 분리)
```

**중요**: 애니메이션/렌더링은 반드시 별도 RNG 사용. 게임 로직 RNG와 섞이면 리플레이 결정론이 깨진다.

**참고**: [seedrandom (npm)](https://www.npmjs.com/package/seedrandom), [Cogmind — Working with Seeds](https://www.gridsagegames.com/blog/2017/05/working-seeds/), [rot.js RNG](https://github.com/ondras/rot.js/blob/master/src/rng.ts)

---

## 3. 디렉토리 구조 (리팩토링 목표)

```
rld/
├── shared/                    # 순수 게임 로직 (브라우저/Node.js 공용)
│   ├── game-state.js          # (state, action) => newState
│   ├── commands.js            # Command 정의 + 직렬화
│   ├── rng.js                 # Seeded PRNG
│   ├── grid.js                # ← web/js/game/grid.js 이동
│   ├── agent.js               # ← web/js/game/agent.js 이동
│   ├── run-state.js           # localStorage 의존 제거 버전
│   ├── dungeons/              # 던전 데이터 (JSON)
│   └── algorithms/            # ← web/js/game/*.js 알고리즘들 이동
│       ├── qlearning.js
│       ├── sarsa.js
│       ├── monte-carlo.js
│       └── ...
│
├── web/                       # 브라우저 전용 (렌더링 + 입력)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── main.js            # 얇은 셸: shared 임포트 + 렌더링 + 이벤트 바인딩
│       ├── renderer.js        # Canvas 렌더링만
│       ├── input-handler.js   # 키보드/터치 → Command 변환만
│       └── ui.js              # DOM 조작만
│
├── server/                    # Node.js 서버 (시뮬레이션 + 멀티플레이어)
│   ├── headless-runner.js     # 헤드리스 게임 실행기
│   ├── simulation.js          # 시나리오 시뮬레이션
│   └── rooms/                 # 멀티플레이어 룸 (Phase 3)
│
├── test/                      # 테스트 (Vitest)
│   ├── grid.test.js
│   ├── agent.test.js
│   ├── algorithms.test.js
│   ├── game-state.test.js
│   └── scenarios/             # 시나리오 기반 통합 테스트
│       ├── food-system.test.js
│       ├── game-over.test.js
│       └── hiring.test.js
│
└── package.json               # { "type": "module" }
```

**핵심 규칙**: `shared/` 디렉토리는 `document`, `window`, `canvas`, `localStorage`, `fs`, `process` 등 환경 특정 API를 절대 사용하지 않는다. 순수 JavaScript만.

---

## 4. 프로그래매틱 테스트

### 4.1 테스트 환경 설정

```bash
npm install -D vitest
```

```json
// package.json
{
    "type": "module",
    "scripts": {
        "test": "vitest run",
        "test:watch": "vitest"
    }
}
```

### 4.2 단위 테스트 예시

```javascript
// test/grid.test.js
import { describe, it, expect } from 'vitest';
import { Grid } from '../shared/grid.js';

describe('Grid', () => {
    it('5x5 미로에서 시작점과 골 위치 확인', () => {
        const grid = Grid.fromString([
            '#####',
            '#S..#',
            '#.#.#',
            '#..G#',
            '#####'
        ].join('\n'));

        expect(grid.width).toBe(5);
        expect(grid.startPos).toEqual({ x: 1, y: 1 });
        expect(grid.goalPos).toEqual({ x: 3, y: 3 });
    });

    it('벽 타일은 이동 불가', () => {
        const grid = Grid.fromString('#S#G#');
        expect(grid.isWalkable(2, 0)).toBe(false);
    });
});
```

### 4.3 시나리오 기반 통합 테스트 예시

```javascript
// test/scenarios/food-system.test.js
import { describe, it, expect } from 'vitest';
import { createGameState, applyAction } from '../../shared/game-state.js';
import { Action } from '../../shared/commands.js';
import { loadDungeon } from '../../shared/dungeons/loader.js';

describe('식량 시스템', () => {
    it('매 스텝마다 식량 1 소모', () => {
        const dungeon = loadDungeon('level_01_easy');
        let state = createGameState(dungeon, 42);
        state.food = 5;

        state = applyAction(state, Action.RIGHT);
        expect(state.food).toBe(4);

        state = applyAction(state, Action.RIGHT);
        expect(state.food).toBe(3);
    });

    it('식량 0이면 게임 오버', () => {
        const dungeon = loadDungeon('level_01_easy');
        let state = createGameState(dungeon, 42);
        state.food = 1;

        state = applyAction(state, Action.RIGHT);
        expect(state.food).toBe(0);
        expect(state.done).toBe(true);
    });

    it('AI Training에서는 식량 소모 없음', () => {
        const dungeon = loadDungeon('level_01_easy');
        let state = createGameState(dungeon, 42);
        state.food = 5;
        state.mode = 'training';

        state = applyAction(state, Action.RIGHT);
        expect(state.food).toBe(5); // 변화 없음
    });
});

describe('게임 오버', () => {
    it('PIT 타일 밟으면 즉사', () => {
        const dungeon = loadDungeon('level_13_cliff');
        let state = createGameState(dungeon, 42);

        // PIT 위치까지 이동하는 커맨드 시퀀스
        const commands = [Action.RIGHT, Action.DOWN, Action.DOWN];
        for (const cmd of commands) {
            state = applyAction(state, cmd);
        }

        expect(state.agent.hp).toBe(0);
        expect(state.done).toBe(true);
    });
});

describe('세르파 고용', () => {
    it('골드 충분하면 고용 성공', () => {
        let state = { gold: 500, hired: new Set() };
        state = hireCharacter(state, 'gradi'); // 200G
        expect(state.gold).toBe(300);
        expect(state.hired.has('gradi')).toBe(true);
    });

    it('골드 부족하면 고용 실패', () => {
        let state = { gold: 100, hired: new Set() };
        state = hireCharacter(state, 'gradi'); // 200G 필요
        expect(state.gold).toBe(100); // 변화 없음
        expect(state.hired.has('gradi')).toBe(false);
    });
});
```

### 4.4 알고리즘 수렴 테스트

```javascript
// test/algorithms.test.js
import { describe, it, expect } from 'vitest';
import { Grid } from '../shared/grid.js';
import { QLearning } from '../shared/algorithms/qlearning.js';

describe('Q-Learning 수렴', () => {
    it('5x5 미로에서 100 에피소드 내 최적 경로 발견', () => {
        const grid = Grid.fromString([
            'S....',
            '..#..',
            '..#..',
            '..#..',
            '....G'
        ].join('\n'));

        const ql = new QLearning(grid, {
            alpha: 0.1, gamma: 0.99,
            epsilon: 1.0, epsilonDecay: 0.99
        });

        // 100 에피소드 헤드리스 훈련
        for (let i = 0; i < 100; i++) {
            ql.runEpisode();
        }

        // 탐욕 정책으로 실행 → 골까지 도달해야 함
        const result = ql.runEpisode({ epsilon: 0 });
        expect(result.done).toBe(true);
        expect(result.steps).toBeLessThan(20);
    });
});
```

---

## 5. 리플레이 시스템

### 5.1 리플레이 포맷

턴 기반 그리드 게임에서 리플레이 데이터는 극도로 작다.

```javascript
const replay = {
    version: 1,
    seed: 42,
    dungeonId: 'level_03_maze',
    character: 'qkun',
    params: { alpha: 0.1, gamma: 0.99, epsilon: 0 },
    actions: [1, 1, 2, 2, 1, 0, 0, 1],  // RIGHT, RIGHT, DOWN, DOWN, ...
    result: { done: true, victory: true, steps: 8, reward: 42 }
};
// 크기: ~200 bytes (1000스텝 에피소드도 ~4KB)
```

### 5.2 답파 기록 (클리어 경로 저장)

```javascript
// 던전 클리어 시 자동 저장
function recordAnswerPath(state, actions) {
    return {
        dungeonId: state.dungeonId,
        seed: state.seed,
        path: actions,           // 커맨드 시퀀스
        steps: actions.length,
        totalReward: state.gold
    };
}

// 파밍 시 자동 재생 (RL 알고리즘 불필요)
function replayPath(dungeon, path) {
    let state = createGameState(dungeon, dungeon.seed);
    for (const action of path) {
        state = applyAction(state, action);
    }
    return state; // 최종 상태 (보상 포함)
}
```

이것은 `GAME_LOOP_REDESIGN.md`의 "답파 기록 → 파밍 자동화" 메커닉과 직결된다.

---

## 6. 서버 사이드 시뮬레이션

### 6.1 헤드리스 러너

```javascript
// server/headless-runner.js
import { createGameState, applyAction } from '../shared/game-state.js';
import { loadDungeon } from '../shared/dungeons/loader.js';

export class HeadlessRunner {
    constructor(dungeonId, algorithmClass, options = {}) {
        this.dungeon = loadDungeon(dungeonId);
        this.algo = new algorithmClass(this.dungeon, options);
    }

    // N 에피소드 훈련 실행
    train(episodes) {
        const results = [];
        for (let i = 0; i < episodes; i++) {
            results.push(this.algo.runEpisode());
        }
        return results;
    }

    // 시나리오 실행 (특정 입력 시퀀스)
    runScenario(actions) {
        let state = createGameState(this.dungeon, this.dungeon.seed);
        const history = [structuredClone(state)];

        for (const action of actions) {
            state = applyAction(state, action);
            history.push(structuredClone(state));
            if (state.done) break;
        }

        return { finalState: state, history };
    }

    // 벤치마크
    benchmark(algorithms, episodes = 1000) {
        return algorithms.map(AlgoClass => {
            const runner = new HeadlessRunner(this.dungeon.id, AlgoClass);
            const results = runner.train(episodes);
            return {
                algorithm: AlgoClass.name,
                avgReward: avg(results.map(r => r.reward)),
                avgSteps: avg(results.map(r => r.steps)),
                convergenceEpisode: findConvergence(results)
            };
        });
    }
}
```

### 6.2 검증 서버 (게임 결과 인증)

```javascript
// server/simulation.js
import express from 'express';
import { createGameState, applyAction } from '../shared/game-state.js';

const app = express();

// 클라이언트가 보낸 리플레이를 서버에서 재검증
app.post('/verify-clear', (req, res) => {
    const { dungeonId, seed, actions } = req.body;
    const dungeon = loadDungeon(dungeonId);
    let state = createGameState(dungeon, seed);

    for (const action of actions) {
        state = applyAction(state, action);
        if (state.done) break;
    }

    if (state.victory) {
        res.json({
            verified: true,
            steps: state.turn,
            reward: state.gold
        });
    } else {
        res.json({ verified: false, reason: 'Did not reach goal' });
    }
});
```

---

## 7. 멀티플레이어 아키텍처 (Act 3: PvP)

### 7.1 네트워킹 모델 비교

| 모델 | 작동 방식 | 장점 | 단점 | 적합한 게임 |
|------|----------|------|------|-----------|
| **결정론적 락스텝** | 모든 클라이언트가 입력만 교환, 각자 동일 시뮬레이션 | 극소 대역폭, 리플레이 자동 지원 | 입력 지연 = 최고 레이턴시 플레이어, 엄격한 결정론 필수 | RTS (스타크래프트, AoE) |
| **클라이언트-서버 권위** | 서버가 유일한 게임 상태 소유자, 클라이언트는 입력 전송+예측 | 치트 방지, 유연함 | 서버 부하, 보간 구현 필요 | FPS (카운터 스트라이크, 발로란트) |
| **락스텝 + 릴레이 서버** | 락스텝이지만 서버가 중계 + 시간 검증 | 치트 방지 + 락스텝의 저대역폭 | 서버 필요 | RTS (스타 2, 슈퍼셀) |
| **GGPO 롤백** | 로컬 예측 후 불일치 시 되감기 + 재시뮬 | 즉각 반응성 | CPU 오버헤드, 4~8명 제한 | 격투게임 |

### 7.2 RLD에 최적: 락스텝 + 릴레이 서버

RLD가 그리드 기반 턴제라서 결정론 달성이 쉽다:

- 그리드 이동은 정수 연산만 (부동소수점 비결정론 없음)
- 브라우저 전용이므로 같은 JS 엔진 (크로스 플랫폼 이슈 없음)
- 턴당 입력 = 방향 1개 (~2 bits), 대역폭 극소
- 리플레이 = 입력 스트림 저장 (자동으로 지원)
- 턴 기반이므로 입력 지연 체감 없음

```
┌──────────┐    commands     ┌──────────────┐    commands     ┌──────────┐
│ Client A │ ──────────────→ │ Relay Server │ ──────────────→ │ Client B │
│          │ ←────────────── │  (검증+중계)  │ ←────────────── │          │
└──────────┘   all commands  └──────────────┘   all commands  └──────────┘
     │                              │                              │
     ↓                              ↓                              ↓
  applyAction()              applyAction()                  applyAction()
  (동일 결과)                 (권위적 검증)                   (동일 결과)
```

### 7.3 프로토콜 선택

| 프로토콜 | 전송 | 지연 | 적합도 |
|---------|------|------|--------|
| **WebSocket** | TCP | ~50ms | **최적** — 턴 기반에 TCP 신뢰성이 오히려 장점 |
| WebRTC Data Channel | UDP | ~35ms | 과잉 — P2P 설정 복잡, 15ms 차이 무의미 |
| WebTransport | QUIC/UDP | ~40ms | 미성숙 — 브라우저 지원 제한적 |

턴 기반 게임에서 10~15ms 차이는 체감 불가. WebSocket의 단순함과 범용 호환성이 최선.

### 7.4 프레임워크 비교

| 기능 | **boardgame.io** | **Colyseus** | **Socket.io (DIY)** |
|------|:----------------:|:------------:|:-------------------:|
| 턴 기반 지원 | **1급 시민** | 가능 | 직접 구현 |
| 페이즈/턴 순서 | **내장** | 직접 구현 | 직접 구현 |
| 리플레이/타임트래블 | **내장** | 직접 구현 | 직접 구현 |
| 봇 지원 | **내장** | 직접 구현 | 직접 구현 |
| 비밀 정보 관리 | **내장** | 직접 구현 | 직접 구현 |
| 실시간 동기화 | 약함 | **강력** | 직접 구현 |
| 상태 동기화 | JSON 자동 | 바이너리 델타 자동 | 직접 구현 |
| 매치메이킹 | 기본 | **내장** | 직접 구현 |
| 수평 확장 | 단일 서버 | Redis 분산 | 직접 구현 |
| npm 주간 DL | ~8,000 | ~5,000 | ~7,400,000 |

### 7.5 추천: boardgame.io (Act 1~2) → Colyseus (Act 3)

**Act 1~2 (턴 기반 답파/파밍)**: boardgame.io

```javascript
// boardgame.io 구조 예시
const RLDGame = {
    setup: () => ({
        grid: null,
        agents: {},
        turn: 0,
        gold: 500,
    }),

    phases: {
        // Act 1: 세르파 파견 → 답파
        expedition: {
            moves: {
                deployAgent: ({ G }, cellId, agentType) => {
                    G.agents[cellId] = { type: agentType };
                },
                stepAgent: ({ G }, agentId, direction) => {
                    // applyAction 호출
                },
            },
            next: 'results',
        },
        // 결과 정산
        results: {
            moves: {
                sellMap: ({ G }, dungeonId) => { /* 지도 판매 */ },
                keepMap: ({ G }, dungeonId) => { /* 지도 보유 */ },
            },
            next: 'expedition',
        },
    },

    endIf: ({ G }) => {
        if (G.partyLeader.hp <= 0) return { winner: 'dungeon' };
    },
};
```

boardgame.io가 주는 것: 페이즈 관리, 자동 타임트래블(리플레이), 봇 지원, 순수 함수 보장, 네트워킹 자동 처리. RLD의 Moves = `applyAction`과 정확히 매핑.

**Act 3 (PvP 실시간)**: 실시간 요소가 가미되면 Colyseus의 바이너리 상태 동기화 + 매치메이킹이 필요할 수 있음. 하지만 턴 기반을 유지한다면 boardgame.io로 충분.

---

## 8. 구현 로드맵

### Phase E-1: 게임 로직 분리 (필수 선행)

```
현재 main.js Game 클래스에서 순수 로직 추출 → shared/ 디렉토리
1. shared/game-state.js  — createGameState, applyAction 순수 함수
2. shared/commands.js    — Action enum, Command 직렬화
3. shared/rng.js         — SeededRNG (Alea 알고리즘)
4. shared/ 로 grid.js, agent.js, 알고리즘 파일들 이동
5. web/js/main.js → shared/ 임포트로 교체
```

### Phase E-2: 테스트 인프라

```
1. npm init + vitest 설치
2. test/ 디렉토리에 단위 테스트 작성
3. test/scenarios/ 에 시나리오 기반 통합 테스트 작성
4. CI에서 자동 실행 (GitHub Actions)
```

### Phase E-3: 리플레이 + 답파 기록

```
1. SeededRNG를 게임 로직 전체에 적용
2. 커맨드 로그 기록 시스템
3. 리플레이 저장/로드
4. 답파 기록 → 파밍 자동 재생
```

### Phase E-4: 서버 사이드 시뮬레이션

```
1. server/headless-runner.js — 헤드리스 게임 실행
2. server/simulation.js — 결과 검증 API
3. 벤치마크 러너 (알고리즘 비교)
```

### Phase E-5: 멀티플레이어 (Act 3)

```
1. boardgame.io 통합 (턴 기반 멀티플레이)
2. 페이즈 시스템 (파견/답파/정산)
3. PvP 매칭 + 리플레이/관전
4. (필요 시) Colyseus로 실시간 전투 추가
```

---

## 9. 참고 자료

### 아키텍처 패턴
- [Eloquent JavaScript Ch.16 — State/Renderer 분리](https://eloquentjavascript.net/16_game.html)
- [Game Programming Patterns — Command](https://gameprogrammingpatterns.com/command.html)
- [Bob Nystrom — A Turn-Based Game Loop](https://journal.stuffwithstuff.com/2014/07/15/a-turn-based-game-loop/)
- [gridbugs.org — ECS for Turn-Based Games](https://www.gridbugs.org/modifying-entity-component-system-for-turn-based-games/)

### 결정론 / 리플레이
- [Cogmind — Working with Seeds](https://www.gridsagegames.com/blog/2017/05/working-seeds/)
- [seedrandom (npm)](https://www.npmjs.com/package/seedrandom)
- [Gamedeveloper — Developing Your Own Replay System](https://www.gamedeveloper.com/programming/developing-your-own-replay-system)

### 네트워킹
- [Gabriel Gambetta — Client-Server Game Architecture](https://www.gabrielgambetta.com/client-server-game-architecture.html)
- [SnapNet — Netcode Architectures: Lockstep](https://www.snapnet.dev/blog/netcode-architectures-part-1-lockstep/)
- [Gaffer On Games — Deterministic Lockstep](https://gafferongames.com/post/deterministic_lockstep/)
- [mas-bandwidth — Choosing the Right Network Model](https://mas-bandwidth.com/choosing-the-right-network-model-for-your-multiplayer-game/)

### 프레임워크
- [boardgame.io](https://boardgame.io/) — 턴 기반 멀티플레이어 프레임워크
- [Colyseus](https://colyseus.io/) — 실시간 멀티플레이어 프레임워크
- [rot.js](https://github.com/ondras/rot.js) — 로그라이크 툴킷
- [bitECS](https://github.com/NateTheGreatt/bitECS) — 경량 ECS 라이브러리
- [Vitest](https://vitest.dev/) — ESM 네이티브 테스트 프레임워크

### 오픈소스 참고 프로젝트
- [Broughlike Tutorial](https://nluqo.github.io/broughlike-tutorial/) — 바닐라 JS 로그라이크 튜토리얼
- [ECS Roguelike Starter](https://github.com/indiebash/ecs-roguelike-starter) — TypeScript + rot.js + ECS
- [Hauberk](https://github.com/munificent/hauberk) — Actor/Action 패턴 참조 구현
