# Decisions — RLD

날짜별 시간순. 각 항목은 한 줄 + 상세 파일 링크.
상태 마커: ✅ resolved / ⏳ pending / ❌ rejected / 🔁 superseded
ID 형식: `D-YYYY-MM-DD-N`

---

## 2026

### 2026-05-12

- **D-2026-05-12-1** ✅ 해커톤 노출 노선 (aihackcamp-2026) 폐기, 완성 게임 출시 노선으로 전환 — 출처: 대화 ("aihack은 떨어졌다")
- **D-2026-05-12-2** ✅ 3축 병렬 비판 수행 — 게임 기획자 + UX + 리텐션 → [critiques/](./critiques/)
- **D-2026-05-12-3** ✅ PM 추적 시스템 도입 — 이 디렉터리 (`docs/PM/`)
- **D-2026-05-12-4** ✅ **RL 양념 노선 + 이코노미 부분 보정 (C — 제3의 길)** — "알고리즘이 곧 캐릭터인 시드 기반 로그라이크. RL 교육은 부산물." 골격은 Position B (시드 모디파이어 + 알고리즘=캐릭터), 보정은 Position A 의 수술 1 만 (수동 식량 1→2). 하이퍼파라미터 슬라이더·재검증·가차는 컷. → [decisions/2026-05-12-rl-positioning/verdict.md](./decisions/2026-05-12-rl-positioning/verdict.md) (mediator 전문: [mediator.md](./decisions/2026-05-12-rl-positioning/mediator.md), 옹호문: [advocate-a.md](./decisions/2026-05-12-rl-positioning/advocate-a.md) · [advocate-b.md](./decisions/2026-05-12-rl-positioning/advocate-b.md))
- **D-2026-05-12-5** ✅ **Phase 16 NPC 가차 시스템 전체 삭제** (격하/유보 아님, GDD §3.3.4 전체 컷). D-4 의 일부로 확정.
- **D-2026-05-12-6** ✅ **출시 1.0 비전 문서화** — 출시 형태 (웹 + itch.io 무료, Steam 미진입), 세션 길이 (캠페인 30~45분 / 데일리 8~12분 / 전체 6~10h / NG+ 무한), 폴리시 플로어 (BGM 4~6 + 한영 + 모바일 fit), 콘텐츠 스코프 (모디파이어 12~15종 / 사망 페널티 = 세르파 누적 사망 한도 / 리더보드 없음), 6~7개월 출시 타임라인 (M1~M5). M1 마감 → [VISION.md](./VISION.md).
- **D-2026-05-12-7** ✅ **데일리 history 저장소를 RunState 와 분리** — localStorage `rld_daily_history` 별도 키 + `DailyHistory` 클래스. RunState 의 일부로 둘 경우 NG+ 리셋·save migration 에 휩쓸릴 위험. 데일리는 *영구* (NG+ 영향 없음) 가 본질이므로 분리. T2B-1.2 작업 중 결정.
- **D-2026-05-12-8** ✅ **데일리 모드 = 캠페인 이코노미 완전 분리** — `isBuiltInDungeon(daily_*)` 가 false 반환하도록 격상. 식량 소비 / 입장료 / 몬스터 골드 / 보물 / serpa 사망 카운트 모두 daily 에서는 nullify. 데일리는 *순수 도전* 으로, 캠페인 진행을 잃거나 얻는 메타게임 없음. 핸드오프 §2.2 "isolated" 요구사항 강화 해석.
- **D-2026-05-12-9** ✅ **모디파이어 = 데일리 전용 (T2B-2 MVP)** — slippery / two_only / heavy_fog 3종은 데일리 모드에서만 활성. 캠페인 던전은 기존 `grid.slippery` (FrozenLake Lv.26~28) 만 유지. 이유: 캠페인 발란스 (25.5/27 ± 2) 보호 + B-109 회귀를 별 작업으로 분리. 캠페인 모디파이어 확장은 출시 1.0 12종 목표 시점에 다시 검토.
- **D-2026-05-12-10** ✅ **slippery 모디파이어 = 30%, grid.slippery 와 별개 경로** — modifier.slippery 는 30% 옆길 빗나감 (seeded mulberry32). 기존 FrozenLake `grid.slippery` 는 2/3 빗나감 (Math.random) 그대로 유지. 둘이 동시 활성화될 경우 grid.slippery 의 강한 모델이 우선 (modifier 무시). 이유: FrozenLake 의 캐릭터/발란스 식별성 보존.
- **D-2026-05-12-11** ✅ **two_only 풀 = 데일리 전용 비-숨김 알고리즘 전체** — 데일리는 [[project_kiosk_design]] 격리 원칙 (D-8) 에 따라 캠페인 hire 상태와 무관. 따라서 two_only 가 픽하는 2명은 hired/free 와 무관하게 `CHARACTERS` (scout = HIDDEN_CHARACTERS 제외) 14명에서 시드로 결정. 매일 모든 플레이어가 동일한 2명.

### 2026-05-13

- **D-2026-05-13-12** ✅ **sim 측 modifier.slippery 는 manual-play approximation 으로만 적용** — B-109 작업 중 발견: 15개 알고리즘 파일이 모두 `nextPos = agent.getNextPosition(action)` (의도 위치) 로 gold/monster 추적 키를 만들고, deflection 후 `agent.x/agent.y` (실제 위치) 로 grid.tiles 수정 → episode 종료 시 restore loop 가 의도 위치를 복원하려다 OOB 인덱스 (e.g. `tiles[-1][x]`) 로 TypeError. 캠페인은 modifier 무활성, 데일리 PCG 던전은 gold/monster 미배치라 production 에서는 latent. **B-109 측정 범위에서는** sim 의 manualPlayDungeon 에 `SLIPPERY_MANUAL_SUCCESS_MULT=0.85` 만 적용하고 AI 훈련 측은 vanilla 로 둠. `grid.modifierSet` 부착은 일단 fallback 코드만 남기고 사용 안 함. 향후 캠페인 모디파이어 도입 (M4) 시 알고리즘 15개 일괄 수정 필요 — 별도 B-아이템으로 분리. → 2026-05-14 **D-2026-05-14-13** 으로 closure.

### 2026-05-15

- **D-2026-05-15-17** ✅ **출시 페이지 구조 — `web/index.html` 재지정 (A 옵션 채택)** — github pages 진입점 (`kalliroku.github.io/RLD/`) 의 표준 마케팅 페이지 패턴. `web/index.html` 신규 (랜딩) + `web/play.html` rename (게임 본체, history 보존). URL: `/` = 랜딩 / `/play.html` = 게임. 사용자 결정 (대안: B 별도 landing.html 추가 / C 게임 내 title 화면 확장). 선택 사유: 일반 출시 패턴, 외부 링크 (itch.io / 공유) 가 마케팅으로 소프트 랜딩, README 등 내부 참조 sweep 비용은 small (1차 sweep 완료). 호스팅 1차 채널 = `kalliroku.github.io/RLD/` (자체 도메인 미진입). 부차 결정: 랜딩 스타일은 별도 `web/css/landing.css` (style.css 와 격리 — 게임 UI 와 의존 없음, 변경 위험 격리), `landing.*` i18n 키 25개로 기존 i18n loader 재활용 (영문 카피 톤은 D-2026-05-15-15 의 Crisp/Functional 유지), 한국어 wrap 은 `word-break: keep-all` + `overflow-wrap: break-word` 전역 (모바일 폭에서 한글 어절 보존). **알려진 미세 결함**: 모바일 폭 420 에서 컨셉 카드 본문 한국어 마지막 글자 정렬이 살짝 어긋남 (잘림 X 단순 시각) — W2 토글 갱신 스모크 사이클과 함께 폴리시 예정.

### 2026-05-19

- **D-2026-05-19-1** ✅ **RLD 세계관 결정 — 세르파 길드 vs 모험가 길드 narrative** — 사용자 결정 (W6 commit 끝 박힌 재해석 → W7 사이클에서 정합 점검 + 디테일 채움). 동기: *목적성을 narrative 로 설명* + *RL 메타 자기참조 회피* (RL 은 게임의 일부로 녹임, 굳이 드러내지 않음).
  1. **세르파** = 길드장의 *부활 아이템* 하에 던전에 가는 비-영웅 인간들. 모험가 못난이 출신. 세르파 본인은 부활 능력 X.
  2. **두 길드** = 모험가 길드 (기득권 / 흑막 / 던전 이권 독점 시도) vs 세르파 길드 (반발로 창립 / 아빠가 창립자).
  3. **아빠** = 던전의 *모더*. 실종 아니라 살아있음, 모험가 길드에 복수하려고 모디파이어로 시련 박음. **모디파이어 12종 (D-2026-05-14-14) = 아빠가 박은 시련** 으로 narrative 흡수.
  4. **귀환 아이템** = 아빠가 과거 보유, 아들 탈출 시 소비. 게임 시작 시점엔 없음.
  5. **부활 아이템** = 아빠가 남긴 *유산*. 길드장이 현재 보유 + 발동. **누적 사망 4/4 (B-203 시스템) = 부활 아이템 충전 한도** 로 narrative 흡수. (귀환 아이템과 별개 — 두 아이템이 서로 다른 역할.)
  6. **유저(길드장)** = 모험가 길드의 *도구* 로서 던전 잠입. 처음엔 모름. 진행 중 진실 (이용당함) 깨달음. 진실 폭로 시점은 미정.
  7. **모험가 길드의 부추김 동기** = 부활 아이템 자체를 빼앗아 세르파 길드 무력화. 유저를 던전에 들여보내 *위치 + 아이템 확인*.
  8. **모험가 도움 (신규 시스템)** = shop 탭 일회용 보너스. **manual play (길드장 직접 진입) 시 모험가 동반하면 즉시 베드 엔딩** — 모험가가 길드장 위치 노출 → 살해 → 부활 아이템 약탈 → "X는 살해됐습니다 → 왜? → 아이템 약탈" 카피. AI 학습 시 동반은 안전 (길드장 부재). manual play vs AI 학습 의 narrative 위치: manual = 길드장 직접 진입 / AI training = 세르파 학습 (길드장 안전).
  9. **답파 동기** = 돈 (생존) + 아빠 단서 + 모험가 길드 흑막 폭로.
  10. **RL 메타 흡수 룰** = narrative 안에 흡수. 표면 카피에서 "강화학습" 학명 노출 회피. 학명 (Q-Learning / SARSA / ...) 은 캐릭터 hover 툴팁 (B-105 정합) 만 opt-in. Q-heatmap / sparkline = 길드장이 세르파 *기억* 들여다보는 옵션 위치 (D-2026-05-12-4 "RL 교육은 부산물" 보존).

  **미정 잔여 (W7.4 사이클 시작 시 결정)**: 모험가 도움 효과 강도 / manual vs AI 학습 의 명시적 UI 구분 여부 / 진엔딩 조건 / 모험가 길드 흑막 폭로 시점 / NG+ narrative 위치 / 3회 카운터 가시성 (조건 베이스 채택으로 카운터 자체 폐기됨).

  **W7 분할**: W7.0 D-* 박제 (본 결정 ✅) / W7.1 오프닝 카드 / W7.2 첫 클리어 overlay + map choice 카피 / W7.3 RL 메타 카피 흡수 (~5건) / W7.4 모험가 도움 시스템 신규 — 가장 큰 사이클, 게임 디자인 영역 / W7.5 진엔딩 카피 / W7.6 STORY.md 박제.

  **D-2026-05-12-4 정체성과의 정합**: ✅ "한정 세르파 풀" (영입 가능 = 모험가 못난이 한정) / ✅ "RL 교육은 부산물" (학습 시각화는 길드장 옵션 위치 보존) / ✅ "매 런 모디파이어" (아빠 시련) / ✅ "시드 기반 로그라이크" (narrative 영향 X) / ✅ 데일리 격리 (D-2026-05-12-8) — 데일리 = 외전 (아빠 매일 시련). **메타 자기참조 금지 ([[feedback_no_meta_lessons]]) 룰 준수** — narrative 가 *게임 내 세계관* 자체, "여러분도 학습했어요" 류 아님.

### 2026-05-14

- **D-2026-05-14-14** ✅ **모디파이어 12종 — 데일리 전용 유지 + 환경 6 / 제약 6 분류** — VISION §5 M4 의 12종 목표 충족. 사용자 결정 (테마=환경+제약, 모드=데일리 전용, 강도=일반적인 형태로). 환경 6: slippery / heavy_fog / dim_torch / poison_floor / acid_rain / wind_gust. 제약 6: two_only / hp_cap_50 / mirror_input / no_heal / damage_boost / silent_q. 초기 명세 (food_drain / gold_dry) 는 데일리 이코노미 격리 (D-8) 로 효과 0 → mirror_input / damage_boost 로 교체. **B-205 자연 closure** — 데일리 전용 유지로 slippery 30% 강도가 캠페인 발란스에 영향 줄 경로 없음. 모든 모디파이어 효과는 mulberry32 seeded 결정론 유지 (slippery / wind_gust). agent.js move() 가 modifierSet.healDisabled / damageMultiplier 가드. main.js handleAction 이 wind_gust skipTurn + mirror_input + poison/acid 후처리 + hp_cap_50 maxHp clamp + silent_q 시각화 hide. 12종 풀 검증 (`pickModifiers(42, 3)` 두 번 호출 동일 결과, 캠페인 baseline 25.1/27 ✓). **상호작용 룰**: 환경 데미지 (poison_floor / acid_rain) 는 C-5 defense contract / trap nullify 회복 대상 외 — agent.move 의 monster/trap 만 회복하고 환경 modifier 데미지는 별도 처리되므로 contract 우회. 의도된 설계 (modifier = 캐릭터 카드와 독립).

- **D-2026-05-14-13** ✅ **D-12 closure: 알고리즘 17개 deflection 패치 + sim 측 grid.modifierSet 부착 활성화** — Key 재생성 방식 (사용자 선택, 최소 변경) 채택. `nextPos/nextKey/originalTile → intendedPos/intendedKey/intendedTile`, agent.move() 직후 `actualKey = ${agent.x},${agent.y}` 재생성. hide 는 intended / track + restore 는 actual 로 분리 → OOB 불가능. 17 파일 (qlearning, sarsa, sarsa-lambda, expected-sarsa, monte-carlo, dyna-q, double-qlearning, qv-learning, actor-critic, reinforce, tree-backup, prioritized-sweeping, acla, ensemble, local-qlearning, dqn, ppo) × 33 인스턴스 (변형 1 training loop 17 + 변형 2 test/eval/replay loop 16, ensemble 만 변형 1 단독). agent.js 미수정 (인터페이스 변경 없음). sim/simulator.js getGrid 의 D-12 사유 주석 폐기 + `grid.modifierSet` 부착 활성화. **측정 결과 (20-run HybridPlayer)**: off=25.6/27 ✓ (+1.1 vs B-109 의 24.5 — actualKey 기반 restoration 이 경계 OOB 회피로 baseline 향상), heavy_fog=25.6/27 ✓ (+1.3), two_only=16.3/27 (+3.0), slippery=14.0/27 (-10.4 vs B-109 의 24.4), 3종 합산=15.2/27. **이중 페널티 가설 (manual approximation × 0.85 + algorithm-side deflection) 기각** — algorithm-only 측정 (manual approx 임시 끔) 14.6/27 vs 이중 14.0/27 차이 +0.6. 대부분 영향은 algorithm 측 deflection 자체 (level_12_hp_gauntlet never_converged 14/20). **M3→M4 게이트 통과 유지** — modifier-off 25.6/27 ✓ 영역 hit. **후속 (M4 캠페인 modifier 도입 시점)**: modifier.slippery 30% 강도 (D-10) 가 algorithm 학습에 너무 강함 → 캠페인 도입 전 강도/적용범위 재검토 필요.
