# Devlog: 에디터 Quick Test 기능

**날짜**: 2026-02-14
**Phase**: 10+ (던전 에디터 확장)

---

## 배경

Phase 10에서 던전 에디터를 구현했지만, 제작한 던전을 AI로 테스트하려면 "Play This Dungeon"으로 Play 모드로 전환한 뒤 Training을 돌려야 했다. 에디터 ↔ 플레이 모드를 오가는 것이 번거로워서, **에디터 안에서 바로 AI를 돌려보는 Quick Test 기능**을 추가했다.

## 구현

### 아키텍처: 콜백 패턴

기존 `onPlayDungeon` 콜백과 동일한 패턴을 사용했다. 에디터(editor.js)는 UI 상태만 관리하고, 실제 훈련 로직은 main.js의 `runQuickTest()`가 담당한다.

```
editor.onQuickTest(grid, character, maxEpisodes, onProgress, onComplete, shouldAbort)
  → main.js: runQuickTest()
    → grid 딥카피 (Grid.fromString)
    → createAlgorithm() (기존 캐릭터별 알고리즘 생성 재사용)
    → 비동기 배치 훈련 (batchSize=10, Instant 패턴)
    → 수렴 체크 (20ep 중 95% 성공 시 조기 종료)
    → 결과 반환 (valueGrid, policyGrid 포함)
```

핵심 설계 결정:
- **딥카피**: `Grid.fromString(grid.toString())`으로 에디터 그리드와 완전 분리. 훈련 중 몬스터/골드 소비가 에디터 그리드에 영향을 주지 않음.
- **createAlgorithm() 재사용**: 캐릭터별 알고리즘 생성 로직을 그대로 활용. `this.currentCharacter`와 `this.grid`를 일시적으로 교체 후 복원하는 방식.
- **shouldAbort() 함수**: 매 배치마다 호출하여 Stop 버튼/모드 전환 시 즉시 중단 가능.

### 정책 오버레이

Quick Test 완료 후 "Show learned policy" 체크박스로 학습된 정책을 캔버스에 시각화할 수 있다.

- `_showingTestPolicy` 플래그로 `render()`에서 Q-Value/Policy 오버레이 여부 결정
- 그리드 변경(타일 배치, Undo, Resize) 시 `applyGridToRenderer()`에서 자동 해제
- 에디터 비활성화(모드 전환) 시 `deactivate()`에서 Quick Test 자동 중단

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `web/index.html` | Quick Test 섹션 추가 (캐릭터 선택, 에피소드 수, 버튼, 프로그레스바, 결과, 체크박스) |
| `web/css/style.css` | Quick Test 레이아웃 스타일 (기존 패턴 재사용) |
| `web/js/game/editor.js` | 생성자 확장, startQuickTest/stopQuickTest, showTestPolicy/clearTestPolicy, render() 수정 |
| `web/js/main.js` | runQuickTest() 메서드, setupEditor() 콜백 연결 |

## 회고

- 콜백 패턴이 잘 작동함. 에디터는 UI만 관리하고 훈련 로직을 main.js에 위임하니 관심사 분리가 깔끔.
- `createAlgorithm()`의 `this.currentCharacter`/`this.grid` 교체-복원이 약간 해키하지만, 기존 코드 변경을 최소화하는 실용적 선택.
- Instant Training과 동일한 비동기 배치 패턴(`await setTimeout(0)`)으로 UI 응답성 유지.
