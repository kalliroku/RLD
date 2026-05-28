# Opening V2 PDF 검증 + Palette Swap 표

**작성일**: 2026-05-28
**원본**: Claude Design 의 Opening V2 Visual Mockup (14 페이지 PDF, 2026-05-28)
**목적**: PDF 추정값을 RLD 코드의 실제 값과 대조 + Claude Design 에 되돌릴 정정 사항 정리

---

## 1. Palette A — Swap 표 (가장 중요)

PDF 의 hex 값은 *추정값* (cover 명시) 이며, RLD 코드에는 이미 V1 palette A 가 박혀 있음 (master `c7e7593` — title-art.js + style.css).

### V1 실제 토큰 (인용 가능 형태)

```
/* title-art.js — COLOR 객체 */
bgTop:        #0a0907    /* gradient 시작 */
bgMid:        #15120e    /* gradient 중간 */
bgBot:        #1a1814    /* gradient 끝 */
ground:       #1f1c17
groundJoint:  #0d0b08
voidInside:   #050403    /* opening #screen-opening 배경과 같은 톤 */
stoneLight:   #3a3530
stoneMid:     #2a2520
stoneCrack:   #0d0b08
skin:         #d4a878    /* 인물 피부 */
bone:         #e8dcc4    /* 본문 텍스트 + 인물 골격 */
brass:        #b8860b    /* 옅은 금속/금색 (opening-speaker) */
crimson:      #5a1a1a    /* 짙은 핏색 — title-logo glow */
rust:         #8b3a1f    /* 시작 버튼 accent (brick red) */
faded:        #5a554d    /* dim text */

/* style.css 추가 */
.title-btn-primary hover:  #a04823, #b85528  /* rust 변종 */
.title-logo color:         #e8dcc4 (= bone)
.title-logo glow shadow:   rgba(90, 26, 26, ...)  /* dark red, =crimson 계 */
.title-btn-lang accent:    #b8860b (= brass)
```

### Swap 매트릭스 (PDF ↔ V1 실제)

| PDF 토큰 | PDF hex | V1 대응 | V1 hex | 차이 | 결정 |
|---|---|---|---|---|---|
| `--col-bg` | `#0E0B08` | `bgTop` | `#0a0907` | 거의 같음 | **V1 #0a0907 채택** |
| `bgDeep` | `#16110B` | `bgMid` | `#15120e` | 거의 일치 ★ | **V1 #15120e 채택** |
| `--col-text` | `#CDB88A` | `bone` | `#e8dcc4` | V1 가 더 밝음 (대비 ↑) | **V1 #e8dcc4 채택** (가독성 우선) |
| `--col-accent` | `#C08A3A` (amber) | `brass`/`rust` | `#b8860b` / `#8b3a1f` | **톤 완전히 다름** | **신규 필요 — 아래 ★ 참조** |
| `accentHi` | `#E6B562` | (없음) | — | 횃불 코어 / 귀환 빛 | **PDF 신규값 채택** |
| `stone` | `#2A2118` | `stoneMid` | `#2a2520` | 거의 일치 | **V1 #2a2520 채택** |
| `stoneLight` | `#382C20` | `stoneLight` | `#3a3530` | PDF brown vs V1 gray | **PDF #382C20 채택** (brown 정합 ↑) |
| `textDim` | `#8A7A59` | `faded` | `#5a554d` | PDF 가 따뜻함 | **PDF #8A7A59 채택** |
| `goal` | `#D4C07A` | (없음) | — | G 타일용 신규 | **PDF 채택** |
| `danger` | `#7A3322` | `rust` 근접 | `#8b3a1f` | 거의 일치 | **V1 `rust` 재사용**, 단 사용처 다름 (V1 = title primary, PDF = 미사용) |

### ★ accent 톤 결정 — 가장 큰 의사결정

**V1 의 accent 는 brick-red 계열** (`#8b3a1f` rust + `rgba(90,26,26,...)` glow) — Darkest Dungeon 의 *공포/위협* 톤. 시작 버튼 / title-logo glow 에 박힘.

**PDF 가 제안한 accent 는 amber 계열** (`#C08A3A` + `#E6B562`) — *횃불/잔불 따뜻함* 톤. 명도 곡선 P6=0.85 의 radial burst, P1/P7 의 ember, P2 의 횃불 등 narrative motif 의 핵심.

**결정 — 두 톤 공존**:
- **메뉴/타이틀 UI** = brick-red 유지 (`#8b3a1f`, `rgba(90,26,26,...)`) — 시작 버튼·로고 glow. *플레이어가 던전에 들어가는 위협 강조* 의도 유지.
- **오프닝 8 페이지 + 던전 내부** = **amber 도입** (`#C08A3A` 본 + `#E6B562` 하이라이트) — 횃불·귀환 빛·잔불의 narrative motif 와 정합.
- 즉 PDF 의 `--col-accent` = amber 는 **오프닝/in-game 전용 신규 토큰** 으로 추가, V1 의 brick-red 는 UI 영역 유지.

이게 narrative weight 와 시각 일관성 둘 다 살리는 길.

---

## 2. 파일명 정정

PDF P10 의 본문에 `canvas-art.jsx` 표기 → **오타**. RLD 는 vanilla JS, React 아님.

| PDF 표기 | 실제 파일명 |
|---|---|
| `canvas-art.jsx` | `web/js/game/title-art.js` (타이틀) / `web/js/game/opening-art.js` (오프닝 일러스트) |

---

## 3. BGM 정합 — PDF 와 시스템 불일치

PDF P9 의 TIMING: "검정 → 길드 cross-fade 1100ms · **BGM 첫 등장** · 입력 즉시 회복"

**실제 시스템** (`web/js/game/music.js:443-453`):
```javascript
static trackForChapter(chapter) {
    if (chapter <= 3) return 'T1';   // Ch.1~3 = T1
    if (chapter <= 5) return 'T2';   // Ch.4~5 = T2
    return 'T3';                      // Ch.6+ = T3
}
static trackForDaily() { return 'T4'; }
```

`main.js:1963` 의 조건: `chapter > 0` 일 때만 트랙 반환.

**불일치**: 오프닝 직후 P8 (길드 홀 첫 진입) 시점은 chapter = 0. 첫 던전 답파 = chapter 1 진입은 *길드 홀에서 의뢰 수락 + 던전 진입 버튼* 이후. 즉 **BGM 은 P8 (길드 홀) 이 아니라 그 다음 단계 (chapter 1 던전 진입) 부터** 깔림.

**정정 권장**:
- P8 의 TIMING 항목에서 "BGM 첫 등장" 삭제.
- 대안: P8 에서 환경음 (벽난로 크래클 / 멀리 보일러 / 사람 발자국 등) 만 깔고, BGM 은 chapter 1 던전 진입 시점에 T1 fade-in. 환경음 ↔ BGM 의 전환이 *본편 시작* 의 청각 신호 역할.

---

## 4. 나머지 평가 — 채택 / 보강 / 폐기 분류

### 채택 (그대로 코드 구현 입력)
- P2~P8 의 BEAT / COMPOSITION / TIMING 거의 전부
- 명도 곡선 (P11) — P1/P7=0.05 / P5=0.22 / P6=0.85 / P8=0.60
- 전환 타이밍 표 (P12) — 9 개 transition 의 ms / easing
- 메시지 톤 4 종 (P13) — narrative / dialogue / system / milestone 분류
- Q1 답변 — "걸음 수 대신 벽 1회 충돌 OR 4걸음 중 먼저" (트리거 robust)
- Q2 답변 — input 30 : cinematic 70 시간 균형, 텍스트 hint 1회, 대사 P5 한 곳
- ESC 스킵 — 1회차에서도 P5 대사 후 enable, 스킵 시 P8 로 직행
- opening-art.js 재사용 매핑 (renderManInDungeon → P5 letterbox 컷인 / renderManLeaving → P6 잔상)

### 보강 검토
- P3 의 "1 / 2" 진행 표기 — 라이트 게임 톤에 명시 표기 vs 자연스러운 흐름. 실제 구현 시 A/B 시연 후 결정.
- P5 의 letterbox 22px + 타이핑 32ms/char + 화자 캡션 — 미니멀 결정과 cinematic 연출 충돌 가능. 구현 시 한 번 더 판단.
- P10 의 palette A 토큰 — 위 1번 swap 표 적용

### 폐기
- 없음 (PDF 전체가 매우 일관된 완성도)

---

## 5. Claude Design 에 되돌릴 메시지 (복붙용)

```
PDF 받아서 14 페이지 모두 검토했습니다. 1차안인데 매우 완성도 높아요.
세 가지 정정/확인 부탁드립니다:

1. Palette A — PDF 의 hex 는 추정값이라고 명시되어 있는데,
   실제 RLD 코드 (web/js/game/title-art.js + web/css/style.css)
   에 이미 V1 palette A 가 박혀있습니다. 다음 swap 적용:
   - --col-bg = #0a0907 (V1 의 bgTop)
   - bgDeep = #15120e (V1 의 bgMid)
   - --col-text = #e8dcc4 (V1 의 bone, 대비 ↑)
   - stone = #2a2520 (V1 의 stoneMid)
   - danger = #8b3a1f (V1 의 rust 와 통합)
   - accentHi = #E6B562 (PDF 신규값 그대로)
   - stoneLight = #382C20 (PDF brown 정합 ↑)
   - textDim = #8A7A59 (PDF 따뜻함 채택)
   - goal = #D4C07A (PDF 신규값 그대로)

2. Accent 톤 — V1 의 brick-red (#8b3a1f rust) 와
   PDF 의 amber (#C08A3A) 는 톤이 완전히 다릅니다.
   결정: 두 톤 공존.
   - 메뉴/타이틀 UI = brick-red 유지 (시작 버튼 위협 톤)
   - 오프닝 8 페이지 + 던전 내부 = amber 도입 (횃불·귀환·잔불)
   amber 의 in-game 사용처를 8 페이지에 다시 표기 부탁드립니다.

3. 파일명 — P10 의 "canvas-art.jsx" 는 오타입니다.
   실제는 web/js/game/title-art.js / opening-art.js (vanilla JS).

4. BGM 시점 — P8 의 "BGM 첫 등장" 은 실제 시스템과 불일치합니다.
   RLD 의 BGM 은 chapter 1 진입부터 깔립니다 (길드 홀 = chapter 0
   에서는 BGM 없음). P8 은 환경음 (벽난로 크래클 등) 만 두고,
   BGM 첫 등장은 chapter 1 첫 던전 진입 시점으로 옮겨 주세요.

이 4 가지 정정 후 → Narrative 보강 단계 (인계 8.② 결과물)
로 진행 부탁드립니다. PDF 의 대사 4 줄 (`...발 밑이 차다.` /
`너는 먼저 지상으로 돌아가라.` / `시간이 흘렀다 / 그리고
아빠는 돌아오지 않았다.`) 이 이미 미니멀 톤으로 박힌 상태인데,
한 번 더 다듬을 영역이 있는지 + P2 시작 시점의 자연스러운
대사 + 화자 캡션 영문 표기 ("Father" 가 적절한가) 의견 부탁
드립니다.
```

---

## 6. 후속 단계

1. **현재 단계** — 본 문서 작성 완료 (✓)
2. **다음** — 위 5 번 메시지를 사용자 (bm) 가 Claude Design 에 전달
3. **그 다음** — Claude Design 의 정정 결과 받음 → Narrative 보강 결과 추가
4. **그 다음** — UI/UX 디테일 + Interaction 흐름 검토 받음
5. **최종** — 전체 결과를 코드 구현 입력으로 정리, opening.js 재작성 + 신설 (`npc-follower.js` / 튜토리얼 던전 / 자동 트리거 시스템)
