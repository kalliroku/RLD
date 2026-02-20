# Phase 14 연구 계획: 알고리즘/맵 효용성 검토 및 확장 아이디어

**작성일**: 2026-02-20
**상태**: 다음 세션에서 진행 예정

---

## 배경

Phase 13 DQN 실험에서 시행착오 기반 접근의 비효율성을 체감.
앞으로는 **논문 기반 구현 원칙**을 준수하며, 기존 구현의 효용성도 논문으로 검증한다.

---

## 1. 기존 알고리즘 효용성 검토

현재 구현된 11개 tabular 알고리즘 각각에 대해 논문/벤치마크 데이터를 수집.

| 알고리즘 | 현재 참조 | 검토 필요 사항 |
|---------|----------|--------------|
| Q-Learning | Watkins (1989) | 수렴 보장 조건, 소규모 vs 대규모 그리드 비교 |
| SARSA | Rummery & Niranjan (1994) | on-policy 장점이 드러나는 환경 조건 |
| Monte Carlo | Sutton & Barto (2018) | first-visit vs every-visit 차이, 적합한 환경 |
| SARSA(λ) | Sutton & Barto (2018) | eligibility trace의 실질적 효과, λ 최적값 |
| Dyna-Q | Sutton (1991) | 모델 기반의 이점이 드러나는 환경 크기/구조 |
| REINFORCE | Williams (1992) | policy gradient가 tabular에서 의미 있는 경우 |
| Actor-Critic | Barto, Sutton & Anderson (1983) | tabular AC의 장단점 |
| Local Q-Learning | (자체 설계) | MiniGrid 논문에서 유사 접근 찾기 |
| QV-Learning | Wiering & van Hasselt (2008) | 논문 내 실험 환경과 우리 환경 비교 |
| ACLA | Wiering & van Hasselt (2008) | 동상 |
| Ensemble | Wiering & van Hasselt (2008) | Boltzmann Multiplication 효과 재검증 |

### 검토 질문
- 각 알고리즘이 **어떤 종류의 환경**에서 비교우위를 갖는가?
- 우리 던전 구조(함정, 몬스터, 골드, 다층)에서 차이가 실제로 드러나는가?
- 논문에서 사용한 그리드월드 크기/구조는 어떤가?

---

## 2. 기존 맵(던전) 설계 검토

현재 25개 던전이 RL 벤치마크로서 적절한지 검증.

### 비교 대상 표준 환경
- **Sutton & Barto**: CliffWalking, WindyGridworld, FrozenLake
- **MiniGrid (Farama)**: Empty, FourRooms, DoorKey, LavaGap, MultiRoom
- **Wiering & van Hasselt (2008)**: 논문 내 실험용 미로
- **DeepMind Lab / AI Safety Gridworlds**: 안전성 벤치마크 환경

### 검토 질문
- 우리 던전들이 이 표준 환경들의 특성을 얼마나 커버하는가?
- 빠진 중요한 환경 패턴이 있는가? (예: stochastic wind, slippery floor, multi-goal)
- 난이도 곡선이 교육적으로 적절한가?

---

## 3. 새로운 맵 아이디어

### 소규모 (테스트/교육용, 현재 포맷)
- 기존 논문 벤치마크를 던전 테마로 변환
- 알고리즘 간 차이가 극적으로 드러나는 특수 환경

### 대규모 (도전/확장용)
- **20×20 이상의 대형 미로**: tabular 알고리즘의 스케일링 한계 테스트
- **30×30+ 오픈월드형**: DQN 등 함수 근사 알고리즘이 빛나는 크기
- **절차적 생성(Procedural Generation)**: 매번 다른 레이아웃으로 일반화 능력 테스트
- 대규모 던전에서 tabular vs neural 알고리즘의 교차점(crossover point) 찾기

### 비정방형 던전 (디아블로 스타일)
- **불규칙한 형태의 방**: 직사각형이 아닌 L자, T자, 원형 등 다양한 방 형태
- **복도 연결 구조**: 방과 방 사이를 좁은 복도로 연결하는 Rogue-like 레이아웃
- **다중 경로**: 여러 갈래로 분기하는 탐험 구조 (디아블로 Act 1~4 같은 느낌)
- **절차적 던전 생성**: BSP Tree, Cellular Automata, Drunkard's Walk 등
- 비정방형 그리드에서 벽(#) 배치로 불규칙 공간을 표현 가능한지, 아니면 그리드 시스템 자체를 확장해야 하는지 검토 필요

### 검토 질문
- 몇 ×몇 부터 tabular가 한계를 보이는가? (논문 데이터)
- 대규모 그리드월드에서 주로 사용되는 상태 표현은?
- 절차적 생성 시 일반화를 어떻게 평가하는가?

---

## 4. 새 알고리즘 후보

### Tabular 우선 (현재 포맷에 즉시 적용 가능)
- **Double Q-Learning** (van Hasselt, 2010): maximization bias 해결
- **Expected SARSA** (van Seijen et al., 2009): SARSA의 변형, 분산 감소
- **Prioritized Sweeping** (Moore & Atkeson, 1993): Dyna-Q 개선
- **R-Learning** (Schwartz, 1993): average reward 기반

### Neural 계열 (대규모 던전 확장 시)
- **DQN 재활성화**: 대규모 맵에서 tabular 대비 이점 확인
- **PPO** (Schulman et al., 2017): 안정적 policy gradient
- **A2C**: Actor-Critic의 신경망 확장

---

## 5. 문서 업데이트 계획

연구 결과를 아래 문서들에 반영:
- `docs/GDD.md`: 알고리즘별 논문 출처, 적합 환경, 맵 설계 근거
- `README.md`: 참고 자료 섹션 확장
- Notion devlog: 연구 결과 요약 포스트
- 각 알고리즘 소스 파일: 상단 주석에 논문 출처 추가

---

## 참고 키워드 (웹 검색용)

- "gridworld reinforcement learning benchmark comparison"
- "tabular RL algorithm comparison gridworld"
- "MiniGrid environment design"
- "reinforcement learning maze scalability"
- "Wiering van Hasselt 2008 ensemble gridworld results"
- "procedural generation reinforcement learning gridworld"
- "large scale gridworld reinforcement learning"
- "when does DQN outperform tabular Q-learning gridworld size"
