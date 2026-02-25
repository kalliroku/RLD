# Act 1 종합 정리 — 던전 정복 완성

> **RL Dungeon — 멍청한 세르파 파티를 이끌고 던전을 답파하는 로그라이크**
>
> 15개 RL 알고리즘 캐릭터 / 31개 던전 / 로그라이크 경제 시스템 / UI/UX 폴리시 완료

Act 1 개발 기간: **2026-02-03 ~ 2026-02-25** (약 3주)

---

## 1. 개발 타임라인

| 날짜 | Phase | 내용 | 커밋 |
|------|-------|------|------|
| 02-03 | Phase 0~5 | 프로젝트 초기 설정, Gymnasium 환경, 웹 UI 기반 | 초기 커밋들 |
| 02-06 | Phase 6~8 | 이코노미, 전장의 안개, 던전 언락, 몬스터/HP, LfD | — |
| 02-10 | Phase 7~8 | Q-Table 저장, 모바일 터치, AI 시각화, 스카우트 | — |
| 02-13 | Phase 9~11 | 알고리즘 쇼케이스 6개, 던전 에디터, Multi-Stage | `5e8e380` |
| 02-14 | Phase 12 | 앙상블 시스템 (QV, ACLA, Ensemble BM) | — |
| 02-20 | Phase 13~14 | DQN 실험, Expected SARSA, Double Q, 확률적 전이 | — |
| 02-20 | Phase 15 | Tree Backup, Prioritized Sweeping, 절차적 던전 생성 | — |
| **02-22** | **리디자인 v3.0** | **세르파 세계관, 3막 구조, 이중 비용 시스템 설계** | `30d4714` |
| **02-22** | **Phase A~C** | **로그라이크 뼈대 + 경제 시스템 + UI 통합** | `debf02e`, `e4e9a4a` |
| **02-22** | **Phase E-1** | **밸런싱 시뮬레이터 (4전략, HP-aware BFS)** | `9540374` |
| 02-24 | 브라우저 테스트 | 전 시스템 인터랙티브 검증 + firstReward 버그 수정 | `137d511` |
| 02-25 | UI/UX 폴리시 | 토스트, 던전맵, 브리핑, 튜토리얼, 리소스 경고 | `f4534c8` |

---

## 2. RL 알고리즘 (15개)

세르파 = 각각 다른 RL 알고리즘으로 길을 찾는 캐릭터.

| 등급 | 캐릭터 | 알고리즘 | 고용비 | 운영비 기본 | 성격 |
|:----:|--------|---------|:------:|:---------:|------|
| 무료 | Q군 | Q-Learning | 무료 | 3G | 낙관적 멍청이 |
| 무료 | 사르사 | SARSA | 무료 | 3G | 겁쟁이 |
| 무료 | 몬테 | Monte Carlo | 무료 | 3G | 끝까지 가봐야 직성 |
| 일반 | 그래디 | REINFORCE | 200G | 2G | 감으로 찍는 싸구려 |
| 숙련 | 트레이서 | SARSA(λ) | 600G | 5G | 흔적 추적자 |
| 숙련 | 다이나 | Dyna-Q | 600G | 6G | 공상가 |
| 정예 | 크리틱 | Actor-Critic | 1,000G | 5G | 잔소리꾼 |
| 정예 | QV군 | QV-Learning | 1,000G | 5G | 이중인격 |
| 정예 | 아클라 | ACLA | 1,000G | 5G | 변덕쟁이 |
| 정예 | 에크사 | Expected SARSA | 1,000G | 5G | 계산기 |
| 정예 | 더블Q | Double Q-Learning | 1,000G | 5G | 의심쟁이 |
| 전설 | 앙상블 | Ensemble (BM) | 2,000G | 8G | 합의체 |
| 전설 | 트리백 | n-step Tree Backup | 2,000G | 7G | 선견자 |
| 전설 | 스위퍼 | Prioritized Sweeping | 2,000G | 7G | 효율주의자 |
| ~~미등장~~ | ~~스카우트~~ | ~~Local Q-Learning~~ | — | — | 코드만 보존 |

**DQN**: 실험 완료, UI 미등록. 소형 던전(15x15 이하)에서 tabular 대비 이점 없음. 50x50+ 전용으로 보류.

**운영비 공식**: `ceil(BASE_OP_COST * sqrt(level))`

---

## 3. 던전 구성 (31개, 7챕터)

| 챕터 | 이름 | 던전 레벨 | 합류 세르파 | 핵심 RL 개념 |
|:----:|------|:--------:|-----------|------------|
| 1 | 첫 발걸음 | Lv.1~3 | Q군 (스타터) | Q-Learning, 보상, 정책 |
| 2 | 위험한 길 | Lv.4~7 | 사르사 | On-policy, 안전 경로 |
| 3 | 넓은 세계 | Lv.8~12 | 몬테, 트레이서, 다이나 | MC, 적격 흔적, 모델 기반 |
| 4 | 직감과 비평 | Lv.13~17 | 그래디, 크리틱 | 정책 경사법, Actor-Critic |
| 5 | 합의의 힘 | Lv.18~25 | QV군, 아클라, 앙상블 | 앙상블 |
| 6 | 불확실한 바닥 | Lv.26~28 | 에크사, 더블Q | 확률적 환경, 과대추정 |
| 7 | 심연 | Lv.29~31 | 트리백, 스위퍼 | 대규모, 절차적 던전 |

던전 크기: 5×5 ~ 50×50. Lv.30~31은 절차적 생성(BSP + Cellular Automata).

---

## 4. 게임 시스템 구현 현황

### 4.1 코어 시스템 (Phase A)

- [x] **RunState**: 런 시작/리셋, Q-table 계승
- [x] **식량 시스템**: 1G = 1식량, 스텝당 1 소모, 고갈 시 사망
- [x] **게임 오버**: HP 0 또는 식량 고갈 → 런 리셋 (Q-table 유지)
- [x] **캐릭터 잠금/해금**: 챕터별 합류 + 골드 조기 고용
- [x] **localStorage 저장**: 자동 저장 + 버전 마이그레이션

### 4.2 경제 시스템 (Phase B/B+)

- [x] **이중 비용 구조**: 세르파 = 운영비(에피소드당), 파티장 = 식량(스텝당)
- [x] **지도 경제**: 판매(즉시 현금화) vs 보유(독점 안내 → 누출 → 일반)
- [x] **파밍**: 답파된 던전에 세르파 배치, 최적 경로 기반 수입
- [x] **스탯 & 업그레이드**: 근력/체력/민첩, 최대 Lv.3
- [x] **정보 구매**: 던전 힌트 (크기/위험/알고리즘 추천)
- [x] **시작 골드**: 800G

### 4.3 콘텐츠 시스템 (Phase C)

- [x] **챕터 진행**: 7챕터, 세르파 합류 이벤트
- [x] **던전 보물**: 1회성 수집, 실패 시 위치 변경
- [x] **아이템 인벤토리**: run-state.js에 구현 (사용 UI는 미구현)
- [x] **엔딩**: 전 던전 클리어 시 기록 공개
- [x] **NG+**: Q-table 유지 + 런 리셋으로 기록 도전

### 4.4 UI/UX 폴리시 (2026-02-25)

- [x] **토스트 알림**: 플로팅 알림 (max 3, 타입별 색상)
- [x] **리소스 경고**: HP 색상 바, 골드/식량 경고
- [x] **던전 맵**: 7챕터 노드맵 (잠금/해제/클리어/현재 표시)
- [x] **브리핑 오버레이**: 던전 정보 + 비용 + 보상 + 퀵 식량구매
- [x] **튜토리얼**: 5단계 컨텍스트 튜토리얼 + 프로그레시브 디스클로저

### 4.5 기반 시스템 (Phase 6~15)

- [x] **전장의 안개 (Fog of War)**: 부분 관찰
- [x] **수동 이동**: 키보드/터치 + 식량 소모
- [x] **Learning from Demonstration**: 수동 경로 → 세르파 학습 자료
- [x] **던전 에디터**: 타일 배치 + BFS 검증 + Quick Test
- [x] **Multi-Stage 던전**: 여러 스테이지 연결, HP 계승
- [x] **캔버스 렌더링**: 보물 다이아몬드, 안개, 몬스터 등

---

## 5. 밸런스 검증 결과

Phase E-1 시뮬레이터로 4전략 × 10회 자동 테스트:

| 전략 | 평균 클리어 | 턴 | Ch.3 | Ch.5 | Ch.7 |
|------|:---------:|:---:|:----:|:----:|:----:|
| StraightForward | 11.9/31 | 500 | 10/10 | 0/10 | 0/10 |
| BalancedPlayer | 17.4/31 | 500 | 10/10 | 4/10 | 0/10 |
| FarmHeavy | 23.7/31 | 500 | 10/10 | 9/10 | 0/10 |
| **HybridPlayer** | **29.5/31** | **368** | **10/10** | **10/10** | **7/10** |

### 핵심 발견

- 수동 플레이가 AI 학습 대비 ~100배 저렴 (1K food vs 100K gold)
- `level_12_hp_gauntlet`: 범용적 병목 (AI 다회 시도 필요)
- `level_13_cliff`: AI 수렴 불가 (pit 지형), 수동만 가능
- Ch.6 미끄러운 던전: 수동/AI 모두 어려움 (의도적 난이도)

### 맵 수정 내역

- `level_08_deadly`: P→T at (1,3) and (7,3)
- `level_10_final`: 3 wall openings at col 7 + monster guard
- `level_28_frozen_cliff`: 2-tile gap in pit wall
- `level_30_generated_cave`: 3 P→T replacements

---

## 6. 파일 구조

```
web/
  index.html              # 메인 UI (캔버스, 오버레이, 컨트롤)
  css/style.css           # 스타일 (~1900줄, 토스트/맵/브리핑/튜토리얼 포함)
  js/
    main.js               # 게임 코어 (~3100줄, UI+로직 통합 모놀리스)
    game/
      game-config.js      # 공유 상수 (CHARACTERS, DUNGEON_CONFIG 등)
      run-state.js        # 게임 상태 관리 (골드, 식량, 클리어, 파밍 등)
      grid.js             # 31개 던전 맵 + 로드
      agent.js            # RL 에이전트
      tiles.js            # 타일 정의
      renderer.js         # 캔버스 렌더링
      toast.js            # 토스트 알림 시스템
      dungeon-map.js      # 챕터별 시각적 던전 맵
      briefing.js         # 던전 진입 전 브리핑 오버레이
      tutorial.js         # 튜토리얼 + 프로그레시브 디스클로저
      qlearning.js        # Q-Learning (+ 14개 알고리즘 파일)
      ...
sim/
  simulator.js            # 헤드리스 시뮬레이터 + HP-aware BFS
  strategies.js           # 4개 전략 (StraightForward/Balanced/FarmHeavy/Hybrid)
  run-balance.js          # CLI: node sim/run-balance.js [runs] [strategy]
docs/
  GAME_LOOP_REDESIGN.md   # 게임 디자인 v3.0 (3막 구조, ~820줄)
  GDD.md                  # 원본 GDD
  ACT1_SUMMARY.md         # ← 이 문서
  NEXT_STEPS.md           # 다음 작업 핸드오프
  devlog/                 # 작업 기록
```

---

## 7. 알려진 이슈 & 기술 부채

| 항목 | 상태 | 상세 |
|------|------|------|
| 아이템 사용 UI | 미구현 | 인벤토리 로직 있으나 구매/사용 UI 없음 |
| NG+ 전환 UI | 미구현 | 로직은 있으나 UI 흐름 부족 |
| main.js 비대 | 기술 부채 | ~3100줄 모놀리스, Act 2 전 분리 권장 |
| Ch.6~7 돌파율 | 밸런스 | HybridPlayer 기준 Ch.7 = 7/10 |
| 시뮬레이터/main.js 동기화 | 기술 부채 | 일부 로직(firstReward 등)이 따로 구현됨 |

---

## 8. 설계 원칙

- **알고리즘 파일 15개는 절대 건드리지 않는다** — 논문 기반 구현
- **확률 요소는 알고리즘 정책 이외에 추가하지 않음**
- **게임 레이어만 위에 씌운다** — RL 코어와 게임 로직 분리
- **논문 기반 구현 원칙** — 시행착오 대신 원 논문의 실험 설정 먼저 확인

---

## 9. 다음 단계 (Act 2 이전)

| Option | 내용 | 비고 |
|--------|------|------|
| **A: Act 1 잔여 폴리시** | 아이템 UI, NG+ UI, 밸런스 미세조정 | 남은 것 마무리 |
| **B: Act 2 설계 & 프로토타입** | 던전 마스터 공방전 | 야심찬 선택 |
| **C: main.js 리팩토링** | 3100줄 모놀리스 → 모듈 분리 | Act 2 전 기술부채 해소 |

권장 순서: **C → B** (리팩토링 → Act 2)

---

## 10. 주요 커밋 히스토리

```
f4534c8 Add Act 1 UI/UX polish: toast, dungeon map, briefing, tutorial
137d511 Fix missing first clear gold reward in handleVictory
9540374 Add balance simulator with economy tuning and manual play simulation (Phase E-1)
af0e4be Add treasure diamond rendering on canvas
e4e9a4a Add economic systems, chapter progression, treasure, items, ending/NG+ (Phase B/B+/C)
debf02e Add roguelike skeleton: run system, character lock/unlock, food, game over (Phase A)
30d4714 Add game redesign document v3.0 with economic system overhaul
```

---

## 11. Notion 개발 로그 인덱스

### Phase 0~8: 기반 구축 (02-03 ~ 02-10)

1. RL Dungeon 개발 기록 (2026-02-03)
2. Phase 3 & 5 완료 - Gymnasium 환경 + 웹 UI (2026-02-03)
3. Phase 6 완료 - 게임 확장 (이코노미 + 전장의 안개) (2026-02-06)
4. 던전 언락 시스템 추가 (2026-02-06)
5. 몬스터 시스템 & HP-aware Q-Learning 성공! (2026-02-06)
6. Learning from Demonstration (LfD) 구현 (2026-02-06)
7. Q-Table 저장, 모바일 터치, AI 학습 시각화 (2026-02-10)
8. 스카우트 캐릭터 추가 (2026-02-10)

### Phase 9~12: 확장 (02-13 ~ 02-14)

9. Phase 9 완료 - 알고리즘 쇼케이스 6개 + 골드 소비 (2026-02-13)
10. Phase 10 완료 - 던전 에디터 (2026-02-14)
11. Quick Test 기능 추가 (2026-02-14)
12. Multi-Stage Dungeon 시스템 설계 (2026-02-14)
13. Multi-Stage Dungeon System 구현 완료 (Phase 11)
14. Phase 12 완료 - 앙상블 시스템 (QV, ACLA, Ensemble)

### Phase 13~15: 알고리즘 완성 (02-20)

15. Phase 13 — DQN 실험 (코드 완성, UI 미등록) (2026-02-20)
16. Phase 14 완료 — Expected SARSA, Double Q-Learning (2026-02-20)

### 리디자인 & 게임 시스템 (02-22 ~ 02-25)

17. 게임 리디자인 v3.0 — 경제 시스템 대폭 개편 (2026-02-22)
18. Phase E-1 완료 — 밸런싱 시뮬레이터 (2026-02-22)
19. 브라우저 인터랙티브 테스트 + firstReward 버그 수정 (2026-02-24)
20. Act 1 UI/UX Polish — 게임다운 인터페이스 개편 (2026-02-25)

---

*Document Version: 1.0*
*Last Updated: 2026-02-26*
