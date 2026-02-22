# Phase E-1 완료 — 밸런싱 시뮬레이터 + 경제 조정 + 유저 입력 시뮬레이션 (2026-02-22)

## 개요

헤드리스 Node.js 밸런싱 시뮬레이터를 구현하여 전체 게임 루프를 자동으로 수백 회 실행하고,
골드 커브, 클리어 속도, 병목 던전 등을 분석했다. AI 전략 3종 + 유저 입력 시뮬레이션(HybridPlayer)까지 총 4개 전략으로 밸런스를 검증했다.

## 파일 구조

```
web/js/game/game-config.js  ← NEW: 공유 상수 (main.js에서 추출)
sim/
  simulator.js              ← NEW: GameSimulator (헤드리스 게임 루프 + HP-aware BFS 경로탐색)
  strategies.js             ← NEW: 4개 전략 (StraightForward, BalancedPlayer, FarmHeavy, HybridPlayer)
  run-balance.js            ← NEW: CLI 진입점 (node sim/run-balance.js [runs] [strategy])
web/js/main.js              ← MODIFY: 상수를 game-config.js에서 import로 교체
web/js/game/run-state.js    ← MODIFY: STARTING_GOLD 500→800
web/js/game/grid.js         ← MODIFY: 4개 던전 맵 수정 (불가능 경로 해소)
```

## game-config.js — 공유 상수

main.js에서 다음 상수/함수를 추출:
- `CHARACTERS` (15개 세르파 레지스트리)
- `DUNGEON_CONFIG` (31개 던전 비용/보상)
- `DUNGEON_ORDER` (진행 순서)
- `BASE_OP_COST` (세르파별 기본 운영비)
- `DUNGEON_HINTS` (31개 던전 힌트)
- `MAX_EPISODES`, `CONVERGENCE_WINDOW`, `CONVERGENCE_THRESHOLD`
- `createAlgorithm(charName, grid, config, overrides)` — 캐릭터→알고리즘 매핑
- `getDungeonLevel(dungeonId)`, `getOperatingCost(charName, dungeonId)`

### 운영비 공식 변경

```
기존: base × level        (선형 — 후반 폭발)
변경: ceil(base × √level) (준선형 — 후반 완만)
```

## 밸런스 조정 내역

### 경제 조정
- `STARTING_GOLD`: 500 → 800
- `BASE_OP_COST` 인하: qkun/sarsa/monte 10→3, gradi 10→2, 나머지 5~8
- `DUNGEON_CONFIG` 보상 증가: 첫 클리어 2~4배, 반복 보상 2~4배

### 던전 맵 수정 (BFS로 불가능 경로 4개 발견 → 수정)
| 던전 | 문제 | 수정 |
|------|------|------|
| level_08_deadly | Pit이 유일 경로 차단 | (1,3), (7,3) P→T |
| level_10_final | 3중 나선 스파이럴 80+ 스텝 → RL 수렴 불가 | col 7에 벽 3개 개방 + 몬스터 배치 |
| level_28_frozen_cliff | Pit 벽이 전체 차단 | 2타일 갭 추가 |
| level_30_generated_cave | Pit 3개소 유일 경로 차단 | 3개 P→T |

## GameSimulator 구현

### 핵심 구조
```javascript
class GameSimulator {
    constructor(strategy)
    runPlaythrough(maxTurns = 500)  // 전체 플레이스루
    executeTurn()                    // 전략→행동→기록
    trainDungeon(dungeonId, charName) // AI 인스턴트 훈련
    manualPlayDungeon(dungeonId)     // 유저 입력 시뮬레이션
    getStats()                       // 통계 수집
}
```

### HP-aware BFS 경로탐색
유저 수동 플레이를 시뮬레이션하기 위해 HP 상태를 포함한 BFS 구현:
- 상태 공간: (x, y, hp)
- Pit 회피, Trap/Monster 데미지 반영, Heal 타일 활용
- 목표에 도달 가능한 최단 경로 + 잔여 HP 반환

### 유저 불완전성 모델
실제 플레이어의 실수를 반영:
- 경로 대비 30% 추가 스텝 (탐색, 역주행)
- 경로 길이에 비례하는 실패 확률 (20스텝 초과 시 10스텝당 -2%)
- HP 손실에 비례하는 실패 확률 (10HP당 -3%)
- 미끄러운 던전: 성공률 60% 감소
- 실패해도 식량 소모 (현실적 리스크)

## 4개 전략

| 전략 | 컨셉 | 지도 처리 | 핵심 행동 |
|------|------|-----------|-----------|
| StraightForward | 직선 돌파 | 판매 | 다음 던전 즉시 훈련 |
| BalancedPlayer | 균형형 | 보유 | 독점 파밍 → 훈련 → 업그레이드 |
| FarmHeavy | 파밍 중시 | 보유 | 2배 예산 축적 후 훈련 |
| HybridPlayer | 유저 시뮬 | 보유 | 수동 클리어 우선 → AI 대체 |

## 시뮬레이션 결과 (10회 실행)

| 전략 | 평균 클리어 | 턴 | Ch.3 | Ch.5 | Ch.7 | 수동 클리어 |
|------|------------|-----|------|------|------|------------|
| StraightForward | 11.9/31 | 500 | 10/10 | 0/10 | 0/10 | — |
| BalancedPlayer | 17.4/31 | 500 | 10/10 | 4/10 | 0/10 | — |
| FarmHeavy | 23.7/31 | 500 | 10/10 | 9/10 | 0/10 | — |
| **HybridPlayer** | **29.5/31** | **368** | **10/10** | **10/10** | **7/10** | 28.3 |

### 핵심 발견

1. **수동 플레이가 ~100배 저렴**: 식량 비용 ~1,000G vs AI 훈련 ~100,000G
2. **모든 전략 Ch.3 돌파 가능** (원래 목표 달성)
3. **HybridPlayer(수동+AI)가 가장 현실적**: 50% 풀 클리어율, 29.5/31 평균
4. **보편적 병목**: level_12_hp_gauntlet (AI 다회 시도 필요)
5. **미끄러운 던전 (Ch.6)**: 수동/AI 모두 어려움

### 경제 분석
- 수동 클리어 비용: 던전당 ~35G (식량)
- AI 훈련 비용: 던전당 ~3,000~5,000G (운영비 × 에피소드)
- 시작 골드(800G)로 초반 경제 안정
- 파밍 수입(10~200G/턴)으로 중반 이후 경제 유지

## 버그 수정

1. `_pendingMapChoice` 미초기화 → 지도 선택 후 초기화 추가
2. Solo character 파밍 교착 → getCheapestChar가 파밍 중 캐릭터 건너뛰는 문제 해결
3. FarmHeavy assign/remove 무한루프 → 예산 충족 시 파밍 배정 건너뛰기
4. estimateManualCost/manualPlayDungeon 배율 불일치 → 상수 HUMAN_STEP_MULTIPLIER 통일

## 실행 방법

```bash
# 전체 전략 10회씩
node sim/run-balance.js 10 all 2>/dev/null

# 특정 전략만
node sim/run-balance.js 5 HybridPlayer 2>/dev/null

# 전략 이름: StraightForward, BalancedPlayer, FarmHeavy, HybridPlayer
```

## 다음 단계

- 보물 캔버스 렌더링 (`renderer.js` 수정)
- 브라우저 인터랙티브 테스트
- 시뮬레이터 기반 추가 밸런스 조정 (Ch.6~7 돌파율 개선)
