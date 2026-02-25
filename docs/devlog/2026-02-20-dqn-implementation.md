# DQN 구현 기록 (Phase 13)

**날짜**: 2026-02-20

## 개요

12번째 RL 알고리즘으로 DQN(Deep Q-Network)을 Vanilla JS로 구현. MLP + Backpropagation을 외부 라이브러리 없이 직접 작성. 상태 인코딩 방식에 대해 3차례 반복(정규화 좌표 → 원-핫 → 로컬 관측) 실험을 거쳐 최종 설계에 도달.

## 구현 파일

| 파일 | 역할 |
|------|------|
| `web/js/game/nn.js` | 재사용 MLP (He init, ReLU, gradient clipping, clone/copyFrom, JSON 직렬화) |
| `web/js/game/dqn.js` | DQN 알고리즘 (Experience Replay, Target Network, 로컬 관측 인코딩) |
| `web/js/main.js` | import + CHARACTERS + createAlgorithm 등록 |
| `web/index.html` | 캐릭터 카드 + Quick Test 드롭다운 |
| `test-dqn.mjs` | Node.js 테스트 (NN 단위, DQN 기능, 수렴, Q-Learning 비교) |

## 상태 인코딩 실험 기록

### 시도 1: 정규화 좌표 `[x/width, y/height]`

- **입력**: 2~3차원
- **결과**: Lv.1(5x5)만 통과, Lv.2(7x7)부터 0%
- **원인**: 좌표 간격이 너무 작아 신경망이 인접 셀을 구분 불가. (0.143, 0.143) vs (0.286, 0.143)이 "비슷한 입력"으로 처리됨.

### 시도 2: 원-핫 위치 인코딩 `[0,...,1,...,0]`

- **입력**: width×height 차원 (5x5=25, 9x9=81)
- **결과**: Lv.1~2 통과, Lv.3(9x9) 0%
- **원인**: 81 입력 → [128,64] → 4 = ~18,000 파라미터. 실제 학습할 Q값 ~120개에 비해 150배 과파라미터화. Deadly Triad로 학습 발산.
- **추가 시도**: TD에러 클리핑(Huber loss), 가중치 그래디언트 클리핑, 타겟 업데이트 빈도 조정 → 소형 던전에서 개선, 대형 던전에서 여전히 실패.

### 시도 3 (최종): 로컬 관측 + 위치 힌트

MiniGrid(Farama Foundation)의 에이전트 중심 부분 관측 방식 참조. Local Q-Learning(스카우트)의 관측 로직 재사용.

- **입력**: 70차원 고정 (그리드 크기 무관)
  - 8 이웃 타일 × 8 카테고리 원-핫 = 64
  - 골 방향 sin/cos = 2
  - 골 거리 정규화 = 1
  - HP 정규화 = 1
  - 위치 힌트 x/w, y/h = 2
- **네트워크**: [70, 64, 32, 4] ≈ 6,800 파라미터
- **결과**: 8개 던전 중 6개 100% 통과

## 최종 성능

| 던전 | Q-Learning | DQN |
|------|:---:|:---:|
| Lv.1 Tutorial (5x5) | 100% @50 | 100% @50 |
| Lv.2 First Trap (7x7) | 100% @50 | 100% @50 |
| Lv.3 Maze (9x9) | 100% @71 | 0% (미로 앨리어싱) |
| Lv.4 Pit Danger (7x7) | 100% @128 | 100% @136 |
| Lv.5 Gold Rush (9x9) | 100% @111 | 100% @488 |
| Lv.6 Risk & Reward (7x9) | 100% @344 | 100% @425 |
| Lv.7 Gauntlet (11x11) | 100% @162 | 100% @364 |
| Lv.8 Deadly (9x11) | 0% | 0% (둘 다 실패) |

## 주요 하이퍼파라미터

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| alpha | 0.001 | 학습률 (탭형 0.1의 1/100) |
| gamma | 0.99 | 할인율 |
| epsilonMin | 0.05 | 최소 탐색률 (0이면 발산) |
| epsilonDecay | 0.998 | 느린 감소 (0.995면 너무 빠름) |
| hiddenSizes | [64, 32] | MLP 은닉층 |
| batchSize | 32 | 미니배치 크기 |
| replayCapacity | 5000 | 리플레이 버퍼 (작을수록 안정) |
| targetUpdateFreq | 5 | 타겟 네트워크 동기화 주기 (에피소드) |
| trainEveryN | 4 | N 스텝마다 학습 |

## 핵심 안정화 기법

1. **TD 에러 클리핑 [-1, 1]**: Huber loss와 동등. Q값 발산 방지.
2. **가중치 그래디언트 클리핑 [-1, 1]**: `dW = dz * activation`도 클리핑.
3. **빈번한 타겟 업데이트 (5 에피소드)**: 100보다 5가 소규모 그리드에 적합.
4. **epsilonMin > 0 (0.05)**: 탐색 중단 시 피드백 루프로 발산.
5. **작은 리플레이 버퍼 (5000)**: 오래된 나쁜 경험이 빠르게 제거됨.

## 교훈 및 반성

### DQN은 소규모 그리드월드에서 탭형 대비 이점 없음

- Q-Learning: 0.0~0.2초에 100% 수렴
- DQN: 8~286초에 동일하거나 낮은 성능
- DQN이 빛나는 것은 Atari 같은 거대/연속 상태 공간

### 상태 인코딩이 신경망 RL의 핵심

- 같은 DQN 알고리즘이라도 입력 표현에 따라 1/7 통과 vs 6/7 통과
- 업계 표준(MiniGrid)은 에이전트 중심 부분 관측 사용 (7×7×3, 그리드 크기 무관)
- 원-핫 좌표 인코딩은 학술 예제에서만 사용되고, 실전에서는 관측 기반

### 논문 기반 구현의 중요성

시행착오로 3번 반복하며 상태 인코딩을 바꿈. 처음부터 DQN 논문(Mnih 2015)과 MiniGrid 문서를 참조했다면 1회 반복으로 끝났을 것. 향후 알고리즘 추가 시 반드시:
1. 원 논문의 실험 설정(상태 표현, 네트워크 구조, 하이퍼파라미터) 확인
2. 공개 구현체(GitHub, Farama) 참조
3. 논문 출처를 코드와 문서에 명시

## 참조 논문/자료

- Mnih et al. (2015) "Human-level control through deep reinforcement learning", Nature 518
- van Hasselt et al. (2016) "Deep Reinforcement Learning with Double Q-learning", AAAI
- Farama Foundation, MiniGrid: 7×7 egocentric partial observation (https://minigrid.farama.org/)
- Karpathy, REINFORCEjs: agent-relative sensor encoding (https://github.com/karpathy/reinforcejs)
- osushkov, DQN: one-hot > direct encoding (https://osushkov.github.io/deepq/)
