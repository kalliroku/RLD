# Phase 14 연구 결과: 알고리즘/맵 효용성 검토 및 확장 아이디어

**작성일**: 2026-02-20
**상태**: 연구 완료

---

## 1. 기존 11개 알고리즘 효용성 검토 결과

### 1.1 알고리즘별 최적 환경 및 논문 근거

| 알고리즘 | 최적 환경 | 약점 | 논문 근거 |
|---------|----------|------|----------|
| **Q-Learning** | 결정적/소규모, 위험 없는 환경 | 절벽 근처 과대추정, 50×50에서 성능 하락 | Watkins (1989), Sutton & Barto Ch.6 |
| **SARSA** | 절벽/위험 인접 경로, 확률적 환경 | 최적 경로 대신 안전 경로 학습 (ε>0일 때 의도적) | Rummery & Niranjan (1994) |
| **Monte Carlo** | 짧은 결정적 에피소드, **대규모에서 의외로 강함** | 미완료 에피소드 학습 불가, 높은 분산 | Sutton & Barto Ch.5 |
| **SARSA(λ)** | 지연 보상, 긴 복도, 희소 보상 | λ 튜닝 필요, 대규모에서 메모리 부담 | Sutton & Barto Ch.12 |
| **Dyna-Q** | 넓은 개방 공간, 결정적 전이 | 환경 변화 시 stale model, 확률적 환경에서 약함 | Sutton (1991) |
| **REINFORCE** | 확률적 정책이 필요한 경우 (교육적 가치) | tabular에서 TD보다 느림, 높은 분산 | Williams (1992) |
| **Actor-Critic** | REINFORCE보다 빠른 수렴 필요 시 | 복잡한 구현, 소규모에서 Q-Learning 대비 이점 적음 | Barto, Sutton & Anderson (1983) |
| **Local Q-Learning** | 던전 간 전이 학습, 미지의 던전 | 5×5 지역 관측으로 전역 구조 파악 불가 | MiniGrid ego-centric 참조 |
| **QV-Learning** | 단일 알고리즘 중 평균 최고 성능 | V-table 추가 메모리 | Wiering & van Hasselt (2008) |
| **ACLA** | 빠른 정책 전환 필요 시 | 이진 업데이트로 미세 조정 어려움 | Wiering & van Hasselt (2008) |
| **Ensemble (BM)** | 다양한 미로, 부분 관측 환경, **단일 알고리즘이 실패하는 경우** | 계산 비용 5배, veto 효과 주의 | Wiering & van Hasselt (2008) |

### 1.2 50×50 벤치마크 순위 (TDS Benchmarking Study)

```
1위: Value Iteration (모델 필요)
2위: On-policy Monte Carlo ← 의외의 강자!
3위: Dyna-Q
4위: Q-Learning
5위: SARSA-n (최하위)
```

**핵심 발견**: MC가 대규모에서 강한 이유는 편향 없는 실제 리턴 사용 때문. Bootstrapping의 오차가 대규모 상태 공간에서 누적되는 것으로 추정.

### 1.3 결론

현재 11개 알고리즘 세트는 **논문적으로 잘 정당화됨**:
- Wiering & van Hasselt (2008)이 "단일 알고리즘은 모든 문제에서 우세하지 않다"를 명시적으로 증명
- Q-Learning vs SARSA의 on/off-policy 차이는 절벽 던전에서 가시적으로 확인됨
- REINFORCE는 tabular에서 약하지만 Actor-Critic으로 가는 교육적 디딤돌로서 가치 있음
- Ensemble(BM)이 단일 알고리즘 대비 총합 학습 성능에서 유의미하게 우수

---

## 2. 기존 25개 던전 맵 벤치마크 검토

### 2.1 표준 RL 벤치마크 환경 대비 커버리지

| 표준 환경 | 핵심 테스트 속성 | RLD 커버 여부 | 해당 던전 |
|----------|----------------|:---:|----------|
| **CliffWalking** | on-policy 안전성 | ✅ | Lv.13, Lv.19, Lv.20 |
| **WindyGridworld** | 확률적 전이 (바람) | ❌ | 미구현 |
| **FrozenLake** | 미끄러운 바닥 (stochastic) | ❌ | 미구현 |
| **MiniGrid Empty** | 기본 탐색 | ✅ | Lv.01, Lv.16 |
| **MiniGrid FourRooms** | 다중 방 탐색 | ✅ | Lv.15 |
| **MiniGrid DoorKey** | 열쇠-문 퍼즐 | ❌ | GDD에 설계만, 미구현 |
| **MiniGrid LavaGap** | 위험 회피 탐색 | ✅ | Lv.04, Lv.19 |
| **MiniGrid MultiRoom** | 점진적 복잡성 | ✅ | 멀티스테이지 시스템 |
| **AI Safety Gridworlds** | 부작용, 보상 해킹 | ❌ | 미구현 |
| **Sutton Dyna Maze** | 모델 기반 계획 | ✅ | Lv.16, Lv.21 |
| **Wiering Paper Maze** | 앙상블 벤치마크 | ✅ | Lv.24, Lv.25 |

### 2.2 누락된 핵심 환경 패턴

1. **확률적 전이 (Stochastic Transitions)** 🔴 높음
   - WindyGridworld: 행동 결과에 랜덤 바람 추가 (Sutton & Barto 7×10)
   - FrozenLake: 미끄러운 바닥, 의도한 방향 1/3 확률 (Gymnasium 4×4, 8×8)
   - **영향**: Expected SARSA, Double Q-Learning의 이점이 드러나는 환경
   - 현재 RLD의 모든 전이가 결정적 → 확률적 전이 없이는 이 알고리즘들의 장점 시연 불가

2. **동적 장애물 (Dynamic Obstacles)** 🟡 중간
   - MiniGrid DynamicObstacles: 움직이는 장애물 (5×5~16×16)
   - **영향**: 반응적 계획, 정적 Q-table로는 최적 대응 어려움

3. **기억 의존 과제 (Memory)** 🟡 중간
   - MiniGrid Memory: 초반에 관찰한 정보를 나중에 사용 (11×11~17×17)
   - **영향**: 시간적 기억, 부분 관측 환경의 핵심 도전

4. **분포 이동 (Distribution Shift)** 🟡 중간
   - MiniGrid DistShift: 훈련 환경과 테스트 환경이 다름
   - AI Safety Gridworlds: Lava World에서 용암 위치가 테스트 시 변경
   - **영향**: 일반화 능력 평가 (Local Q-Learning의 강점이 드러남)

5. **열쇠-문 퍼즐 (Key-Door)** 🟡 중간
   - MiniGrid DoorKey (5×5~16×16), KeyCorridor, LockedRoom
   - **영향**: 상태 공간 확장 (인벤토리), 순차적 추론 테스트

6. **안전 탐험 (Safe Exploration)** 🟢 낮음
   - AI Safety Gridworlds 10종: 부작용 방지, 보상 해킹, 안전 중단 등 (모두 ≤10×10)
   - **영향**: 안전한 RL의 교육적 가치는 높지만 현재 게임 구조와 맞지 않음

7. **변화하는 환경 (Non-Stationary)** 🟢 낮음
   - Dyna-Q+ 테스트용: 일정 에피소드 후 벽/경로 변경
   - **영향**: Dyna-Q의 stale model 문제 시연

### 2.3 MiniGrid 핵심 설계 특성 (참고)

MiniGrid 환경의 주요 설계 원칙:
- **부분 관측**: 에이전트가 7×7 ego-centric 뷰만 관찰 (RLD의 Fog of War와 유사)
- **보상**: `1 - 0.9 × (step_count / max_steps)` — 효율성 장려
- **난이도 스케일링**: 그리드 크기 파라미터(S)로 난이도 조절
- **표준 크기**: 5×5 ~ 16×16 (tabular 한계선)

### 2.4 RL 벤치마크 환경 분류 체계

| 속성 축 | 테스트 대상 | RLD 커버 여부 |
|---------|-----------|:---:|
| 결정적 vs 확률적 | 불확실성 하 계획 | 결정적만 ✅ |
| 완전 관측 vs 부분 관측 | 기억, 신념 추적 | 완전 관측 ✅ (Fog of War 있음) |
| 밀집 vs 희소 보상 | 탐험 효율성 | 밀집 ✅ (스텝 페널티) |
| 단일 vs 다중 목표 | 과제 복잡성 | 부분적 ✅ (골드 수집) |
| 정적 vs 동적 | 반응적 계획 | 정적만 ✅ |
| 안전 vs 위험 행동 | 제약 탐험 | 부분적 ✅ (구덩이/함정) |
| 고정 vs 절차적 레이아웃 | 일반화 능력 | 고정만 ✅ |
| 위험-보상 트레이드오프 | 보수적 vs 최적 정책 | ✅ (절벽 던전) |

### 2.3 던전 크기 분포 분석

```
현재:   5×5 ──────── 15×15 ──── 19×12
        ████████████████████████████
        [소규모]     [중규모]

필요:                    25×25 ─── 50×50 ─── 100×100
                         ████████████████████████████
                         [대규모]   [초대규모]
```

**현재 최대**: 19×12 = 228 타일 (Lv.21 Desert Crossing)
**논문 기준**: 대부분 5×5 ~ 25×25 사용, 50×50에서 스케일링 테스트

### 2.4 결론

- 현재 25개 던전은 **결정적 환경**을 잘 커버하지만 **확률적 전이** 환경이 완전히 누락
- 크기 분포가 19×12까지로 제한되어 **대규모 스케일링 테스트** 불가
- 알고리즘 쇼케이스 던전은 교육적으로 잘 설계됨

---

## 3. 새 알고리즘 후보 평가

### 3.1 즉시 추가 추천 (Tabular, 현재 시스템 호환)

#### 🥇 Expected SARSA (최우선)
- **출처**: van Seijen et al. (2009) "A Theoretical and Empirical Analysis of Expected Sarsa"
- **구현 난이도**: 최소 — SARSA에서 1줄 변경 (`Q(s',a')` → `Σ_a π(a|s') × Q(s',a)`)
- **장점**: Q-Learning과 SARSA를 모두 포함하는 일반화. 분산 0 업데이트. 에피소드 10-20에서 안정화.
- **논문 결론**: "약간의 추가 계산 비용을 제외하면, Expected SARSA가 Q-learning과 SARSA를 모두 지배할 수 있다"
- **쇼케이스 맵**: 확률적 전이 환경 (새로 만들어야 함)

#### 🥈 Double Q-Learning
- **출처**: van Hasselt (2010) NeurIPS, "Double Q-learning"
- **구현 난이도**: 중간 — Q-table 2개, 교대 업데이트
- **장점**: 확률적 환경에서 과대추정 편향 해결. "최초의 양의 편향 없는 off-policy 알고리즘"
- **쇼케이스 맵**: 확률적 보상 환경

#### 🥉 n-step Tree Backup
- **출처**: Sutton & Barto Ch.7
- **구현 난이도**: 중간~높음
- **장점**: TDS 벤치마킹 연구에서 **tabular 전체 1위**. on-policy + off-policy 장점 결합.
- **쇼케이스 맵**: 범용 (모든 환경에서 강함)

#### 4위: Prioritized Sweeping
- **출처**: Moore & Atkeson (1993)
- **구현 난이도**: 중간 — 우선순위 큐 + 모델 (Dyna-Q 유사)
- **장점**: Dyna-Q보다 빠름. 0-value 업데이트 낭비 없음. 희소 보상에 적합.
- **쇼케이스 맵**: 대규모 미로

### 3.2 향후 추가 고려 (Neural, 대규모용)

| 알고리즘 | 시점 | 조건 |
|---------|------|------|
| DQN (재활성화) | 50×50+ 맵 추가 시 | 로컬 관측 윈도우 사용 |
| PPO | Neural 계층 확장 시 | 안정적 policy gradient |
| A2C | Neural 계층 확장 시 | Actor-Critic의 신경망 확장 |

### 3.3 추가하지 않을 알고리즘

- **R-Learning**: 평균 보상 기반. 우리 던전은 에피소딕이라 부적합. 탐험 전략에 극히 민감.

---

## 4. 대규모 그리드월드 스케일링 분석

### 4.1 Tabular vs Neural 교차점

```
그리드 크기    상태 수     Tabular 상태          Neural 필요성
─────────────────────────────────────────────────────────
5×5           25          ✅ 완벽               불필요
10×10         100         ✅ 완벽               불필요
15×15         225         ✅ 완벽               불필요
20×20         400         ✅ 양호               불필요
25×25         625         ✅ 느려짐 시작         선택적
50×50         2,500       ⚠️ 느림               권장
100×100       10,000      ❌ 비실용적            필수
```

- **25×25 이하**: Tabular이 엄격히 우수 (단순, 빠름, 수렴 보장)
- **25×25 ~ 50×50**: Tabular 가능하지만 느림. DQN + 로컬 관측이 대등하거나 약간 우수
- **50×50 이상**: 함수 근사 점점 유리
- **100×100 이상**: 함수 근사 사실상 필수

### 4.2 대규모 맵 상태 표현

| 표현 방식 | 상태 공간 | 일반화 | 추천 용도 |
|----------|----------|--------|----------|
| 절대 좌표 (x,y) | N² | 없음 | 소규모 tabular |
| One-hot | N² 차원 | 없음 | 소규모 DQN |
| 정규화 좌표 (x/W, y/H) | 2 연속값 | 이론상 우수, 실제 실패 | ❌ (Phase 13에서 확인) |
| **로컬 관측 윈도우** | (2k+1)² × 타일종류 | **우수** | ✅ 대규모 최적 |
| 전체 그리드 이미지 (CNN) | W×H×C | CNN으로 우수 | 매우 대규모 |

### 4.3 대규모 던전 제안

**Tier 1: 25×25 (tabular 스케일링 테스트)**
- 탭형 알고리즘들의 수렴 속도 비교
- MC, Dyna-Q가 Q-Learning보다 유리해지는 시점 시연

**Tier 2: 50×50 (tabular ↔ neural 교차)**
- DQN 재활성화 시점
- 로컬 관측 + DQN vs 절대 좌표 + tabular 비교

---

## 5. 절차적 던전 생성 (비정방형 던전)

### 5.1 핵심 발견: 기존 그리드 시스템으로 충분

모든 절차적 생성 방법은 **직사각형 그리드에 벽(#) 배치**로 불규칙 공간을 표현. 그리드 시스템 자체 확장 불필요.

### 5.2 생성 알고리즘 비교

| 방법 | 결과물 | 장점 | 단점 | 추천도 |
|------|--------|------|------|:------:|
| **BSP Tree** | 구조적 방+복도 | 겹침 없음, 전부 연결 | 직선적, 반복감 | ⭐⭐⭐⭐ |
| **Cellular Automata** | 유기적 동굴 | 자연스러움, 구현 간단 | 단절 가능 (후처리 필요) | ⭐⭐⭐⭐ |
| **Drunkard's Walk** | 유기적 통로 | 연결 보장, 초간단 | 비일관적, 방 구조 없음 | ⭐⭐⭐ |
| **WFC** | 고품질 타일 기반 | 미적으로 우수 | 규칙 정의 복잡, 실패 가능 | ⭐⭐ |

### 5.3 추천: 하이브리드 접근

```
1. BSP Tree로 대구조 분할 (방 영역 결정)
2. Cellular Automata로 각 방 내부를 유기적 형태로 (L자, T자 등)
3. Drunkard's Walk로 방 사이 구불구불한 복도 연결
4. 던전 요소 배치 (S, G, T, M, $, H) — 거리 기반 규칙
```

**BSP 파라미터**: `N_ITERATIONS=4~9`, `H_RATIO/W_RATIO=0.45`, 방 패딩 0~1/3
**CA 파라미터**: 초기 밀도 45%, birth≥5, survival≥4, 반복 4~12회
**그리드 크기**: 30×30 ~ 50×50 (BSP + CA), 40×40+ (순수 CA)

---

## 6. 액션 아이템 요약

### 즉시 구현 (Phase 14)

| 우선순위 | 항목 | 난이도 | 비고 |
|:--------:|------|:------:|------|
| 1 | Expected SARSA 추가 | 쉬움 | SARSA 1줄 변경 |
| 2 | Double Q-Learning 추가 | 중간 | Q-table 2개 |
| 3 | 확률적 전이 환경 (WindyGridworld, FrozenLake) | 중간 | 새 타일 또는 환경 속성 |
| 4 | 25×25 대규모 미로 | 쉬움 | 수동 또는 간단한 생성기 |

### 중기 구현 (Phase 15+)

| 항목 | 난이도 | 비고 |
|------|:------:|------|
| n-step Tree Backup | 중간~높음 | 벤치마크 1위 알고리즘 |
| Prioritized Sweeping | 중간 | Dyna-Q 개선 |
| BSP + CA 절차적 생성 | 높음 | 비정방형 던전 |
| 50×50 던전 + DQN 재활성화 | 높음 | tabular-neural 교차점 시연 |

### 문서 업데이트

- [x] 연구 결과 devlog 작성 (이 문서)
- [ ] GDD.md 알고리즘 섹션 업데이트 (논문 근거, 새 알고리즘)
- [ ] README.md 참고 자료 확장
- [ ] Notion devlog 포스트

---

## 7. 참고 자료

### 논문
- Watkins & Dayan (1992) "Q-learning", Machine Learning
- Rummery & Niranjan (1994) "On-line Q-learning using connectionist systems"
- van Seijen et al. (2009) "A Theoretical and Empirical Analysis of Expected Sarsa"
- van Hasselt (2010) "Double Q-learning", NeurIPS
- Moore & Atkeson (1993) "Prioritized Sweeping", Machine Learning
- Sutton (1991) "Dyna, an integrated architecture for learning, planning, and reacting"
- Williams (1992) "Simple statistical gradient-following algorithms for connectionist RL"
- Wiering & van Hasselt (2008) "Ensemble Algorithms in RL", IEEE TSMCB
- Mnih et al. (2015) "Human-level control through deep RL", Nature

### 벤치마킹 연구
- "Benchmarking Tabular RL Algorithms" (TDS, Oliver S, 2025) — 25×25까지 체계적 비교
- "Revisiting Benchmarking of Tabular RL Methods" (TDS) — n-step Tree Backup 1위

### 절차적 생성
- BSP Dungeon Generation (eskerda.com)
- Cellular Automata Cave Generation (jrheard)
- Procedural Dungeon Generator (Future Data Lab)

### 표준 벤치마크 환경
- Gymnasium: CliffWalking, WindyGridworld, FrozenLake
- MiniGrid (Farama): Empty, FourRooms, DoorKey, LavaGap, MultiRoom
- AI Safety Gridworlds (DeepMind, 2017)
