# Devlog: Multi-Stage Dungeon System 설계

**날짜**: 2026-02-14
**Phase**: 11 (계획 수립)

---

## 동기

에디터로 던전을 만들 수 있게 됐는데, 단일 그리드 하나로는 깊이가 부족하다. "3층짜리 던전"처럼 여러 스테이지를 묶어서 HP 계승, 골드 보류 같은 로그라이크 요소를 넣으면 훨씬 재밌을 것 같다는 아이디어에서 출발.

추가로 "같은 층인데 변형 A/B 중 랜덤 선택" 같은 변주를 주면, 좌표 암기형 알고리즘 vs 관찰형 알고리즘의 차이를 극적으로 보여줄 수 있다.

## 핵심 설계 결정

### 1. Stage vs Dungeon 분리

처음에는 "던전 안에 여러 그리드를 직접 내장"하는 방식을 생각했지만, 스테이지 재사용과 변형 시스템을 고려하면 **참조 모델**이 맞다.

- **Stage** = 독립적인 Grid. 라이브러리에 저장, 여러 던전에서 참조 가능.
- **Dungeon** = Floor 슬롯 배열. 각 슬롯이 Stage ID를 참조.
- 비유: Stage = 노래, Dungeon = 플레이리스트.

이 분리 덕분에 "좁은 다리" 스테이지 하나를 10개 던전에서 재사용할 수 있고, 커뮤니티 스테이지 공유 같은 확장도 자연스럽다.

### 2. MultiStageGrid: Virtual Coordinate Stacking

가장 고민한 부분. 8개 알고리즘이 모두 같은 Grid 인터페이스(`width`, `height`, `getTile`, `startPos`, `tiles[][]` 등)를 쓰고 있어서, 멀티스테이지를 어떻게 끼워넣을지가 관건이었다.

**검토한 접근법 3가지:**

| 접근법 | 장점 | 단점 |
|--------|------|------|
| A. 알고리즘 8개 전부 수정 | 깔끔 | 작업량 큼, 유지보수 부담 |
| B. Step-by-step 외부 실행 | 알고리즘 무수정 | Q-table이 스테이지 간 통합 안 됨 |
| C. **Virtual Coordinate Stacking** | 알고리즘 최소 수정 (3줄) | tiles Proxy 필요 |

**C를 선택한 이유**: 스테이지를 세로로 쌓아서 `height = sum(stage heights)`로 만들면, 알고리즘 입장에서는 "그냥 세로로 긴 Grid"로 보인다. Q-table 인덱싱(`y * width + x`)이 자연스럽게 스테이지별 영역을 분리한다. 유일한 수정은 `runEpisode()`에서 `result.done` 후 `tryAdvanceStage()` 체크 3줄뿐.

### 3. 골드 보류의 RL적 처리

게임 이코노미에서는 "사망 시 골드 소실"이지만, RL 학습에서는 골드 수집 시 즉시 +10 보상을 줘야 한다. 안 그러면 알고리즘이 "골드를 수집하는 행동"을 학습할 수 없다.

결론: **보상은 즉시, 이코노미는 보류**. 두 레이어를 분리.

### 4. Variant의 교육적 가치

랜덤 변형이 있으면:
- Q군(좌표 암기)은 변형 A를 외웠는데 B가 나오면 헤맴
- 스카우트(관찰 기반)는 주변을 보고 판단하니까 어느 변형이든 적응

→ "일반화 vs 암기"를 유저가 직접 체감. 이건 강화학습 교육 도구로서 큰 가치.

## 알고리즘 영향 전수 조사

8개 알고리즘의 Grid 사용 패턴을 전부 분석했다. 결과:

- **공통점**: `width/height`(init), `startPos`(episode start), `getTile`(tile check), `tiles[][]`(monster/gold 임시 제거)
- **특이점**: Local Q-Learning만 `goalPos`를 사용 (골 방향 계산). 멀티스테이지에서는 "현재 스테이지의 Goal"을 가리켜야 하므로 별도 처리 필요.
- **에피소드 종료**: 8개 모두 `if (result.done) break` 패턴 동일 → `tryAdvanceStage` 삽입 지점이 명확.

## 구현 단계

6단계로 나눴다 (Phase 11-A ~ 11-F):

1. **A**: Stage Library (기존 에디터 저장 대상 전환) — 소
2. **B**: Dungeon Composer UI (Floor 슬롯 관리) — 중
3. **C**: MultiStageGrid + 알고리즘 연동 — 중~대 (핵심)
4. **D**: Play Mode 멀티스테이지 — 중
5. **E**: Variant System — 소
6. **F**: 답파율, 프리셋, 마이그레이션 — 소

A→B→C→D가 핵심 경로. E는 데이터 모델에 처음부터 variant를 넣어두면 나중에 거의 공짜.

## 열린 질문

- 스테이지 수 제한 (2~5? 무제한?)
- 기존 23개 스토리 던전을 멀티스테이지로 재구성할지
- 층 간 연결 연출 (단순 전환 vs 계단 타일)

## 산출물

- `docs/MULTI_STAGE_DUNGEON.md` — 상세 구현 계획서 (514줄)
- `docs/GDD.md` Section 12 — 시스템 개요 추가
- `docs/TASK_BREAKDOWN.md` Phase 11 — 태스크 목록 (A~F, 24개 항목)
