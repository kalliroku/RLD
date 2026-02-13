# Devlog: Multi-Stage Dungeon System 구현

**날짜**: 2026-02-14
**Phase**: 11 (A~F 전체 구현)

---

## 개요

Phase 11 전체를 구현했다. 여러 스테이지를 묶어 하나의 던전으로 플레이할 수 있는 멀티스테이지 시스템.

핵심: **Virtual Coordinate Stacking** — 여러 Grid를 세로로 쌓아 "하나의 긴 Grid"로 만들어 알고리즘에 투명하게 제공.

## 구현 내역

### Phase 11-A: Stage Library
- 기존 `rld_custom_dungeons` → `rld_stages` 마이그레이션
- Stage CRUD (save/load/delete) + 드롭다운 UI
- `migrateToStages()` 자동 실행

### Phase 11-B: Dungeon Composer UI
- Editor에 Stage/Dungeon 서브탭 추가
- Floor 슬롯 추가/삭제, Stage 선택 드롭다운
- Rules 체크박스 (HP Carry Over, Gold on Clear Only)
- Dungeon 저장/불러오기/삭제 (`rld_dungeons`)
- 캔버스에 선택된 Floor의 스테이지 프리뷰

### Phase 11-C: MultiStageGrid + Algorithm Integration

**핵심 파일: `multi-stage-grid.js`**

```
MultiStageGrid
├── stages[]          — Grid 배열
├── _tiles[]          — 모든 스테이지의 row를 연결한 가상 배열
├── _stageOffsets[]   — 각 스테이지의 y 시작점
├── startPos          — Stage 0의 시작점 (+ currentStage 리셋)
├── goalPos           — 현재 스테이지의 Goal (가상 좌표)
├── tryAdvanceStage() — Goal 도달 시 다음 스테이지로 텔레포트
└── suggestedMaxSteps — 200 × stages.length
```

**설계 결정: Proxy 없이 row reference로 구현**

초기 설계에서는 `tiles` 접근에 Proxy를 계획했으나, 실제로는 각 스테이지의 `tiles[ly]` 행 배열을 직접 참조하는 방식을 선택했다.

```js
// this._tiles에 원본 행 reference를 push
for (let ly = 0; ly < stage.height; ly++) {
    this._tiles.push(stage.tiles[ly]);  // reference, not copy
}
```

이렇게 하면 `grid.tiles[y][x] = TileType.EMPTY` (몬스터/골드 임시 제거)가 원본 Stage에도 반영되고, 에피소드 끝에 복원할 때도 정상 동작한다. Proxy보다 단순하고 빠르다.

**너비가 다른 스테이지 처리**: 좁은 스테이지는 WALL로 패딩.

**8개 알고리즘 수정 (각 2곳: runEpisode + test)**

Q-Learning, Local Q, Dyna-Q, Actor-Critic, Monte Carlo, REINFORCE:
```js
if (result.done) {
    if (this.grid.tryAdvanceStage && this.grid.tryAdvanceStage(agent)) continue;
    break;
}
```

SARSA, SARSA(λ) — action을 미리 선택하므로 재선택 필요:
```js
if (result.done) {
    if (this.grid.tryAdvanceStage && this.grid.tryAdvanceStage(agent)) {
        action = this.chooseAction(agent.x, agent.y, agent.hp);
        continue;
    }
    break;
}
```

`suggestedMaxSteps`도 8개 전부 적용:
```js
maxSteps = maxSteps || this.grid.suggestedMaxSteps || 200;
```

### Phase 11-D: Play Mode Multi-Stage

- `loadDungeon()`: `dungeon_` prefix 분기 → `resolveDungeon()` → `MultiStageGrid` 생성
- `handleAction()`: 스테이지 전환 체크 → "Floor N/M reached! Advancing..." 메시지 + 효과
- `handleVictory()`: "(N Floors)" 정보 포함
- `playMultiStageDungeon()`: 에디터에서 "Play This Dungeon" 시 호출
- `renderStageSeparators()`: 골드색 대시선으로 스테이지 경계 표시

### Phase 11-E: Variant System

- Floor 데이터 모델: `{ type: 'fixed', stageId }` 또는 `{ type: 'random', variants: [{stageId, weight}] }`
- `resolveDungeon()`: fixed는 직접 로드, random은 weighted random으로 초기 선택 + variant 배열 전달
- `MultiStageGrid._resolveVariants()`: `startPos` getter에서 매 에피소드 새 변형 선택
- Composer UI: "+ Variant" 버튼으로 같은 Floor에 여러 Stage 후보 추가

### Phase 11-F: Polish

- `suggestedMaxSteps = 200 * stages.length`로 멀티스테이지 학습 시간 자동 조절
- test() 메서드도 `testMaxSteps` 사용

## 검증 결과 (브라우저 테스트)

| 항목 | 결과 |
|------|------|
| Stage A (7x7), Stage B (5x5) 저장 | OK |
| Dungeon Composer: Floor 추가 + Stage 선택 | OK |
| Dungeon 저장 "Test Multi-Stage (2F)" | OK |
| Play 모드: 2스테이지 수직 스택 렌더링 | OK |
| 수동 플레이: Stage A Goal → "Floor 1/2 reached!" → Stage B 텔레포트 | OK |
| Stage B Goal → "CLEAR! (2 Floors) Steps: 12" | OK |
| HP 계승 (100/100 유지) | OK |
| Reward 누적 (198.8) | OK |
| AI Instant Training: Q-Learning 95% after 20 episodes | OK |
| 콘솔 에러 | 없음 |

## 수정 파일 요약

| 파일 | 변경 |
|------|------|
| `web/js/game/multi-stage-grid.js` | **신규** — MultiStageGrid 클래스 (228줄) |
| `web/js/game/editor.js` | Stage Library + Dungeon CRUD + resolveDungeon + variant 해석 |
| `web/js/main.js` | Composer UI, loadDungeon 분기, handleAction 전환, playMultiStageDungeon |
| `web/js/game/renderer.js` | renderStageSeparators() 추가 |
| `web/index.html` | Sub-tabs, Dungeon Composer panel |
| `web/css/style.css` | Sub-tab, floor slot, variant 스타일 |
| 8개 알고리즘 파일 | tryAdvanceStage + suggestedMaxSteps (각 +12~15줄) |

총: 14개 파일, +1081/-151 줄

## 회고

- **Proxy → row reference 전환**이 가장 큰 설계 개선. Proxy는 디버깅이 어렵고 성능도 불확실했는데, row reference는 단순하고 확실하다.
- **SARSA/SARSA(λ)의 action 재선택**을 놓칠 뻔했다. On-policy 알고리즘은 action을 미리 선택하므로 스테이지 전환 후 반드시 새 action을 선택해야 한다.
- **goalPos가 "현재 스테이지" 기준**으로 동적 변경되는 설계가 Local Q-Learning에 중요. 최종 스테이지의 Goal만 알려주면 초기 스테이지에서 방향 감각을 잃는다.
- 브라우저 테스트에서 20 에피소드 만에 95% 수렴한 것은 스테이지가 단순해서. 복잡한 멀티스테이지에서는 더 많은 학습이 필요할 것.
