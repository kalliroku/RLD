# Opening V2 — as-built 인계 + 아빠 스탠딩 아트 요청 (Claude Design)

**작성일**: 2026-06-02
**대상**: Claude Design
**작성자**: bm (RLD 솔로 디자이너 / 개발자)
**선행 문서**: `2026-05-28-opening-v2-to-claude-design.md` (구현 *전* 계획서 — 이건 그 *후* as-built)
**목적**: ① Opening V2 가 실제로 어떻게 빌드됐는지(계획 대비 차분 포함) 공유해 다음 작업을 이어받게 함. ② 즉시 요청 = **아빠 스탠딩 아트** 3갈래 bake-off.

---

## 1. 한 줄 요약

> Opening V2 (튜토리얼-as-opening, 8비트) **구현·커밋 완료** (`493ae90`). 단 구현이 05-28 계획에서 여러 갈래 갈라졌고, **아빠의 "예쁜 스탠딩 아트"는 여전히 갭** — 현재 임시 소형 figure 로 서 있음. 이걸 채우는 게 이번 요청.

---

## 2. 정체성 컨텍스트 (불변)

RLD = **알고리즘이 곧 캐릭터인 시드 기반 로그라이크. RL 교육은 부산물.** (D-2026-05-12-4)

- **시각 시그니처 = 절차적으로 그려진 캔버스 그 자체.** 정교한 픽셀 아트가 아니라, 코드로 그린 캔버스가 인디 정체성. → **최종 자산은 절차적 캔버스로 박는 것이 원칙** (raster 직납은 합성 씬에서 이질감).
- 톤: Darkest Dungeon-ish (어두운 brown + 회색 + amber 횃불).
- 팔레트 출처: `web/js/game/opening-art.js` 의 `PAL` 객체 (= 팔레트 A. CSS `--col-*` 는 게임 UI 용 별개이니 혼동 주의).

---

## 3. as-planned (05-28) → as-built 차분 ★핵심★

지난 계획서를 본 상태라면, 실제 빌드는 아래처럼 갈라졌습니다:

| 영역 | 05-28 계획 | 실제 빌드 (`493ae90`) |
|---|---|---|
| 아빠 동행 | NPC 옆 1칸 자동 동행 (P2~) | **follower 전면 제거.** 아빠는 *목소리(대화창)만* 으로 가이드, **P5 작별에서 처음 시각 등장** (앞/뒤 혼선 차단 목적) |
| 입력 | 방향키 / WASD | **방향키 전용** (WASD 제거 — 오프닝·본게임·도움말 i18n 3곳 통일). 터치는 기존 D-pad, 오프닝은 모바일 전용(`@media (pointer: coarse)`) |
| 이동 | 자유 이동 | **on-rails** — 진행 방향만 전진, 역방향/엇나감은 아빠 가이드 대사로 차단 |
| P4 식량 | "식량 부족" 단순 트리거 | P5 작별 = **대화 시퀀스 + 귀환 스크롤 아이템 사용 연출** (아빠 2줄 → 아이 "…하지만." → 시스템 메시지 "아빠가 귀환 스크롤을 펼쳤다." + 삐용 사운드). RLD 귀환 메커닉을 플레이로 노출 |
| P7 가운데 씬 | 검은 화면 + 텍스트 | 동일 기조, 단 잔불(ember) flicker 를 화면 *위쪽 어둠 속* 으로 (하단 중앙은 오타처럼 보여서 이동) |
| 시야 | 미지정 | 실게임 visibility(5) 정렬 — fog 완화 + 플레이어 횃불 광원 |
| 벽 | 미지정 | 타일맵 스타일 — 안쪽 검은 단색 + 경계만 픽셀 rim |

---

## 4. as-built 8비트 시퀀스 (P1~P8)

| 비트 | 내용 | 학습/narrative |
|---|---|---|
| P1 | 검은 화면 → 동굴 입구 (자동 페이드) | 진입의 무게 |
| P2 | 첫 던전, 방향키로 몇 걸음 (단일 캐릭터, follower 없음) | 이동 학습. 내레이션: "아빠를 따라 재미 삼아 들어온 던전은, 생각했던 것과 달랐다…" |
| P3 | 출구 G 도달 → 클리어 → 페이드 | 목표 = G |
| P4 | 두 번째 던전 진입, 전진 (아빠는 목소리로만 가이드) | 자원/진행 |
| P5 | **아빠 작별** — dimmed 던전 + 아빠 스탠딩 스포트라이트 + 대화 시퀀스 | narrative 정점 · **여기가 아트 갭** |
| P6 | 귀환 스크롤 발동 — 아이만 빛기둥으로 소멸, 아빠는 남음 | 귀환 메커닉 |
| P7 | 검은 화면 + 시간 경과 텍스트 + 위쪽 잔불 flicker | 사망/상실의 무게 |
| P8 | 길드홀 첫 진입 (`rld_opening_seen` 저장) | 본편 시작 |

대사 문구는 사용자 화법 verbatim 금지 — 출구/빛 테마로 리워딩 (기존 합의).

---

## 5. 라이브로 보는 법 (repro)

```
dev server: web/ 를 docroot 로 python http.server :8765 (현재 청취 중)
→ localhost:8765/play.html?opening   (?opening 이 rld_opening_seen 리셋)
→ New Game → 오프닝 P1~P8 재생
```
스킵: 어디서든 ESC. 코드는 RunState/simulator/PPO 와 완전 분리된 자기완결 씬 (sim 회귀 영향 0).

---

## 6. ★즉시 요청 — 아빠 스탠딩 아트 (3갈래 bake-off)

### 현재 상태 (임시)

P5/P6 의 아빠는 **임시 소형 figure + 스포트라이트** 로 서 있습니다:
- `opening.js` `_drawFarewell` (P5) / `_drawReturnBurst` (P6) 가 `drawCharacter(ctx, x, y, 'father', TILE*2.4)` 호출 — 타일용 미니 캐릭터를 키운 것뿐, "예쁜 스탠딩"이 아님.
- **이미 슬롯이 있음**: `opening-art.js:241` 의 `export function drawFatherPortrait(ctx, cx, baseY, scale = 5)` — V1 포팅 포트레이트가 채워진 채 **미사용**. 결과물은 이 함수 본문을 교체 → P5/P6 의 `drawCharacter(...,'father')` 를 `drawFatherPortrait(...)` 로 스왑하면 드롭인.

### 시그니처 / 제약 (절차적 변형용)

```js
// (cx, baseY) = 발 밑 기준점, scale 로 확대. 광원/페이드는 호출부가 처리.
export function drawFatherPortrait(ctx, cx, baseY, scale = 5) { ... }
```
- **팔레트는 `opening-art.js` PAL 토큰만** 사용 (raster 색 새로 들이지 말 것):
  `fatherBrown #3a2a1c`, `fatherCloak #241810`, `accent #c08a3a`, `accentHi #e6b562`, `rust #8b3a1f`, `stoneHi #4c3c2c`, `text #e8dcc4`, `playerSkin #a07a55`.
- **모티프**: 눈가리개(dark band) = 기억/부재의 상징. 망토/케이프(rust~brown). 옅은 영웅 glow.
- 정서: 신뢰 + 약속 + 비극의 전조. P5 는 작별, P6 는 "남겨진" 정지.
- 합성 주의: 절차적 던전 + 횃불(`drawTorch`) + 스포트라이트 위에 얹힘 → raster 면 광원/스케일이 안 맞음 (절차적이 합성에 유리한 이유).

### 확정된 방향 — 절차적 구현 + 레퍼런스 (bake-off 종료)

방향은 **절차적 `drawFatherPortrait`** 로 확정 (raster 직납은 합성 씬 이질감 + 절차적 캔버스 시그니처 보존 이유로 기각). bm 이 외부 생성(나노 바나나)으로 **컨셉 레퍼런스 1장을 확정**했고, 이걸 절차적 캔버스로 옮기는 것이 요청 내용.

**★ 레퍼런스 (확정)**: `docs/PM/handoffs/assets/2026-06-02-opening-v2-father-ref-hero.png`
(동일 사본: `/Users/bm/Downloads/test/father-ref-hero.png`)

> 정면 전신, rust/crimson 망토 + 브래스 클래스프, 다크 가죽 갑옷 + 황동 벨트 버클, 다듬은 수염, 또렷한 눈(눈가리개 X), 발 밑 amber 스포트라이트. "전장의 노장 아빠 / 길드 창립자" 로 읽히는 톤. **이 실루엣·팔레트·격을 절차적으로 재현**해 달라.

**요청**: 이 레퍼런스를 기준으로 `drawFatherPortrait(ctx, cx, baseY, scale)` 본문을 구현 (기존 미사용 슬롯 교체) → P5/P6 의 `drawCharacter(...,'father')` 를 `drawFatherPortrait(...)` 로 스왑하면 드롭인. raster 이미지 자체는 게임에 넣지 않음 (레퍼런스 전용).

### ★ do / don't (나노 바나나 탐색에서 학습 — 절차적 작업에도 동일 적용)

레퍼런스를 뽑으며 "거지 ↔ 왕" 양극단을 다 밟아봤다. 그 사이의 "전장의 노장 아빠" 가 정답이고, 가르는 신호는 아래와 같음:

| ✅ DO (격) | ❌ DON'T (거지 / 왕으로 튐) |
|---|---|
| **온전한 망토 hem** (반듯한 가장자리) | 너덜·해진 hem (`tattered/frayed/ragged`) → 즉시 거지 |
| 정면 + 당당한 자세 | 뒤돌아선/구부정 → 패배자 |
| **절제된 브래스 포인트** (클래스프 1 + 벨트 버클) | 금박 filigree·full plate·은빛 광택 → 왕/성기사로 튐, RLD 톤 깨짐 |
| RLD 어두운 던전 팔레트 유지 (rust/brown/amber) | 밝고 화려한 고채도 → 다른 게임에서 온 듯 |
| 또렷한 눈 | 눈가리개(`dark band over eyes`) → 부상/맹인. 눈가리개 "기억 모티프" 는 **후반 모더 디자인으로 보류** |

> 핵심 원칙: **RLD 에서 "격"은 금빛·광택이 아니라 태도 + 온전한 장비에서 나온다.** 밝기를 들이면 톤이 깨진다.

함께 의견 부탁:
- 이 톤을 절차적 `drawFatherPortrait` 의 도트 해상도(scale 5~16)로 어디까지 살릴 수 있는지 — 갑옷 디테일을 어느 선까지 단순화할지.
- `system-notes.jsx` 에 남겼던 "renderManInDungeon → P5 letterbox 컷인 재활용" 제안이 as-built (follower 제거 / P5 첫 등장) 와도 유효한지.

---

## 7. 변경 파일 / 참조

**`493ae90` (7 files)** — `opening.js`(상태머신), `opening-art.js`(절차적 툴킷 + `drawFatherPortrait` 미사용 슬롯), `main.js`(방향키 전용), `play.html`, `style.css`, `dict-ko/en.js`(`opening.v2.*`).

- 이전 계획서: `2026-05-28-opening-v2-to-claude-design.md`
- PDF 피드백/팔레트: `2026-05-28-opening-v2-pdf-feedback.md`
- Claude Design 1차 목업 소스: `/Users/bm/Downloads/test/` (canvas-art.jsx / design-canvas.jsx / system-notes.jsx / 8비트 목업 HTML)
- 세계관 원본: `docs/PM/STORY.md`
- 관련 결정: D-2026-05-12-4(정체성) / D-2026-05-15-15(영문 톤) / D-2026-05-19-1(narrative 분산 흡수)

---

## 부록 — 레퍼런스 확정에 쓴 프롬프트 기록 (참고)

확정 레퍼런스(`...father-ref-hero.png`)를 뽑은 text-to-image 프롬프트:

```
Pixel-art standing portrait of a legendary veteran hero — a strong father in his prime, broad-shouldered, confident and capable. Weathered but vigorous face, short beard, sharp determined eyes clearly visible (NOT covered, no blindfold). A worn rust-brown hero's cape over dark leather armor, brass belt buckle. Standing tall and proud in a dim stone dungeon; faint warm amber torch glow from one side; soft spotlight pool at his feet. Retro 8-bit dithered pixel-art style, Darkest-Dungeon palette — dark browns #3a2a1c / #241810, amber #c08a3a / #e6b562, rust #8b3a1f, bone highlight #e8dcc4. Grim but noble and reassuring atmosphere. Pure black background, character isolated, no text, no UI.
```

이 프롬프트도 위 do/don't 의 산물 — `Darkest-Dungeon + tattered` 를 빼고 `legendary/proud/clean` 으로 균형 잡은 버전. 금박을 더 넣으면(`gold trim/knight-captain`) "왕" 으로 튀었음. 레퍼런스 이미지가 SSOT 이고 이 프롬프트는 그 출처 기록일 뿐.
