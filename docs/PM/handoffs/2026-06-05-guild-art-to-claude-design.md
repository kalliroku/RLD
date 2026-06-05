# 길드 아트 인계 — NPC 흉상 격상 요청 (Claude Design)

> 작성: Claude Code (통합 담당) · 2026-06-05
> 채널: 비동기 — `design/` 에 절차적 함수 + 미리보기 HTML 산출, Claude Code 가 `web/` 로 이식.

## 1. 한 줄 요약

길드 온보딩에 등장하는 **레플리 / 리카 흉상**이 현재 PLACEHOLDER 절차 도트입니다. father-portrait 와 동일한 방식(절차적 `draw*Portrait` + bm 확정 레퍼런스)으로 **격상**을 요청합니다.

## 2. 정체성 컨텍스트 (불변)

> 알고리즘이 곧 캐릭터인 시드 기반 로그라이크. 세르파 길드는 한때 모험가 길드 그늘에서 명맥만 유지하던 곳 (주인공 아빠가 창립). 어둡고 절제된 던전 팔레트.

- **★ RLD 에서 "격"은 금빛·광택이 아니라 태도 + 온전한 장비에서 나온다** (father bake-off 학습). 밝고 화려한 고채도는 톤을 깬다.
- 학술/알고리즘 용어·가차 흔적 노출 금지 (아트엔 무관하나 톤 일관성).

## 3. ★ 스코프 경계 (무엇을 넘기고/안 넘기는가)

| 표면 | 성격 | 담당 |
|---|---|---|
| **레플리 흉상** `drawRepliPortrait` | 절차 캔버스 | **Claude Design (이번 요청)** |
| **리카 흉상** `drawRikaPortrait` | 절차 캔버스 | **Claude Design (이번 요청)** |
| 길드 홀 씬 `drawGuildHall` (게시판/데스크/벽) | 절차 캔버스 | Claude Design (선택 — §6, 우선순위 낮음) |
| 의뢰 보드 / 대기실 / 파밍 통제판 패널 | **DOM/CSS** | **Claude Code (위임 아님)** — 별도 CSS 폴리싱 트랙 |

> DOM/CSS UI 패널은 Claude Design 의 절차-함수 산출 모델에 안 맞으므로 넘기지 않습니다. 이번 요청은 **캔버스 흉상**에 한정.

## 4. as-built 현황 (PLACEHOLDER)

두 흉상 모두 `drawFatherPortrait`(opening-art.js:243)와 같은 idiom — `R(x,y,w,h,c)=fillRect`, `(cx, baseY)` 발밑 기준 + `scale`. 광원/페이드/딤은 호출부(`_drawGuildScene`)가 처리.

- **레플리** `opening-art.js:434` `drawRepliPortrait(ctx, cx, baseY, scale=6)`
  - 시나리오: 길드 안내·일상역. **하늘색 리셉션 재킷**(`#6aa9da`) + 흰 칼라 + 골드 단추, 금발 장발, 하늘색 눈. 차분·따뜻.
- **리카** `opening-art.js:492` `drawRikaPortrait(ctx, cx, baseY, scale=6)`
  - 시나리오: 모험가 길드 의뢰 전령. 갈색 모자(`#6b4e2e`) + 분홍 단발, 흰 티 + 청 멜빵, 10대 중반 작은 키. 활기·발랄.
- 팔레트는 각 함수 상단 토큰 + `opening-art.js` PAL 만 사용 (raster 색 새로 들이지 말 것).

## 5. 라이브로 보는 법 (repro)

- **격리 미리보기**(가장 빠름): `web/_npc-preview.html` 열기 — `drawRepliPortrait`/`drawRikaPortrait` 를 240×280 스포트라이트 위에 나란히 렌더. 수정→새로고침 루프.
- **인게임 맥락**: 로컬 서버로 `web/play.html` → 길드 진입 → 온보딩 대사 진행(흉상이 무대 전면/그림자로 등장). `_drawGuildScene`(main.js:653)이 `drawRepliBackground` + 흉상을 배치.

## 6. ★ 요청

1. **레플리 / 리카 흉상을 placeholder → 폴리싱 격상** — father-portrait 처럼, bm 이 확정할 컨셉 레퍼런스를 기준으로 `drawRepliPortrait` / `drawRikaPortrait` **본문을 교체**(시그니처·기준점·scale 유지 → 드롭인). raster 이미지는 게임에 넣지 않음(레퍼런스 전용).
2. (선택·후순위) **길드 홀 씬** `drawGuildHall`(opening-art.js:677) — 게시판(코르크/양피지)·데스크·벽 가구의 아트 격. 흉상이 먼저, 씬은 여유 될 때.

## 7. do / don't (캐릭터 방향 + RLD 톤)

| ✅ DO | ❌ DON'T |
|---|---|
| 레플리 = 따뜻·단정·신뢰(안내역). 하늘색 재킷 유지 | 과한 장식·고채도로 튀게 |
| 리카 = 발랄·앳됨(전령). 모자+분홍머리 실루엣 유지 | 성인스럽게/무겁게 |
| RLD 어두운 던전 팔레트와 어우러지는 채도 | 다른 게임에서 온 듯한 밝은 톤 |
| 절차 도트 해상도(scale 6~)에서 읽히는 단순화 | 해상도 대비 과한 디테일 |
| 두 흉상의 idiom·기준점·광원 호환(같은 무대에 나란히 섬) | drawFatherPortrait/Child 와 이질적인 별도 스타일 |

## 8. 열린 것 (bm 입력 대기)

- **레퍼런스**: father 처럼 bm 이 레플리/리카 컨셉 레퍼런스를 확정해 주면 그걸 절차 캔버스로 옮김. (없으면 위 시나리오 외형 기준으로 1차 제안 → bm 피드백 루프.)
- 두 흉상 격을 어느 선까지 끌어올릴지 (아빠 포트레이트 완성도와 균형).

## 9. 변경 파일 / 참조

- 대상 함수: `web/js/game/opening-art.js` `drawRepliPortrait`(434) / `drawRikaPortrait`(492) / `drawGuildHall`(677, 선택)
- 미리보기: `web/_npc-preview.html`
- 선례 브리프: `docs/PM/handoffs/2026-06-02-opening-v2-asbuilt-to-claude-design.md` §6 (father-portrait — 같은 절차+레퍼런스 방식)
- 협업 규칙: `design/README.md` (소유권·산출물 규칙)
- 이식 담당: Claude Code 가 `design/` 산출 함수를 `opening-art.js` 슬롯에 교체 + 검수.
