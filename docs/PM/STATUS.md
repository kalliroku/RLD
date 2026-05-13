# RLD — Project Status

**Last updated**: 2026-05-12 (T2B-2 MVP 마감, B-109 modifier-on 회귀 대기)

## Current track

**완성된 게임으로 출시 노선**.
- 이전 노선: AI 해커톤 (aihackcamp-2026) — 폐기 (탈락).
- 현 노선: 일반 플레이어 대상 독립 게임. **출시 1.0 그림은 [VISION.md](./VISION.md)** 참조.
- 한 줄 정체성 (D-4 확정): **알고리즘이 곧 캐릭터인 시드 기반 로그라이크 — 매 런 다른 모디파이어 아래 한정된 세르파 풀로 던전을 답파한다. RL 교육은 부산물.**

## 활성 결정

없음. 다음 결정은 작업 진행 중 자연 발생 예정.

## In-Progress

- **M1 ✅ 완료** — 그림 그리기 (3축 비판 + 디베이트 + VISION.md).
- **M2 ✅ 완료** — P0 4/4 (B-001~B-004). 정체성 정리 + Step-0 진입 모드 박힘.
- **M3 거의 마감** — P1 단기 8건 + T2B-3 + **T2B-1 ✅** (시드 일일 챌린지) + **T2B-2 MVP ✅** (모디파이어 3종 데일리 전용). 잔여: B-109 modifier-on sim 회귀 (sim/strategies + simulator 에 ModifierSet 통합 분기) — M3 → M4 게이트의 마지막 항목. 인계 문서: [`handoffs/2026-05-12-t2b2-to-b109.md`](handoffs/2026-05-12-t2b2-to-b109.md) 참조.

## 최근 활동

- 2026-05-12 — **T2B-2 MVP 마감** (모디파이어 3종, 데일리 전용). `web/js/game/modifiers.js` (ModifierSet + pickModifiers, mulberry32 seeded). agent.js `_resolveAction` + `getVisibility` 격상. daily-mode.js `getDailyChallenge` 가 pickModifiers 호출. main.js: activeModifierSet 라이프사이클 + two_only 캐릭터 픽커 + 모디파이어 띠 + heavy_fog 시 fog 강제. 결정론 검증 (slip rate 0.300 over 10k, two_only seed=3 → ["dyna","doubleq"] reproducible, dailyChallenge 동일 UTC 일 idempotent). visual 검증 (heavy_fog 가시 2칸, slippery 11 push 중 3 deflection). 캠페인 회귀 sim (modifier off, 5×20-run): 24.6 / 25.6 / 24.9 / 25.4 / 24.1 — 모두 25.5/27 ± 2 영역 hit ✓. **B-109 잔여 = sim 측 ModifierSet 통합 + modifier-on 측정**
- 2026-05-12 — **T2B-1 마감** (시드 기반 일일 챌린지 — 1.1 rng.js 분리 / 1.2 Daily 모드 + 데일리 던전 / 1.3 어제 비교 + 7일 캐러셀 / 1.4 B-110 흡수). 결정론 검증 통과 (시드 1656106231, 시작/목표 reproducible). Play 회귀 sim 25.0/27 ✓. agent-browser visual 검증 통과 (Daily 탭 → 도전 → 클리어/사망 → 어제 비교 메시지)
- 2026-05-12 — **T2B 본진 진입 인계 문서** 작성 (`handoffs/2026-05-12-act1-to-t2b.md`) — 다음 에이전트가 zero-base 진입 가능하도록 T2B-1/T2B-2 명세 + 검증 자산 + 자율 결정사항 + 위험 정리
- 2026-05-12 — **자율 진행 세션**: P1 8건 일괄 처리. B-108 식량 1→2 + sim 일관성 + 20-run baseline 회귀 (25.6/27 ✓), B-101 Q-Value 디폴트 ON + 숫자 제거, B-106 학습 성공률 sparkline 상시 표시, B-104 Ch.7 운영비 -30% + 보상 +30%, B-103 Ch.5 8→4 던전 축소 (Lv.20~23 컷, 31→27), T2B-3 잔여 (hire confirm + tutorial 한국어). agent-browser 통합 검증 통과
- 2026-05-12 — B-102/B-105/B-107 처리: PIT 빨간 X 분화, 캐릭터 카드 성격 태그 + 학명 hover 툴팁, 우측 컨트롤 10개 섹션 한국어 통일
- 2026-05-12 — B-004 Step-0 진입 모드: 진입 시 4개 패널만 노출 + canvas 힌트, 첫 클리어 시 일괄 펼침 + 토스트
- 2026-05-12 — B-001/B-002/B-003 일괄 처리: README / GDD / ACT1_SUMMARY 정체성 카피 통일, 가차 섹션 영구 삭제, 던전 마스터 모드 Act 2 후속 격하
- 2026-05-12 — 3축 병렬 비판 수행 (`critiques/`) + RL 포지셔닝 디베이트 → D-4 / D-5 확정 → VISION.md straw-man — **M1 마감**

## 블락된 항목

없음. **B-109 sim 통합** 진입 준비 완료 — `web/js/game/modifiers.js` (ModifierSet + pickModifiers) 가 sim 측에서도 재사용 가능. sim/strategies.js + sim/simulator.js 에 slippery(30% deflection) + heavy_fog(humanSteps 추정 증가) + two_only(strategy 캐릭터 풀 제한) 분기를 추가하면 modifier-on 회귀 측정 가능.

## 핵심 지표 (T2B-2 MVP 마감 후)

- HybridPlayer baseline (modifier off, 5×20-run): **24.6 / 25.6 / 24.9 / 25.4 / 24.1** — 모두 25.5/27 ± 2 영역 hit ✓
- 던전 수: 31 → **27** (B-103 Ch.5 축소, Lv.20~23 은 grid.js 보존 자산)
- 우측 컨트롤 10개 섹션 한국어, 튜토리얼 5개 메시지 한국어
- 첫 진입 — Step-0 4개 패널 + canvas 힌트 + Q-Value 디폴트 ON + sparkline placeholder
- **데일리 모드**: Daily 탭 + 시드 결정론 + 20×20 PCG 던전 + 어제 비교 + 7일 캐러셀, localStorage `rld_daily_history` 별도 키 (NG+ 영향 X)
- **모디파이어 3종** (데일리 전용): slippery (30% 빗나감, seeded), two_only (14-character pool — scout 제외 — 에서 2명 시드 픽), heavy_fog (시야 5→3 칸). 모디파이어 띠 + 데일리 패널 칩 UI

## 다음 마일스톤 (VISION §5 동기화)

- **M1** ✅ — 그림 그리기 (이 PM 디렉토리 + VISION.md)
- **M2** (~1개월) — P0 4건 → *"정체성 정리 완료"*
- **M3** (~3개월) — T2B 본진 (시드 + 모디파이어 MVP 3 + 알고리즘=캐릭터) + B-108/109 → ***alpha***
- **M4** (~5개월) — P2 모바일·사망 페널티 + 모디파이어 12종 + BGM 4트랙 → ***beta***
- **M5** (~6~7개월) — 폴리시 + 한영 i18n + 출시 페이지 → ***1.0***
