# RLD — Project Status

**Last updated**: 2026-05-14 (D-12 closure — 알고리즘 17개 deflection 패치 + sim grid.modifierSet 활성화)

## Current track

**완성된 게임으로 출시 노선**.
- 이전 노선: AI 해커톤 (aihackcamp-2026) — 폐기 (탈락).
- 현 노선: 일반 플레이어 대상 독립 게임. **출시 1.0 그림은 [VISION.md](./VISION.md)** 참조.
- 한 줄 정체성 (D-4 확정): **알고리즘이 곧 캐릭터인 시드 기반 로그라이크 — 매 런 다른 모디파이어 아래 한정된 세르파 풀로 던전을 답파한다. RL 교육은 부산물.**

## 활성 결정

없음. 다음 결정은 M4 작업 진행 중 자연 발생 예정.

## In-Progress

- **M1 ✅ 완료** — 그림 그리기 (3축 비판 + 디베이트 + VISION.md).
- **M2 ✅ 완료** — P0 4/4 (B-001~B-004). 정체성 정리 + Step-0 진입 모드 박힘.
- **M3 ✅ 완료** — P1 단기 8건 + T2B-3 + **T2B-1 ✅** (시드 일일 챌린지) + **T2B-2 MVP ✅** (모디파이어 3종 데일리 전용) + **B-109 ✅** (sim 측 ModifierSet 통합 + modifier-on 측정 통과).
- **M4 진입** — **D-12 closure ✅** (2026-05-14, 17 알고리즘 파일 deflection 패치 + sim grid.modifierSet 활성화). 다음 항목: 모디파이어 12종 디자인 (slippery 강도 30% 재검토) / 캠페인 모디파이어 확장 / 모바일 (P2).

## 최근 활동

- 2026-05-14 — **B-204 마감** — 모바일 핵심 스탯 3개 (HP / Gold / Steps) 만 디폴트 노출, 나머지 4개 (Run / Reward / Food / Clear Rate) 토글 접힘. `web/index.html` 의 7개 `.stat` 에 `data-priority="core|extra"` 추가 + `#stats-toggle` 더보기 버튼. `web/css/style.css` 모바일 미디어 쿼리 (`@media (max-width: 700px)`) 안에 `.stats:not(.expanded) .stat[data-priority="extra"] { display: none; }` + `.stats-toggle { display: inline-block; }`. `web/js/main.js setupEventListeners` 에 토글 핸들러 (`.expanded` class + aria-expanded + 더보기/접기 텍스트) + localStorage `rld_ui_stats_expanded` 박제로 페이지 새로고침 후에도 사용자 선호 유지. 데스크탑 (≥701px) 전체 노출 유지, 식별자 (id) 전부 보존 (B-107 정합).
- 2026-05-14 — **D-12 closure** — 17 알고리즘 파일 (qlearning, sarsa, sarsa-lambda, expected-sarsa, monte-carlo, dyna-q, double-qlearning, qv-learning, actor-critic, reinforce, tree-backup, prioritized-sweeping, acla, ensemble, local-qlearning, dqn, ppo) × 33 인스턴스 deflection 패치. `nextPos/nextKey/originalTile → intendedPos/intendedKey/intendedTile + actualKey` (agent.move() 직후 actualKey 재생성, hide 는 intended / track + restore 는 actual). agent.js 미수정. sim/simulator.js getGrid 에 `grid.modifierSet` 부착 활성화 (D-12 사유 주석 폐기). **측정 결과 (20-run HybridPlayer)**: off=25.6/27 ✓ (+1.1 vs B-109 24.5 — 경계 OOB 회피로 baseline 향상), heavy_fog=25.6/27 ✓, two_only=16.3/27, slippery=14.0/27 (-10.4 vs B-109 24.4), 3종 합산=15.2/27. **이중 페널티 가설 기각** (algorithm-only 14.6 vs 이중 14.0, +0.6 차이만) — 영향은 algorithm 측 deflection 자체. M3→M4 게이트 유지 ✓ (modifier-off 25.6/27 영역 hit). 후속: 캠페인 modifier 도입 시 slippery 30% 강도 (D-10) 재검토 필요.
- 2026-05-13 — **B-109 마감** — sim/simulator.js + sim/run-balance.js 에 modifier 통합. GameSimulator 옵션 `{modifierIds, modifierSeed}`, two_only 시 캐릭터 풀 픽 + pre-hire, manual-play 페널티 (heavy_fog ×1.25 humanSteps / slippery ×0.85 successRate), `estimateManualCost` 시그니처 확장으로 추정/실제 동기화. **측정 결과 (20-run HybridPlayer)**: off=24.5/27 ✓, slippery=24.4/27 ✓, heavy_fog=24.3/27 ✓ (모두 [23.5,27.5] hit), two_only=13.3/27 (D-9 데일리 전용으로 정당화), 3종=17.1/27. **slippery 는 manual-play approximation 만** — algorithm 15개 의 gold/monster restoration 이 intended vs actual position 분리 미흡한 pre-existing 버그로 deflection 시 OOB → D-12 박제. M3 → M4 게이트 통과.
- 2026-05-12 — **T2B-2 MVP 마감** (모디파이어 3종, 데일리 전용). `web/js/game/modifiers.js` (ModifierSet + pickModifiers, mulberry32 seeded). agent.js `_resolveAction` + `getVisibility` 격상. daily-mode.js `getDailyChallenge` 가 pickModifiers 호출. main.js: activeModifierSet 라이프사이클 + two_only 캐릭터 픽커 + 모디파이어 띠 + heavy_fog 시 fog 강제. 결정론 검증 (slip rate 0.300 over 10k, two_only seed=3 → ["dyna","doubleq"] reproducible, dailyChallenge 동일 UTC 일 idempotent). visual 검증 (heavy_fog 가시 2칸, slippery 11 push 중 3 deflection). 캠페인 회귀 sim (modifier off, 5×20-run): 24.6 / 25.6 / 24.9 / 25.4 / 24.1 — 모두 25.5/27 ± 2 영역 hit ✓.
- 2026-05-12 — **T2B-1 마감** (시드 기반 일일 챌린지 — 1.1 rng.js 분리 / 1.2 Daily 모드 + 데일리 던전 / 1.3 어제 비교 + 7일 캐러셀 / 1.4 B-110 흡수). 결정론 검증 통과 (시드 1656106231, 시작/목표 reproducible). Play 회귀 sim 25.0/27 ✓. agent-browser visual 검증 통과 (Daily 탭 → 도전 → 클리어/사망 → 어제 비교 메시지)
- 2026-05-12 — **T2B 본진 진입 인계 문서** 작성 (`handoffs/2026-05-12-act1-to-t2b.md`) — 다음 에이전트가 zero-base 진입 가능하도록 T2B-1/T2B-2 명세 + 검증 자산 + 자율 결정사항 + 위험 정리
- 2026-05-12 — **자율 진행 세션**: P1 8건 일괄 처리. B-108 식량 1→2 + sim 일관성 + 20-run baseline 회귀 (25.6/27 ✓), B-101 Q-Value 디폴트 ON + 숫자 제거, B-106 학습 성공률 sparkline 상시 표시, B-104 Ch.7 운영비 -30% + 보상 +30%, B-103 Ch.5 8→4 던전 축소 (Lv.20~23 컷, 31→27), T2B-3 잔여 (hire confirm + tutorial 한국어). agent-browser 통합 검증 통과
- 2026-05-12 — B-102/B-105/B-107 처리: PIT 빨간 X 분화, 캐릭터 카드 성격 태그 + 학명 hover 툴팁, 우측 컨트롤 10개 섹션 한국어 통일
- 2026-05-12 — B-004 Step-0 진입 모드: 진입 시 4개 패널만 노출 + canvas 힌트, 첫 클리어 시 일괄 펼침 + 토스트
- 2026-05-12 — B-001/B-002/B-003 일괄 처리: README / GDD / ACT1_SUMMARY 정체성 카피 통일, 가차 섹션 영구 삭제, 던전 마스터 모드 Act 2 후속 격하
- 2026-05-12 — 3축 병렬 비판 수행 (`critiques/`) + RL 포지셔닝 디베이트 → D-4 / D-5 확정 → VISION.md straw-man — **M1 마감**

## 블락된 항목

없음. **M4 진입 — D-12 정리 완료**. 알고리즘 17개 deflection 패치 적용, sim 측 grid.modifierSet 활성화. 캠페인 modifier 도입 (모디파이어 12종 디자인 시점) 전에 modifier.slippery 30% 강도 (D-10) 재검토 필요 — algorithm 측 자연 영향 -10.4 가 캠페인 발란스 25.5/27 ± 2 영역 보호와 충돌.

## 핵심 지표 (D-12 closure 후, 2026-05-14)

- HybridPlayer modifier off (20-run): **25.6/27 ✓** (D-4 의 25.5 ± 2 정확 hit, D-12 패치로 +1.1 향상)
  - 이전 (B-109): 24.5/27 ✓ (5×20 historical: 24.6 / 25.6 / 24.9 / 25.4 / 24.1)
- HybridPlayer modifier ON — **데일리 전용 측정** (D-9, 캠페인 게이트 미적용), algorithm-side deflection 활성:
  - slippery 단독: **14.0/27 ❌** (algorithm 측 deflection 자연 영향 -10.4, 캠페인 도입 전 강도 재검토 필요)
  - heavy_fog 단독: **25.6/27 ✓** (movement 미영향)
  - two_only 단독: **16.3/27** (D-9 데일리 전용으로 정당화, 캠페인 미적용)
  - 3종 합산: **15.2/27** (데일리 전용 스택 — 영역 이탈 의도됨)
- 던전 수: 31 → **27** (B-103 Ch.5 축소, Lv.20~23 은 grid.js 보존 자산)
- 우측 컨트롤 10개 섹션 한국어, 튜토리얼 5개 메시지 한국어
- 첫 진입 — Step-0 4개 패널 + canvas 힌트 + Q-Value 디폴트 ON + sparkline placeholder
- **데일리 모드**: Daily 탭 + 시드 결정론 + 20×20 PCG 던전 + 어제 비교 + 7일 캐러셀, localStorage `rld_daily_history` 별도 키 (NG+ 영향 X)
- **모디파이어 3종** (데일리 전용): slippery (30% 빗나감, seeded), two_only (14-character pool — scout 제외 — 에서 2명 시드 픽), heavy_fog (시야 5→3 칸). 모디파이어 띠 + 데일리 패널 칩 UI
- **sim 측 modifier 통합**: `--modifier=slippery,heavy_fog,two_only` `--seed=N` CLI 플래그. manual-play approximation (slippery/heavy_fog) + two_only pre-hire

## 다음 마일스톤 (VISION §5 동기화)

- **M1** ✅ — 그림 그리기 (이 PM 디렉토리 + VISION.md)
- **M2** ✅ — P0 4건 → *"정체성 정리 완료"*
- **M3** ✅ — T2B 본진 (시드 + 모디파이어 MVP 3 + 알고리즘=캐릭터) + B-108/109 → ***alpha***
- **M4** (~5개월) — P2 모바일·사망 페널티 + 모디파이어 12종 + BGM 4트랙 → ***beta*** **← 진입 준비 완료**
- **M5** (~6~7개월) — 폴리시 + 한영 i18n + 출시 페이지 → ***1.0***
