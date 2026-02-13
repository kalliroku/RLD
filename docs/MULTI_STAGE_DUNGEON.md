# Multi-Stage Dungeon System - Implementation Plan

## 1. Overview

여러 스테이지(층)를 묶어 하나의 "던전"으로 구성하는 시스템.
스테이지는 독립적으로 생성/관리되며, 던전은 스테이지들의 **조합 레시피**.

### Core Concepts

```
Stage (스테이지)          = 재사용 가능한 단위 그리드 (기존 Grid)
Dungeon (던전)            = 스테이지 조합 레시피 (floor slot 배열)
Run (실행)               = 랜덤 변형이 확정된 구체적 1회 플레이
```

### 핵심 게임 규칙
- **HP 계승**: 이전 층에서 남은 HP로 다음 층 시작
- **골드 보류**: 스테이지 중 모은 골드는 임시 → 전체 클리어 or 1층 귀환 시 확정
- **사망 시 소실**: 중간에 죽으면 임시 골드 전부 소실
- **답파율 추적**: 던전 단위 클리어 성공률

---

## 2. Data Model

### 2.1 Stage (스테이지)

기존 Grid와 동일. 에디터에서 생성, 라이브러리에 저장.

```js
// localStorage key: 'rld_stages'
{
    "cave_bridge_01": {
        id: "cave_bridge_01",
        name: "좁은 다리",
        gridString: "7,5;1,1,1,0,1,1,1;...",   // Grid.toString()
        width: 7,
        height: 5,
        tags: ["bridge", "hard"],                 // 분류/검색용 (Phase F)
        createdAt: "2026-02-14T..."
    },
    ...
}
```

### 2.2 Dungeon (던전 레시피)

스테이지 ID를 참조하는 조합 설정.

```js
// localStorage key: 'rld_dungeons'
{
    "fire_dungeon": {
        id: "fire_dungeon",
        name: "화염의 던전",
        floors: [
            {
                type: "fixed",                    // 고정 스테이지
                stageId: "cave_entry_01"
            },
            {
                type: "random",                   // 랜덤 변형
                variants: [
                    { stageId: "cave_bridge_01", weight: 1 },
                    { stageId: "cave_bridge_02", weight: 1 }
                ]
            },
            {
                type: "fixed",
                stageId: "boss_fire_01"
            }
        ],
        rules: {
            hpCarryOver: true,                    // HP 계승
            goldOnClear: true                     // 클리어 시 골드 확정
        },
        createdAt: "2026-02-14T..."
    }
}
```

### 2.3 기존 Custom Dungeon과의 관계

| 기존 | 신규 |
|------|------|
| `rld_custom_dungeons` | `rld_stages` (스테이지 라이브러리) |
| — | `rld_dungeons` (던전 레시피) |
| 단일 Grid 직접 저장 | Stage ID를 참조하는 조합 |

**마이그레이션**: 기존 커스텀 던전은 "1-floor 던전" (floor 1개 = 기존 단일 스테이지)으로 자동 변환. 기존 `rld_custom_dungeons` 키는 유지하되, 신규 저장은 `rld_stages` + `rld_dungeons` 사용.

---

## 3. Architecture: MultiStageGrid

### 3.1 핵심 문제

8개 알고리즘이 모두 `this.grid`의 동일 인터페이스를 사용:

| 사용처 | 메서드/속성 |
|--------|------------|
| Q-table 크기 | `grid.width`, `grid.height` |
| 에피소드 시작 | `grid.startPos` |
| 골 방향 (Local Q만) | `grid.goalPos` |
| 타일 조회 | `grid.getTile(x, y)` |
| 타일 직접 접근 | `grid.tiles[y][x]` |
| 경계 체크 | `grid.isValidPosition(x, y)` |
| 몬스터/골드 제거 | `grid.tiles[y][x] = TileType.EMPTY` |

**에피소드 종료 감지**: `result.done === true` → `break` (8개 알고리즘 동일)

### 3.2 접근법: Virtual Coordinate Stacking

알고리즘 수정을 최소화하기 위해, 여러 스테이지를 **세로로 쌓은 가상 좌표계** 사용.

```
Stage 0 (7x5):  y = 0..4     ← startPos = (1, 1)
Stage 1 (7x5):  y = 5..9     ← stage 0 goal 도달 시 agent를 (1, 6)으로 텔레포트
Stage 2 (7x5):  y = 10..14   ← 최종 goalPos = (5, 13)
```

**MultiStageGrid** 클래스:

```js
class MultiStageGrid {
    constructor(stages) {
        this.stages = stages;              // Grid[]
        this.stageOffsets = [];            // [0, 5, 10, ...]
        this.width = max(stages.map(s => s.width));
        this.height = sum(stages.map(s => s.height));
        // startPos = stages[0].startPos (y offset 0)
        // goalPos = stages[last].goalPos (y offset = sum of previous heights)
    }

    getTile(x, y) {
        const { stageIdx, localY } = this._toLocal(y);
        return this.stages[stageIdx].getTile(x, localY);
    }

    get tiles() {
        // Proxy: tiles[y][x] → stages[stageIdx].tiles[localY][x]
        return new Proxy(...);
    }

    isValidPosition(x, y) {
        const { stageIdx, localY } = this._toLocal(y);
        return this.stages[stageIdx].isValidPosition(x, localY);
    }

    get startPos() {
        return this.stages[0].startPos;    // no offset needed
    }

    get goalPos() {
        const last = this.stages.length - 1;
        const offset = this.stageOffsets[last];
        const gp = this.stages[last].goalPos;
        return gp ? { x: gp.x, y: gp.y + offset } : null;
    }

    // Stage 전환: Goal 타일을 Portal로 처리
    // 비-최종 스테이지의 Goal → agent 도달 시 done=true이지만
    // 텔레포트 후 에피소드 계속
}
```

### 3.3 알고리즘 수정 (8개 × 동일한 최소 변경)

각 알고리즘의 `runEpisode()`에서, `result.done` 후 `break` 전에 3줄 추가:

```js
if (result.done) {
    // Multi-stage transition check
    if (this.grid.tryAdvanceStage) {
        const advanced = this.grid.tryAdvanceStage(agent);
        if (advanced) { result.done = false; continue; }
    }
    break;
}
```

`tryAdvanceStage(agent)`:
1. agent가 현재 스테이지의 Goal에 있고, 살아있으면
2. 다음 스테이지가 있으면
3. agent.x/y를 다음 스테이지의 startPos + y offset으로 변경
4. return true (에피소드 계속)
5. 마지막 스테이지이거나 사망이면 return false (에피소드 종료)

**일반 Grid에는 `tryAdvanceStage`가 없으므로**, 기존 단일 스테이지 동작은 영향 없음.

### 3.4 스테이지 크기 제약

**MVP: 동일 너비(width) 강제**
- 높이는 달라도 됨
- 같은 width를 공유해야 Q-table 인덱싱이 자연스러움
- 에디터에서 던전 생성 시 width 통일 UI 제공

**향후 확장**: 다른 width 허용 시, width를 max(stages.width)로 확장하고 빈 공간은 WALL로 패딩.

### 3.5 State Space 영향

| 알고리즘 | 기존 state | Multi-stage state | 영향 |
|---------|-----------|-------------------|------|
| Q-Learning | (x, y) → y*w+x | (x, virtualY) → virtualY*w+x | Q-table 크기 증가 (stages수 배) |
| SARSA, MC, SARSA(λ), Dyna-Q | 동일 | 동일 | 동일 |
| REINFORCE, Actor-Critic | 동일 | 동일 | theta/V table 크기 증가 |
| Local Q (Scout) | 관찰 기반 | 관찰 기반 + goalDist 변경 | goalPos가 최종 goal이므로 거리 변화 |

Local Q의 경우 goalPos가 최종 스테이지의 goal을 가리키므로, 현재 스테이지에서의 목표(현재 스테이지 goal)와 다를 수 있음. 이는 별도 처리 필요 (currentStageGoalPos 제공).

---

## 4. Editor UX

### 4.1 2-Tier Editor (서브탭)

```
┌──────────────────────────────────────────┐
│  [Play]  [Editor]                        │  ← 기존 모드 탭
└──────────────────────────────────────────┘
                    ↓ Editor 선택 시
┌──────────────────────────────────────────┐
│  [Stage]  [Dungeon]                      │  ← 서브탭 (신규)
└──────────────────────────────────────────┘
```

### 4.2 Stage 탭 (기존 에디터 확장)

기존 에디터 기능 그대로. 변경사항:
- "Save / Load" → "Stage Library"로 명칭 변경
- 저장 대상: `rld_stages`
- Quick Test는 단일 스테이지용으로 유지

### 4.3 Dungeon 탭 (신규)

```
┌─────────────────────────────────┐
│  Dungeon Composer                │
│                                  │
│  Name: [화염의 던전          ]   │
│                                  │
│  ┌ Floor 1 ──────────────────┐  │
│  │ [cave_entry_01        ▼]  │  │
│  │                    [Edit] │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌ Floor 2 ──────────────────┐  │
│  │ [cave_bridge_01       ▼]  │  │
│  │ [+ Add Variant]           │  │
│  │  → cave_bridge_02 (50%)   │  │
│  │                    [Edit] │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌ Floor 3 ──────────────────┐  │
│  │ [boss_fire_01         ▼]  │  │
│  │                    [Edit] │  │
│  └───────────────────────────┘  │
│                                  │
│  [+ Add Floor]                   │
│                                  │
│  ┌ Rules ────────────────────┐  │
│  │ ☑ HP Carry Over           │  │
│  │ ☑ Gold on Clear Only      │  │
│  └───────────────────────────┘  │
│                                  │
│  [Save] [Quick Test] [Play]      │
│                                  │
│  ┌ Preview ──────────────────┐  │
│  │ (캔버스: 선택된 floor의    │  │
│  │  스테이지 그리드 표시)     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**[Edit] 버튼**: Stage 탭으로 전환하여 해당 스테이지 열기
**Floor 선택**: 클릭 시 캔버스에 해당 스테이지 프리뷰

### 4.4 Play 모드 확장

```
┌─ 던전 선택 ──────────────────────────────────┐
│  Dungeon 드롭다운:                            │
│  [Custom] 화염의 던전 (3F)         ← 층 수 표시 │
└──────────────────────────────────────────────┘

┌─ 플레이 중 ──────────────────────────────────┐
│  Floor 1/3 - 동굴 입구              ← 층 표시 │
│  [캔버스: 현재 스테이지]                       │
│  Pending Gold: 15G                  ← 임시 골드 │
└──────────────────────────────────────────────┘

┌─ 스테이지 전환 시 ───────────────────────────┐
│  "Floor 1 Clear!" 연출                       │
│  → 화면 전환 → Floor 2 시작 (HP 유지)        │
└──────────────────────────────────────────────┘
```

---

## 5. Play Mode: Multi-Stage Episode Flow

### 5.1 수동 플레이

```
1. 던전 입장 (골드 차감)
2. Floor 1 로드 → 기존 플레이와 동일
3. Goal 도달 → "Floor N Clear!" 메시지 + 전환 효과
4. Floor N+1 로드 → HP 유지, agent를 새 스테이지 startPos에 배치
5. 마지막 Floor Goal 도달 → "Dungeon Clear!" + 임시 골드 확정
6. 사망 시 → 임시 골드 소실 + 1층부터 재시작
```

### 5.2 AI Training

**Instant 모드**: `runEpisode()` 내에서 `tryAdvanceStage`로 자동 전환
**Visual 모드**: main.js의 step-by-step 루프에서 Goal 도달 시 다음 스테이지 로드 + 렌더

### 5.3 골드 보류 시스템

```js
// 에피소드 중
pendingGold = 0;

// 골드 타일 수집 시
pendingGold += 10;  // 임시 저장
reward += 10;       // RL 학습에는 즉시 보상 (학습 친화적)

// 던전 클리어 시
this.gold += pendingGold;  // 확정

// 사망 시
pendingGold = 0;  // 소실
```

**RL 학습에서의 보상**: 골드 수집 시 즉시 +10 보상을 줌 (보류는 게임 이코노미에만 적용). 이렇게 해야 알고리즘이 "골드를 수집하는 행동"을 학습할 수 있음.

---

## 6. Variant System (랜덤 변형)

### 6.1 기본 동작

```js
// 던전 실행 시 (Run 생성)
function resolveDungeon(dungeon, stageLibrary) {
    return dungeon.floors.map(floor => {
        if (floor.type === 'fixed') {
            return stageLibrary[floor.stageId];
        } else if (floor.type === 'random') {
            return weightedRandom(floor.variants, stageLibrary);
        }
    });
}
```

### 6.2 RL 학습 의미

| 알고리즘 유형 | 변형 대응력 | 이유 |
|-------------|-----------|------|
| 좌표 암기형 (Q군, 사르사 등) | 약함 | 변형 A를 외웠는데 B가 나오면 적응 불가 |
| 관찰형 (스카우트) | 강함 | 주변 관찰 기반이므로 레이아웃 변화에 유연 |
| 정책 경사법 (그래디, 크리틱) | 중간 | 확률적 정책이라 약간의 적응력 있음 |

→ "왜 특정 알고리즘이 랜덤 던전에서 더 잘하는가?"를 체험하는 **교육적 가치**.

### 6.3 학습 전략

변형이 있는 던전을 학습할 때:
- 매 에피소드마다 `resolveDungeon()`으로 새로운 변형 생성
- 알고리즘은 다양한 변형을 경험하며 일반화 학습
- 좌표 암기형은 state space가 변형 수만큼 커져야 하므로 학습이 어려움
- 이는 의도된 결과 (일반화 vs 암기의 교육 포인트)

---

## 7. Implementation Phases

### Phase 11-A: Stage Library (소)

**목표**: 기존 에디터의 저장 대상을 Stage Library로 전환

| 파일 | 변경 |
|------|------|
| `editor.js` | `STORAGE_KEY_CUSTOM` → `STORAGE_KEY_STAGES` 추가, 기존 호환 유지 |
| `main.js` | setupEditor에서 Stage Library 연동 |
| `index.html` | Save/Load 섹션 라벨 변경 |

- [ ] Stage 저장소 (`rld_stages`) CRUD
- [ ] 기존 `rld_custom_dungeons` → `rld_stages` 마이그레이션 함수
- [ ] Stage Library 드롭다운 UI

### Phase 11-B: Dungeon Composer UI (중)

**목표**: 에디터에 Dungeon 서브탭 추가, Floor 슬롯 관리

| 파일 | 변경 |
|------|------|
| `index.html` | Stage/Dungeon 서브탭, Dungeon Composer HTML |
| `css/style.css` | Composer 레이아웃 스타일 |
| `editor.js` | 서브탭 전환, Dungeon 데이터 관리 |
| `main.js` | Dungeon Composer 이벤트 연결 |

- [ ] Stage / Dungeon 서브탭 전환 UI
- [ ] Dungeon 데이터 모델 (`rld_dungeons`) CRUD
- [ ] Floor 슬롯 추가/삭제/순서 변경
- [ ] Floor에 Stage 선택 (드롭다운)
- [ ] 선택된 Floor의 스테이지 캔버스 프리뷰
- [ ] Rules 설정 (HP Carry Over, Gold on Clear)
- [ ] Dungeon 저장/불러오기/삭제

### Phase 11-C: MultiStageGrid + Algorithm Integration (중~대)

**목표**: 여러 스테이지를 하나의 환경으로 결합, 알고리즘 연동

| 파일 | 변경 |
|------|------|
| `multi-stage-grid.js` | **신규** MultiStageGrid 클래스 |
| `qlearning.js` | runEpisode/test에 tryAdvanceStage 3줄 추가 |
| `local-qlearning.js` | 동일 + currentStageGoalPos 처리 |
| `sarsa.js` | runEpisode/test에 tryAdvanceStage 3줄 추가 |
| `monte-carlo.js` | 동일 |
| `sarsa-lambda.js` | 동일 |
| `dyna-q.js` | 동일 |
| `reinforce.js` | 동일 |
| `actor-critic.js` | 동일 |

- [ ] MultiStageGrid 클래스 (Virtual Coordinate Stacking)
- [ ] Grid 인터페이스 호환 (width, height, startPos, goalPos, getTile, tiles Proxy, isValidPosition)
- [ ] tryAdvanceStage(agent) 메서드
- [ ] 8개 알고리즘 runEpisode()/test()에 stage transition 코드 추가
- [ ] Local Q-Learning의 goalPos 처리 (currentStageGoalPos)
- [ ] 몬스터/골드 복원 로직이 멀티스테이지에서 정상 동작 확인
- [ ] 단일 스테이지(기존 Grid) 회귀 테스트

### Phase 11-D: Play Mode Multi-Stage (중)

**목표**: 수동 플레이 + AI 훈련에서 멀티스테이지 동작

| 파일 | 변경 |
|------|------|
| `main.js` | loadDungeon, reset, handleAction, training 로직 확장 |
| `index.html` | 층 표시 UI, 임시 골드 표시 |
| `css/style.css` | 층 전환 연출 스타일 |

- [ ] 멀티스테이지 던전 로드 (resolveDungeon + MultiStageGrid 생성)
- [ ] 수동 플레이: Goal 도달 시 스테이지 전환 + HP 유지
- [ ] 스테이지 전환 시각 효과 ("Floor N Clear!")
- [ ] 현재 층 표시 UI ("Floor 1/3")
- [ ] 골드 보류 시스템 (pendingGold)
- [ ] Visual Training: 스테이지 전환 시 렌더 업데이트
- [ ] Instant Training: MultiStageGrid.runEpisode 자연 동작
- [ ] Play 모드 던전 드롭다운에 멀티스테이지 던전 표시 ("(3F)" 접미사)

### Phase 11-E: Variant System (소)

**목표**: Floor 슬롯에 랜덤 변형 후보 추가

| 파일 | 변경 |
|------|------|
| `index.html` | variant 추가 UI |
| `editor.js` 또는 `dungeon-composer.js` | variant 관리 |
| `main.js` | resolveDungeon에서 weighted random 선택 |
| `multi-stage-grid.js` | 에피소드마다 새 변형 resolve |

- [ ] Floor 슬롯에 "Add Variant" 버튼
- [ ] Variant 목록 표시 (weight 포함)
- [ ] resolveDungeon(): weighted random 선택 구현
- [ ] Training 시 매 에피소드 새 변형 생성

### Phase 11-F: Polish (소)

- [ ] 던전 답파율 표시 (최근 N 에피소드 기반)
- [ ] Quick Test 멀티스테이지 지원
- [ ] 프리셋 멀티스테이지 던전 1~2개 추가
- [ ] 기존 커스텀 던전 마이그레이션 안내 UI

---

## 8. Risk Analysis

### 8.1 기술적 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| tiles Proxy 성능 | 매 타일 접근마다 stage 조회 | stageOffsets 이분탐색으로 O(log N) |
| Q-table 메모리 | stages 수 × 기존 크기 | 3층 정도면 3배, 25x25 기준 1875 states → 문제 없음 |
| 다른 너비 스테이지 | 좌표 매핑 복잡 | MVP에서 동일 너비 강제, 향후 패딩으로 해결 |
| Local Q goalPos | 멀티스테이지에서 현재 목표 혼동 | currentStageGoalPos 별도 제공 |

### 8.2 UX 리스크

| 리스크 | 대응 |
|--------|------|
| 에디터 복잡도 증가 | Stage/Dungeon 서브탭으로 관심사 분리 |
| 멀티스테이지 학습 시간 증가 | 에피소드 수 기본값 상향 (3000~5000) |
| 변형 시스템 혼동 | "Advanced" 섹션으로 분리, 기본은 fixed만 |

---

## 9. Open Questions

1. **스테이지 수 제한**: 2~5층? 무제한?
   - 추천: MVP는 2~5층, 향후 확장
2. **스테이지별 독립 훈련**: 1층만 따로 연습 가능하게 할지?
   - 추천: Stage 탭에서 Quick Test로 가능 (기존 기능)
3. **층 간 연결 연출**: 단순 전환 vs 계단/문 타일 시각 효과?
   - 추천: MVP는 메시지 + 페이드, 향후 타일 추가
4. **기존 23개 스토리 던전**: 멀티스테이지로 재구성할지?
   - 추천: 기존 유지, 멀티스테이지는 커스텀 전용으로 시작

---

*Document Version: 1.0*
*Created: 2026-02-14*
