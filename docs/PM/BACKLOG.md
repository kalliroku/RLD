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

| ID | 작업 | 출처 | 공수 |
|---|---|---|---|
| B-201 | 모바일 fit-to-screen + 미니맵 (큰 던전) | UX | 3~4일 |
| B-202 | 모바일 하단 탭 바 (Char / Dungeon / Train / Shop / Stats) | UX | 2일 |
| B-203 | 사망 페널티 — Q-table 30% 노이즈 또는 세르파 누적 사망 한도 | 기획자 | 2~3일 |
| B-204 | 모바일 핵심 스탯 3개만 노출 (HP / Gold / Steps), 나머지 접힘 | UX | 0.5일 |

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
