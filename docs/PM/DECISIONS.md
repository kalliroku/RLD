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

- **D-2026-05-13-12** ✅ **sim 측 modifier.slippery 는 manual-play approximation 으로만 적용** — B-109 작업 중 발견: 15개 알고리즘 파일이 모두 `nextPos = agent.getNextPosition(action)` (의도 위치) 로 gold/monster 추적 키를 만들고, deflection 후 `agent.x/agent.y` (실제 위치) 로 grid.tiles 수정 → episode 종료 시 restore loop 가 의도 위치를 복원하려다 OOB 인덱스 (e.g. `tiles[-1][x]`) 로 TypeError. 캠페인은 modifier 무활성, 데일리 PCG 던전은 gold/monster 미배치라 production 에서는 latent. **B-109 측정 범위에서는** sim 의 manualPlayDungeon 에 `SLIPPERY_MANUAL_SUCCESS_MULT=0.85` 만 적용하고 AI 훈련 측은 vanilla 로 둠. `grid.modifierSet` 부착은 일단 fallback 코드만 남기고 사용 안 함. 향후 캠페인 모디파이어 도입 (M4) 시 알고리즘 15개 일괄 수정 필요 — 별도 B-아이템으로 분리.
