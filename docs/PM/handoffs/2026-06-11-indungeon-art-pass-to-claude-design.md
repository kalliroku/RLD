# 인던전 타일/스프라이트 아트 패스 인계 (Claude Design)

> ⚠️ **SUPERSEDED (2026-06-13)** → `docs/PM/handoffs/2026-06-13-indungeon-stage-visual-to-claude-design.md` 로 대체. 범위가 "오브젝트+질감 패스"에서 "스테이지 비주얼 전체(바닥·벽·오브젝트·조명)"로 확대됨. 이 문서는 이력 보존용 — 작업은 신규 브리프 기준.

> 작성: Claude Code (통합 담당) · 2026-06-11
> 채널: 비동기 — `design/` 에 절차 드로잉 함수 + 미리보기 HTML 산출, Claude Code 가 `web/js/game/tile-atlas.js` / `tilemap-renderer.js` 로 이식.

## 1. 한 줄 요약

bm 결정(2026-06-11): **인던전 실플레이 화면은 오프닝 시네마틱과 같은 비주얼 언어**여야 한다 — "오프닝과 같은 형태로 첫 스테이지가 만들어져야". Claude Code 가 1차 통일을 마쳤고(워밍 팔레트·픽셀 플레이어·금색 G·횃불 비네트), 이제 **타일·스프라이트의 아트 밀도를 올리는 패스**를 요청합니다.

## 2. 정체성 컨텍스트 (불변)

> 알고리즘이 곧 캐릭터인 시드 기반 로그라이크. 어둡고 절제된 던전 팔레트. "격"은 금빛·고채도가 아니라 태도 + 온전한 장비에서 나온다.

- 팔레트 SSOT = `web/js/game/opening-art.js` 의 `PAL` (stone/stoneLight/stoneHi/accent/accentHi/goal …). **raster 색 신규 도입 X.**
- 모든 드로잉은 절차적(외부 이미지 에셋 0). `Math.random()` 금지 — 시드 RNG(`mulberry32`) 또는 좌표 해시(`coordHash`)만.

## 3. 현재 상태 (1차 통일 후)

- `tile-atlas.js` — 타일 스프라이트 캐시: 바닥 4종(석재+크랙), 벽 16종(autotile bevel), 오브젝트(START 링 / GOAL 픽셀 G / TRAP 삼각 / HEAL 하트 / PIT 공허 / GOLD 코인 / MONSTER 실루엣), 포그 5단계. 전부 오프닝 워밍 팔레트로 1차 교체됨.
- `tilemap-renderer.js` — 플레이어 = 오프닝 `drawCharacter('player')` 8px 그리드 스프라이트(파란 튜닉) + 발그림자 + HP바. `_renderTorchVignette()` = 횃불 광 + 가장자리 어둠.
- 한계(= 이번 요청 범위): 오브젝트들이 아직 "기호" 수준(삼각형/하트/코인 도형). 오프닝의 픽셀 밀도(flecks 질감, 8px 그리드 문법)와 비교하면 캔버스 프리미티브 티가 남.

## 4. ★ 요청 (우선순위 순)

1. **타일 오브젝트 도트화** — TRAP/HEAL/GOLD/MONSTER/PIT 를 오프닝 8px 그리드 문법의 픽셀 스프라이트로 (예: TRAP=바닥 가시/덫, HEAL=약초 다발, GOLD=동전 무더기, MONSTER=웅크린 던전 생물, PIT=무너진 바닥). 각 `ts`(64px 기준, 가변) 캔버스에 그리는 함수 형태.
2. **바닥/벽 질감 패스** — 현 drawStoneNoise(4px 격자) 대신 오프닝 `flecks`(2px, 시드) 문법으로 톤 통일. 벽 autotile 16종의 bevel 유지.
3. (여유 시) **플레이어 스프라이트 방향 변형** — 좌/우/상/하 4방향 (현재 정면 1종). 시그니처는 `drawCharacter` 확장 또는 별도 함수.

## 5. 기술 계약 (드롭인 조건)

- 함수형: `(ctx, ts)` 또는 기존 빌더 시그니처(`_buildTrap(ts)` 류) 호환 — 오프스크린 캔버스에 1회 베이크되므로 **프레임당 비용 무관**, 베이크 비용만 합리적이면 됨.
- 입력 ts 는 가변(현 64). **ts/8 픽셀 그리드** 기준으로 작성하면 오프닝과 동일 밀도.
- 미리보기: `design/` 에 타일 시트 미리보기 HTML (모든 변형 한 화면).

## 6. do / don't

| ✅ DO | ❌ DON'T |
|---|---|
| 오프닝 PAL 토큰만 사용 | 신규 고채도/네온 색 |
| 8px 그리드 픽셀 문법 (ts/8) | 안티앨리어싱 곡선/그라디언트 남용 |
| 시드 RNG·좌표 해시 (결정론) | Math.random / Date.now |
| 기호가 아니라 "사물" (가시덫, 약초, 동전무더기) | 이모지/글자 마커로 회귀 |
| 어둠 속 횃불 광에서 읽히는 명도 대비 | 풀브라이트 전제의 디테일 |

## 7. 참조

- 1차 통일 커밋 (예정): style.css `#screen-play` 워밍 / tile-atlas 팔레트 / tilemap-renderer 스프라이트·비네트.
- 스크린샷 스테이징: `~/Downloads/rld-design-sync/` (인던전 현 상태 + 오프닝 레퍼런스 프레임).
- 오프닝 문법 원본: `web/js/game/opening-art.js` — `PAL`, `flecks`, `drawDungeon`, `drawCharacter`, `drawFog`.
