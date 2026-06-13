# 인던전 스테이지 비주얼 전체 인계 (Claude Design)

> 작성: Claude Code (통합 담당) · 2026-06-13
> 채널: 비동기 — Claude Design 이 `design/dungeon-stage/` 에 절차 드로잉 모듈 + 미리보기 HTML 산출, Claude Code 가 `web/js/game/` 로 이식·검수·커밋.
> **supersede:** `docs/PM/handoffs/2026-06-11-indungeon-art-pass-to-claude-design.md` (오브젝트+질감 한정 패스). 이번 브리프는 **스테이지 비주얼 전체**로 범위 확대.

## 0. 이번 인계가 달라진 점 (bm 결정 2026-06-13)

기존 계획은 "Claude Code 가 바닥/조명/프레이밍을 먼저 1차 정리 → 갱신 스크린샷 → Claude Design 에 오브젝트 도트만 요청" 이었음. **bm 결정: 그 중간 단계를 빼고, 인던전 스테이지의 비주얼 언어 전체(바닥·벽·오브젝트·조명)를 Claude Design 이 오프닝 idiom 기준으로 한 번에 일관되게 설계**한다. Claude Code 가 바닥을 근사 정리하고 오브젝트만 넘기는 것보다 통일감이 높기 때문.

> ⚠️ 안전한 이유 (재작업 방지): 산출물이 **`ts` 가변 + `ts/8` 픽셀 그리드**로 해상도 독립이므로(§5), Claude Code 의 프레이밍/스케일 작업과 **무관하게** 드롭인됨. 즉 "프레임 먼저 정리" 가 더는 선행조건이 아님. Claude Design 은 **현재 화면이 아니라 오프닝 레퍼런스**(opening-art.js + opening-reference-frame.png)를 목표로 설계할 것.

## 1. 한 줄 요약

bm 정체성 결정(2026-06-10/11): **인던전 실플레이 화면은 오프닝 시네마틱과 같은 비주얼 언어**여야 한다 — "오프닝과 같은 형태로 첫 스테이지가 만들어져야". 현재는 베이스라인(워밍 PAL·픽셀 플레이어·금색 G·횃불 비네트)만 통일돼 있고, **바닥/벽 질감·오브젝트·조명이 아직 다른 문법(캔버스 프리미티브·폰트 글리프·평면 fog)**으로 남아 "전혀 다른 디자인" 으로 읽힘. 이 갭을 오프닝 문법으로 메우는 **스테이지 비주얼 컴포넌트 라이브러리**를 요청.

## 2. 정체성 컨텍스트 (불변)

> 알고리즘이 곧 캐릭터인 시드 기반 로그라이크. 어둡고 절제된 던전 팔레트. "격"은 금빛·고채도가 아니라 태도 + 온전한 장비에서 나온다. RL 교육은 부산물.

- 팔레트 SSOT = `web/js/game/opening-art.js` 의 `PAL`(L21). stone/stoneLight/stoneHi/accent/accentHi/goal/rust/playerBlue… **신규 raster 색 도입 X.**
- 모든 드로잉은 절차적(외부 이미지 에셋 0). **결정론 필수** — `Math.random()`/`Date.now()` 금지, 시드 RNG(`mulberry32`, L44) 또는 좌표 해시(`coordHash`)만.
- 어둠 속 횃불 광 전제 — 풀브라이트 아님. 명도 대비로 읽혀야 함.

## 3. 현재 상태와 갭

### 베이스라인(이미 통일됨)
- `tile-atlas.js` 가 `PAL` 을 import, 워밍 색 사용. 플레이어 = 오프닝 `drawCharacter('player')` 8px 스프라이트. GOAL = 오프닝 픽셀 G + 후광. `tilemap-renderer._renderTorchVignette()` 존재.

### 남은 갭 (= 이번 요청 범위) — 두 문법이 갈라진 지점
| 요소 | 오프닝 문법 (목표) | 현재 인게임 | 핵심 문제 |
|---|---|---|---|
| 텍스처 | `flecks()`(L55) 2px 시드 플렉, 회화적 | `drawStoneNoise()` 4px 해시 노이즈 | 결이 달라 같은 재질로 안 읽힘 |
| 바닥 | `drawDungeon`(L76) 연속 플렉 면, 그라우트는 위에 한 번 | 타일마다 `_buildFloors` 의 **`strokeRect` 외곽선** + 균열 stroke | ★ 타일별 외곽선 = "작은 박스 그리드" 주범. 타일이 seamless 하게 이어져야 함 |
| 벽 | 어두운 플렉 밴드 | 16-autotile bevel + 모르타르 (구조 OK) | 텍스처 idiom 만 오프닝 톤으로 |
| 오브젝트 | 8px 픽셀 블록(drawCharacter 문법) | **베지어 도형 + `ctx.font` 글리프("!","$","?") + 그라데이션 + 빛나는 빨간 눈** | ★ 근본: 매끈 벡터+폰트 vs 블록 픽셀. 기호가 아니라 "사물" 로 |
| 조명 | `drawFog`(L129) 라디얼 + `drawTorch`(L674) 글로우 | 타일별 평면 알파 fog 스프라이트 | 평면 → 부드러운 라디얼 |

### 비교 하니스 (필독)
- **`web/_stage-preview.html`** — A.현재 인던전(실렌더 경로) / B.오프닝 문법(목표) / C.오브젝트 클로즈업. 브라우저로 열면 A↔B 갭이 한눈에. (이 HTML 은 `web/` 영역이라 Claude Code 가 관리 — Claude Design 은 읽기 참조.)
- 스크린샷 스테이징(레포 밖): `~/Downloads/rld-design-sync/indungeon-current-2026-06-11.png`(현 상태) + `opening-reference-frame.png`(목표 톤). bm 이 하니스 A/B 캡처 추가 예정.

## 4. ★ 요청 산출물 (우선순위 순)

**`design/dungeon-stage/dungeon-art.js`** — 오프닝과 같은 문법의 인게임 비주얼 컴포넌트 모듈. `opening-art.js` 의 프리미티브(`PAL`/`flecks`/`mulberry32`/`drawCharacter`)를 import 해서 그린다.

1. **바닥 (`drawFloorTile` 또는 변형 N종)** — ★최우선. 오프닝 `flecks` 문법으로, **타일 경계가 seamless** 해야 함(현 `strokeRect` 외곽선 = 박스감 주범 → 제거). 좌표 변동은 `coordHash(x,y)` 로(타일별 미세 변형, 이음새 없음). 가끔 밝은 석재 타일 정도의 변주.
2. **벽 (`drawWallTile(mask)` 16종)** — autotile 4-bit 마스크(N=1/E=2/S=4/W=8, 이웃이 벽이면 set) 유지. 오프닝 어두운 암반 톤 + 빛 받는 윗면 bevel. 모르타르는 과하지 않게.
3. **오브젝트 (투명 배경, `ts` 캔버스)** — TRAP/HEAL/GOLD/MONSTER/PIT/START 를 오프닝 8px 그리드 픽셀 스프라이트로. 기호가 아니라 사물: TRAP=바닥 가시덫, HEAL=약초 다발, GOLD=동전 무더기, MONSTER=웅크린 던전 생물, PIT=무너진 바닥. (GOAL 은 이미 오프닝 픽셀 G — 유지, 톤만 맞춰도 됨.)
4. **조명 (`drawTorchGlow`, `drawFogRadial`)** — 평면 타일 fog 대신 오프닝 `drawFog` 같은 라디얼 어둠 + 횃불 광 풀링. *그리는 함수만* 제공(파이프라인 배선·카메라 좌표는 Claude Code, §7).
5. **미리보기 `design/dungeon-stage/Stage Preview.html`** — 위 컴포넌트로 **조립한 작은 스테이지 한 장**(벽 테두리 + 바닥 + 오브젝트 전종 + 플레이어 + 조명)을 렌더. 타일 시트가 아니라 "한 화면" 으로 — 오프닝 옆에 두고 같은 언어인지 검증. raster 임베드 없음.

## 5. 기술 계약 (드롭인 조건) ★

- **시그니처**: 함수형. 바닥/오브젝트는 `(ctx, ts)` 또는 `(ctx, x, y, ts)`(좌표 변형용), 벽은 `(ctx, mask, ts)`. 오프스크린 캔버스에 1회 베이크되므로 **프레임당 비용 무관**, 베이크 비용만 합리적이면 됨.
- **`ts` 가변 + `ts/8` 픽셀 그리드** — 현 baseline ts=64(화면상 ~5타일 폭이라 타일이 큼, 디테일 잘 읽힘). `ts/8` 그리드로 그리면 오프닝과 동일 밀도 + 해상도 독립(프레이밍 변경에 안전).
- **결정론** — `mulberry32`/`coordHash` 만. `Math.random()`/`Date.now()` 절대 금지. (Claude Code 가 이식 시 정적 검사로 차단.)
- **렌더↔sim 격리** — `dungeon-art.js` 는 `opening-art.js` 만 import. sim/run-state/agent 등 게임 상태 **import 금지**(순수 드로잉).
- **바닥 seamless** — 인접 타일이 붙었을 때 격자선/하드 엣지가 보이면 안 됨. 그라우트가 필요하면 매우 저대비로, 타일 *안쪽* 이 아니라 디자인된 이음새로.
- **배경 규칙** — 오브젝트 = 투명 배경(바닥 위에 얹힘). 바닥/벽 = 불투명.
- **PAL 토큰만.** 캐릭터 고유색이 필요하면 함수 상단 로컬 hex(형제 흉상 방식). 신규 네온/고채도 X.

## 6. do / don't

| ✅ DO | ❌ DON'T |
|---|---|
| 오프닝 `PAL` + `flecks` + `ts/8` 픽셀 문법 | 신규 고채도/네온색, drawStoneNoise식 4px 노이즈 |
| 시드 RNG·좌표 해시 (결정론) | `Math.random` / `Date.now` |
| 기호가 아니라 "사물"(가시덫·약초·동전무더기·생물) | 이모지/`ctx.font` 글자 마커("!","$","?") |
| 바닥 타일 seamless (이음새 없음) | 타일마다 `strokeRect` 외곽선/박스 |
| 어둠 속 횃불 광에서 읽히는 명도 대비 | 풀브라이트 전제 디테일, AA 곡선/그라디언트 남용 |
| 한 모듈 + 조립된 한 화면 프리뷰 | 게임 상태(sim/agent) import |

## 7. 소유권 경계 (충돌·재작업 방지)

| 영역 | 누가 |
|---|---|
| **비주얼 컴포넌트** — 바닥/벽/오브젝트/조명 그리는 함수, 색·형태·질감·픽셀 | **Claude Design** (`design/dungeon-stage/`) |
| **프레이밍/스케일** — `#screen-play` CSS, 카메라/`viewTiles`/타일 화면크기, 뷰포트 | Claude Code (`web/`) |
| **플러밍** — `tile-atlas.js` 캐시가 새 모듈 호출, `tilemap-renderer` 파이프라인 순서·조명 배선·카메라 좌표 | Claude Code |
| **이식·검수·커밋·결정론 정적검사** | Claude Code |

→ Claude Design 은 **"무엇을 어떻게 그리는가"(idiom)** 만. **"어디에 얼마 크기로 배치/줌"(레이아웃)** 은 Claude Code. 두 영역이 안 겹쳐 같은 `main` 에서도 충돌 0.

## 8. 참조

- **오프닝 문법 원본**: `web/js/game/opening-art.js` — `PAL`(21) · `flecks`(55) · `mulberry32`(44) · `drawDungeon`(76) · `drawFog`(129) · `drawCaveArch`(141) · `drawCharacter`(197) · `drawTorch`(674).
- **현재 인게임 구현**(교체 대상): `web/js/game/tile-atlas.js`(`_buildFloors`/`_buildWalls`/`_buildTrap`…), `tilemap-renderer.js`(`_renderTorchVignette`/`_renderFog`).
- **비교 하니스**: `web/_stage-preview.html` (A/B/C).
- **스크린샷**: `~/Downloads/rld-design-sync/` — `indungeon-current-2026-06-11.png`, `opening-reference-frame.png` (+ bm 이 하니스 A/B 캡처 추가).
- **타일 레전드**(스테이지 어휘): `web/js/game/tiles.js` — `#.SGTHP$M`.
- supersede 대상: `docs/PM/handoffs/2026-06-11-indungeon-art-pass-to-claude-design.md`.

## 9. 이식 계획 (Claude Code, 회수 후)

1. `design/dungeon-stage/dungeon-art.js` → `web/js/game/dungeon-art.js` 로 이식(결정론·격리 정적검사).
2. `tile-atlas.js` 의 `_build*` 인라인 드로잉을 `dungeon-art.js` 호출로 교체 — 아틀라스는 얇은 캐시로 남김.
3. `tilemap-renderer.js` 조명: 평면 fog → `drawFogRadial`/`drawTorchGlow` 배선(카메라 변환 안에서, 줌 정합).
4. 프레이밍/스케일(`#screen-play`, `viewTiles`) 별도 정리 — 산출물이 ts 독립이라 병행 가능.
5. 하니스로 A 패널이 B(오프닝)에 수렴하는지 검증 → 인던전 스크린샷 재캡처 → 커밋.
6. (끼워넣기) W1 재출격 auto-return `setTimeout` clearTimeout.
