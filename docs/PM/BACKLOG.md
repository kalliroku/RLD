# Backlog — RLD

3축 비판 (`critiques/`) + D-2026-05-12-4 판정 (`decisions/2026-05-12-rl-positioning/verdict.md`) 반영 상태.

## P0 — 갈래 없음, 즉시 실행

| ID | 작업 | 출처 | 공수 |
|---|---|---|---|
| B-004 | Step-0 진입 모드 — 첫 화면에 Character + Dungeon + Reset + Legend 만 노출, 나머지 첫 클리어 후 한꺼번에 펼침 | UX | 2~3일 |

## P1 — 갈래 없음, 단기 실행

(잔여 없음 — B-109 마감 → Done 으로 이동, M3 게이트 통과)

## P1 — D-4 로 Tier 2 → P1 승격 (RL 양념 본진)

(잔여 없음 — T2B-2 MVP 마감)

## P2 — 갈래 없음, 중기 실행

(잔여 없음 — B-207 + B-208 1차 마감)

## M5 → 1.0 출시 게이트 잔여

| ID | 작업 | 출처 | 공수 |
|---|---|---|---|
| B-208.1 | 스크린샷 4~6장 캡처 (학습 시각화 / 모디파이어 데일리 / 캐릭터 다양성 / 던전 다양성) | B-208 1차 인계 | 0.5일 |
| B-208.3 | github pages 활성화 (admin 권한 필요) — Actions deployment workflow + 리포 description / homepageUrl | B-208 1차 인계 | 0.2일 (사용자) |
| (신규) | i18n 미터치 영역 — briefing 영문 라벨 (~15) / editor (~30) / dungeon-select option (27) / DUNGEON_HINTS (~50) | i18n 인계 §3.4 | 3~5일 |
| (신규) | BGM 4트랙 (Ch.1~3 / 데일리 / 전투-탐험) — 음원 결정 후 통합 | VISION §3 M5 | 5~10일 |
| (신규) | 자체 플레이테스트 5회 (외부 5명) — 1.0 게이트 마지막 | VISION §8 | 분산 |
| W1 | i18n sync assertion build-time check | i18n 인계 §3.1 | 0.1일 |
| W2 | 토글 갱신 사각지대 브라우저 스모크 (5 시나리오) | i18n 인계 §3.2 | 1~2시간 |
| W3 | daily.compare 부호 표기 미세조정 | i18n 인계 §3.3 | 10분 |

> **B-205 closure 2026-05-14**: D-2026-05-14-14 (modifier 12종 데일리 전용 유지) 로 slippery 30% 강도가 캠페인 발란스에 영향 줄 경로 소멸. 향후 캠페인 modifier 도입 (M5 이후) 시 강도/적용범위/dungeonId 화이트리스트 재산정 필요는 여전히 유효 — 그 시점에 새 B-아이템으로 부활.

## ❌ 컷된 항목 (D-4)

| ID | 항목 | 사유 |
|---|---|---|
| T2A-2 | 하이퍼파라미터 슬라이더 + 리더보드 | hyperparameter sweep 노가다 — B 반박 인용. 일반 플레이어 fun loop 아님 |
| T2A-3 | "AI 가 정공법" 이코노미 수술 후 시뮬레이터 재검증 | 수술 자체가 컷이므로 목적 소멸. 대신 B-109 (모디파이어 회귀) 로 대체 |
| GDD §3.3.4 | NPC 가차 시스템 (Phase 16) | 3축 비판 합의 + D-4. 격하 아님, 삭제. 공수 회수해서 모디파이어/PCG 에 합산 |

## Done

| ID | 작업 | 완료일 | 비고 |
|---|---|---|---|
| B-001 | README / GDD / ACT1_SUMMARY 정체성 카피를 D-4 한 줄 정체성으로 통일 | 2026-05-12 | devlog 는 역사 기록이라 비대상 |
| B-002 | GDD §3.3.4 NPC 가차 섹션 + README 가차 라인 전체 삭제 | 2026-05-12 | D-5 영구 컷 |
| B-003 | 던전 마스터 모드를 Act 2 출시 후 콘텐츠로 격하 | 2026-05-12 | §11 던전 에디터 (Phase 10 구현 완료 자산) 유지하되 메인 카피에서 분리 |
| B-004 | Step-0 진입 모드 — 첫 화면 캐릭터/던전/초기화/범례만 노출, 첫 클리어 후 일괄 펼침 + 토스트 | 2026-05-12 | `updateProgressiveDisclosure()` 확장 + canvas inline 힌트 + agent-browser 통합 검증 |
| B-102 | PIT 빨간 X / fog 회색 ? 색 충돌 해결 | 2026-05-12 | renderer.js PIT 마커 #666 → #ef4444 |
| B-105 | 캐릭터 카드 라벨 → 성격 태그, 학명은 hover 툴팁 | 2026-05-12 | CHARACTERS 에 personality 필드 추가 + setupEventListeners 동적 라벨 패치 |
| B-107 | 우측 컨트롤 한국어 통일 (Provisions → 보급 등) | 2026-05-12 | 10개 섹션 헤더 + 모든 라벨/버튼 한국어. id/data-* 식별자는 보존 |
| B-108 | 수동 플레이어 스텝당 식량 1→2 (D-4 T2A-1 축소판) | 2026-05-12 | run-state.js consumeFood() + sim/simulator.js MANUAL_FOOD_PER_STEP 상수 + strategies.js. AI 측 BASE_OP_COST 보존 |
| B-108 baseline 회귀 | HybridPlayer baseline 측정 (sim/, 20-run) | 2026-05-12 | 25.6/27 ✓ (D-4 의 25.5/27 ± 2 정확 hit). full 모디파이어 회귀는 T2B-2 직후 |
| B-101 | Q-Value 디폴트 ON + 숫자 제거, 색만 유지 | 2026-05-12 | renderer.js showQValues=true + 텍스트 fillText 제거. index.html #show-qvalues checked |
| B-106 | success-rate sparkline 상시 표시 | 2026-05-12 | game-ui 안에 sparkline-canvas (240×28). sliding window 20 ep, 색 임계 70/30%. updateTrainingUI 매번 redraw |
| B-104 | Ch.7 운영비 -30% + 보상 +30% (식량 압력 상쇄) | 2026-05-12 | getOperatingCost() level≥29 분기 (main.js + game-config.js sim 일관). Ch.7 던전 firstReward/repeatReward ×1.3 |
| B-103 | Ch.5 던전 8→4 축소 (Lv.20~23 컷) | 2026-05-12 | DUNGEON_CONFIG/ORDER/HINTS/TREASURES + CHAPTER_CONFIG/ALL_DUNGEON_IDS + index.html. 31→27 던전. 회귀: 25.6/27 ✓. paper_maze (ensemble 핵심 벤치마크) 보존 |
| T2B-3 | 알고리즘=캐릭터 잔존 정리 (hire confirm + tutorial 한국어) | 2026-05-12 | hire confirm 의 학명 → 성격 태그. tutorial.js 5개 메시지 + 확인 버튼 한국어 |
| T2B-1 | 시드 기반 일일 챌린지 시스템 (1.1 rng.js / 1.2 Daily 모드 + 데일리 던전 / 1.3 어제 비교 + 7일 캐러셀) | 2026-05-12 | `web/js/game/rng.js` (mulberry32 + dailySeed + utcDateKey) + `web/js/game/daily-mode.js` (DailyHistory localStorage key `rld_daily_history`) + index.html Daily 탭 + 패널 + Play↔Daily 전환 (lastPlayDungeon 복원). 결정론 검증 통과 (시드 1656106231, 시작/목표 좌표 reproducible). Play 회귀 sim: 25.0/27 (25.5 ± 2 영역 유지) |
| B-110 | Daily Seed UI 프로토타입 — T2B-1 산출물 자체가 프로토타입 정착 | 2026-05-12 | T2B-1 흡수 (핸드오프 §2.2 T2B-1.4 명시) |
| T2B-2 | 매 런 모디파이어 시스템 3종 MVP (slippery / two_only / heavy_fog) — 데일리 전용 | 2026-05-12 | `web/js/game/modifiers.js` 신규 (ModifierSet + pickModifiers, mulberry32 seeded). agent.js `_resolveAction` 분기 + `getVisibility` linear-decay 격상. daily-mode.js `getDailyChallenge` 가 pickModifiers 호출. main.js: activeModifierSet + character pool picker + 모디파이어 띠 + heavy_fog 시 fog 강제. index.html: `#modifier-band` div + `#daily-pool-row`. style.css: 띠 + 칩 + 캐릭터 픽커. 결정론 검증 (slip rate 30.0% over 10k, two_only ["dyna","doubleq"] reproducible). visual 검증 (agent-browser screenshot heavy_fog 가시 2칸). 캠페인 회귀 sim (modifier off): 24.6 / 25.6 / 24.9 / 25.4 / 24.1 — 모두 25.5/27 ± 2 영역 hit |
| B-109 | sim 측 ModifierSet 통합 + modifier-on 회귀 (변형 A) | 2026-05-13 | `sim/simulator.js` GameSimulator 가 `{modifierIds, modifierSeed}` 옵션 수용. ModifierSet 생성 + two_only 시 캐릭터 풀 픽 + pre-hire. `estimateManualCost(grid, hp, modifierSet)` 시그니처 확장 — 추정과 실제 비용 동기화 (heavy_fog ×1.25 humanSteps, slippery ×0.85 successRate). `agent.js _resolveAction`: `grid.modifierSet` fallback 추가 (sim 우회용, 현재 미사용). `sim/run-balance.js`: `--modifier=` `--seed=` 플래그. **측정 결과 (20-run)**: off=24.5/27 ✓, slippery=24.4/27 ✓, heavy_fog=24.3/27 ✓ (모두 [23.5,27.5] 영역), two_only=13.3/27 (D-9 데일리 전용으로 정당화), 3종 합산=17.1/27 (데일리 전용 스택). **slippery 는 manual-play approximation 만 적용** — algorithm 측 gold/monster restoration 의 pre-existing 버그 (intended vs actual position) 가 deflection 시 OOB 인덱스 트리거하므로 AI 훈련 측 deflection 미적용. D-2026-05-12-12 박제 |
| D-12 closure | 알고리즘 17개 deflection 패치 + sim grid.modifierSet 활성화 | 2026-05-14 | Key 재생성 방식 (사용자 선택, 최소 변경). 17 파일 × 33 인스턴스 (변형 1 training loop 17 + 변형 2 test/eval/replay loop 16, ensemble 만 변형 1 단독). `nextPos/nextKey/originalTile → intendedPos/intendedKey/intendedTile`, agent.move() 직후 `actualKey = ${agent.x},${agent.y}` 재생성. hide 는 intended / track + restore 는 actual. agent.js 미수정. sim/simulator.js getGrid 의 D-12 사유 주석 폐기 + `grid.modifierSet` 부착 활성화. **측정 (20-run HybridPlayer)**: off=25.6/27 ✓ (+1.1 — 경계 OOB 회피로 baseline 향상), slippery=14.0/27 (-10.4 algorithm 측 deflection 자연 영향), heavy_fog=25.6/27 ✓, two_only=16.3/27, 3종 합산=15.2/27. **이중 페널티 가설 기각** (algorithm-only 14.6 vs 이중 14.0, +0.6 차이). M3→M4 게이트 유지 ✓. 후속: 캠페인 modifier 도입 (모디파이어 12종 디자인) 전 modifier.slippery 30% 강도 (D-10) 재검토. D-2026-05-14-13 박제 |
| B-204 | 모바일 핵심 스탯 3개만 노출 (HP / Gold / Steps), 나머지 접힘 | 2026-05-14 | `web/index.html` 7개 `.stat` 에 `data-priority="core\|extra"` 추가 (core: Gold/HP/Steps, extra: Run/Reward/Food/Clear Rate) + `#stats-toggle` 더보기 버튼. `web/css/style.css`: `.stats-toggle` 기본 hidden, 모바일 (`@media (max-width: 700px)`) 에서 `.stats:not(.expanded) .stat[data-priority="extra"] { display: none; }` + 토글 버튼 노출. `web/js/main.js setupEventListeners`: 토글 핸들러 (`.expanded` class + aria-expanded + 더보기/접기 텍스트) + localStorage `rld_ui_stats_expanded` 박제 (try/catch 로 private mode 가드). 데스크탑 전체 노출 유지, 식별자 (id) 전부 보존 (B-107). 검증: node --check main.js OK, curl HTML 9 touchpoints (data-priority 7 + stats-panel + stats-toggle) 모두 노출. M4 모바일 트랙 (B-201/B-202/B-204) 의 첫 마감 |
| M4 모디파이어 12종 | 환경 6 + 제약 6 (데일리 전용 유지) | 2026-05-14 | VISION §5 M4 12종 목표 충족. 환경: slippery / heavy_fog / dim_torch / poison_floor / acid_rain / wind_gust. 제약: two_only / hp_cap_50 / mirror_input / no_heal / damage_boost / silent_q. 초기 명세의 food_drain / gold_dry 는 데일리 이코노미 격리 (D-8) 로 효과 0 → mirror_input / damage_boost 로 교체. `web/js/game/modifiers.js` MODIFIERS 사전 9종 추가 + ModifierSet 메소드 9개 (visibilityRange 확장 / shouldSkipTurn / poisonStepDamage / acidRainDamage / clampMaxHp / mirrorInput / healDisabled / damageMultiplier / visualizationMuted). `web/js/game/agent.js move()` HEAL/TRAP/MONSTER 에 modifierSet 가드 (no_heal / damage_boost). `web/js/main.js handleAction` 진입 시 wind_gust + mirror_input, agent.move 후 poison/acid 후처리, agent 생성 시 hp_cap_50 maxHp clamp. `_syncAgentModifiers` 가 silent_q 시 showQValues=false + sparkline-wrap hide. **검증**: 풀 12, pickModifiers 결정론 (seed 42 두 번 동일), 캠페인 baseline 25.1/27 ✓. **B-205 자연 closure** (slippery 30% 데일리 전용 유지로 캠페인 발란스 무위협). D-2026-05-14-14 박제 |
| B-206 | save migration UX — 기존 deathCount ≥ 4 로드 시 첫 도달 토스트 1회 안내 | 2026-05-14 | `web/js/main.js setupEventListeners` 시작에 localStorage flag (`rld_death_limit_notified`) 검사 — 기존 저장 로드 시 deathCount ≥ DEATH_LIMIT 이고 flag 없으면 `toast.show("누적 사망 n/4 — 다음 게임오버에서 캠페인 처음부터", 'warning')` 1회 발사 + flag set. try/catch private mode 가드. B-203 리뷰 W2 follow-up |
| B-203 | 사망 페널티 — 세르파 누적 사망 한도 (Q-table 노이즈 미채택) | 2026-05-14 | D-2026-05-12-4 verdict 의 "세르파 누적 사망 한도" 채택, VISION §4 결정 정합. `web/js/game/run-state.js`: `DEATH_LIMIT = 4` 상수 export. `recordDeath()` 가 `deathCount >= DEATH_LIMIT` 반환 (caller 분기용). `resetForDeathLimit()` 메소드 — 한도 도달 시 fresh playthrough (runNumber=1 + deathCount=0 + clearedDungeons reset, ngPlusCount/bestTotalSteps 보존, startNewGamePlus 와 구분). `web/js/main.js`: `triggerGameOver` 가 `recordDeath()` 결과로 `this.deathLimitReached` 박제 + 게임오버 메시지에 "누적 사망 한도 도달 — 다음 런으로" 추가 + Deaths n/4 stat 표시. `startNewRun` 분기 — 한도 도달이면 `resetForDeathLimit`, 아니면 `startNewRun()`. `_updateGuildResources` 가 guild header 의 사망 카운터 (`#guild-deaths "사망 n/4"`) 갱신 + 임박 (deathCount ≥ LIMIT-1) 시 `.guild-res-warn` 빨간색. `web/index.html`: guild header 에 `#guild-deaths` 신규. `web/css/style.css`: `.guild-deaths` + warn 변형. **sim 무영향 검증**: sim 은 manual-play fail (`player_failed`) 만 추적, HP 사망 trigger 안 함 → DEATH_LIMIT 활성 X. 3회 회귀 측정: 23.6 / 25.1 / 25.2 (평균 ~24.6, 모두 [23.5, 27.5] hit). 식별자 보존 (B-107). M4 P2 의 마지막 마감 |
| B-202 | 모바일 하단 탭 바 (Char / Dungeon / Train / Shop / Stats) | 2026-05-14 | `web/index.html` `<nav class="bottom-tabs">` (main 끝) — 5개 button 각자 `data-target="#anchor"` (#char-section / #dungeon-section / #training-section / #provisions-section / #stats-panel). 캐릭터/던전 섹션에 신규 id 부여 (#char-section, #dungeon-section) — 기존 id 미수정 (B-107 정합). `web/css/style.css`: `.bottom-tabs { display: none; position: fixed; bottom: 0 }` 디폴트, 모바일 미디어 쿼리 (`@media (max-width: 700px)`) 에서 `display: flex` + `body { padding-bottom: 60px }` 로 탭 바가 캐릭터/minimap 가리지 않게 가드. `web/js/main.js setupEventListeners`: 클릭 핸들러 — `scrollIntoView({ behavior: 'smooth' })` + active class 토글. 데스크탑 무영향 (body padding 도 미디어 쿼리 안). M4 모바일 트랙 (B-204 → B-201 → B-202) 완료 |
| B-201 | 모바일 fit-to-screen + 미니맵 (큰 던전) | 2026-05-14 | `web/css/style.css`: `@media (max-width: 700px)` 안에 `.game-area { max-width: 100%; min-width: 0; box-sizing: border-box; }` + `#game-canvas { max-width: 100%; height: auto; }` — flex item min-width:auto 가 canvas intrinsic width 로 결정되는 버그 해결, 큰 던전 (50×50) 도 viewport 안에 fit. 데스크탑 무영향. `web/index.html`: `#minimap-wrap` 신규 (`data-active="false"` 디폴트) + 미니맵 라벨 + `#minimap-canvas`. `web/css/style.css`: 미니맵 wrap 디폴트 hidden, 모바일 미디어 쿼리에서 `[data-active="true"]` 시 inline-flex. `web/js/game/tilemap-renderer.js render()` 끝에 `this.onAfterRender?.()` 한 줄 hook. `web/js/main.js`: constructor 에서 minimap canvas/ctx 캐시 + onAfterRender 등록. `_renderMinimap()` 메소드 — grid 의 width/height 가 25 미만이면 wrap data-active="false" silent skip, 25 이상이면 active="true" + canvas resize (1~5px/tile, max 120px) + 타일 채색 (WALL #4a4a4a / GOAL #22c55e / GOLD #facc15 / MONSTER\|TRAP #ef4444 / HEAL #10b981 / START #3b82f6) + agent 흰색 강조점. 검증: node --check 통과, curl HTML 미니맵 markup 노출. M4 모바일 트랙 (B-201 → B-202) 의 두 번째 마감 |
| B-208.2 | itch.io 페이지 카피 초안 (ko + en) | 2026-05-15 | `docs/PM/release/itch-io-draft.md` 신규 (254 lines). §1 폼 meta (URL slug `kalliroku.itch.io/rld` 가설 / classification Game / kind HTML / genre Adventure+Strategy / tags 10개 / rating Everyone / pricing $0 + pay-what-you-want suggested $3) + §2 title "RL Dungeon" + §3 tagline 영문 44자 / 한국어 + §4 short desc 영문 175자 / 한국어 + §5 long desc EN+KO (Three pillars / Run structure 표 / How it plays / What this is not 4건 / Tech 5건 / Credits) + §6 embed (1280×800, click-to-launch, fullscreen on) + §7 cover image 후보 3안 + §8 스크린샷 후보 6장 (캠페인 / 학습 시각 / 모디파이어 / 게임오버 / 길드홀 / 모바일) + §9 devlog 첫 글 초안 + §10 사용자 검수 체크리스트 8건 + §11 업로드 9단계 (자체 플레이테스트 5회 통과 후 Public 전환). 영문 톤 D-2026-05-15-15 Crisp/Functional. 정체성 D-2026-05-12-4 hero/sub/footnote 3분할 (landing 패턴 재사용). 메타 자기참조 0 ([[feedback_no_meta_lessons]]). **사용자 검수 대상**: URL slug / 한국어 short desc 글자 수 / pay-what-you-want tip 금액 / 한국어 섹션 통합 vs 별 페이지 분리 |
| B-208 | 출시 페이지 1차 (랜딩 HTML + landing.* 25키 + landing.css + README) | 2026-05-15 | M5 후반 1차. 구조 결정 (D-2026-05-15-17): `web/index.html` = 랜딩 신규, `web/play.html` = 게임 본체 rename (history 보존). `web/css/landing.css` 신규 (200줄, style.css 와 분리). `web/js/i18n/dict-{ko,en}.js`: `landing.*` 25키 (meta / hero / concept 3 / screenshots / quickstart 5 / footnote / footer), 총 222 → 247 (양사전 누락 0). HTML 구성: 히어로 (logo + 정체성 + Play/GitHub CTA) → 컨셉 3 카드 (시드 런 / 알고리즘=캐릭터 / 시각적 RL 양념) → 스크린샷 2×2 placeholder → 퀵스타트 5 라인 → 푸터 (RL 교육은 부산물 / MIT). 메타: og:title + og:description + meta description 토글 시 refreshMetaAttrs 로 동기 (data-i18n-content / data-i18n-attr-content). **버그 fix**: `.landing-body { display: flex; flex-direction: column }` 가 자식 `.landing-section` 의 max-width 와 cross-axis stretch 충돌로 content-min-width (149px) 로 collapse — `width: 100%` 명시로 해결. **모바일 폴리시**: `word-break: keep-all` + `overflow-wrap: break-word` 전역 + 600px 미디어 쿼리 컨셉/퀵스타트/lang-toggle 좁힘. **README**: Phase 표 → M1~M5 milestone (M5 진행 중) + 웹 실행 URL (`/` 랜딩 / `play.html` 게임) 분리 + 출시 페이지 / itch.io 호스팅 노트 + 프로젝트 구조 / 향후 계획 갱신. **검증**: node --check dict 통과 + key parity 247=247 + Chrome headless 데스크탑 (1400×2200) 정상 + 모바일 (420×2400) 정상 + play.html rename 후 정상 (title screen + 환영 토스트). 식별자 보존 (B-107). sim 무영향. **인계 잔여**: B-208.1 스크린샷 / B-208.2 itch.io 카피 / B-208.3 github pages 활성화 (admin) |
| B-207 | silent_q 활성 시 Q-heatmap 자리 명시 placeholder ("침묵의 학습 — 시각화 차단됨") | 2026-05-14 | M4 modifier 리뷰 I1 → M5 첫 마감. `web/index.html`: sparkline-wrap 다음에 `#silent-q-placeholder` div 추가 (디폴트 hidden, `.silent-q-label` "침묵의 학습" + `.silent-q-desc` "시각화 차단됨 — 모디파이어 효과"). `web/css/style.css`: `.silent-q-placeholder` 스타일 (sparkline-wrap 톤 매칭, dashed 회색 테두리 + italic 보조 텍스트로 *기능 차단됨* 상태 명시). `web/js/main.js _syncAgentModifiers`: muted 분기 끝에 `silent-q-placeholder` `style.display` 토글 (muted 시 show, else hide). **sim 무영향 검증** — `sim/` 디렉토리에 `silent_q` / `visualizationMuted` 참조 없음, UI placeholder 전용. **검증**: `node --check main.js` OK + `ModifierSet(['silent_q']).visualizationMuted()` true + 빈/타 modifier false + 3개 파일 모두 `silent-q-placeholder` 1회씩 노출 (정합). D-4 정체성 보호 — RL 양념이 사라진 게 아니라 *모디파이어로 가려졌음* 을 사용자에게 명시 |
