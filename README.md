# RL Dungeon (강화학습 던전)

**알고리즘이 곧 캐릭터인 시드 기반 로그라이크 — 매 런 다른 모디파이어 아래 한정된 세르파 풀로 던전을 답파한다. RL 교육은 부산물.**

> 출시 1.0 그림: [docs/PM/VISION.md](docs/PM/VISION.md)

## 핵심 컨셉

- **시드 기반 런**: 매 런 다른 모디파이어 (미끄러운 바닥 / 안개 짙음 / 두 명만 등) 가 적용. 데일리 시드는 모든 플레이어가 공유 — 10분 챌린지의 토대
- **알고리즘 = 캐릭터**: 15종 RL 알고리즘이 각기 다른 성격의 세르파로 등장. 학명은 hover 툴팁, 표면은 "낙관적 멍청이 / 겁쟁이 / 공상가" 같은 성격 태그
- **시각적 RL 양념**: Q-value 히트맵 + 정책 화살표 + sparkline 디폴트 ON — 학습이 *눈에 보이는* 시각 시그니처. RL 교육 자체는 게임 목적이 아닌 부산물

## 현재 진행 상황

| Milestone | 내용 | 상태 |
|-----------|------|------|
| Phase 0~15 | 알고리즘 15종 + 27 던전 + 던전 에디터 + 절차적 생성 (50×50) + LfD + Q-Table 저장 | ✅ 완료 |
| M1 | 정체성 그림 그리기 (3축 비판 + RL 포지셔닝 디베이트) | ✅ 완료 |
| M2 | P0 4건 (정체성 카피 통일 + 가차 컷 + Step-0 진입 모드) | ✅ 완료 |
| M3 | T2B 본진 — 시드 기반 일일 챌린지 + 모디파이어 MVP 3종 + 알고리즘=캐릭터 | ✅ 완료 (alpha) |
| M4 | 모바일 fit + 사망 페널티 (DEATH_LIMIT=4) + 모디파이어 12종 (환경 6 + 제약 6) | ✅ 완료 (beta) |
| M5 | 한영 i18n (1차 ✅ + 2차 ✅, 222키) → 출시 페이지 + BGM + 플레이테스트 → 1.0 | ⏳ 진행 중 |

자세한 그림: [docs/PM/VISION.md](docs/PM/VISION.md). 사이클별 인계: [docs/PM/handoffs/](docs/PM/handoffs/).

## 설치

```bash
# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 패키지 설치
pip install -r requirements.txt
```

## 실행

### 직접 플레이
```bash
python play_game.py
```
- 방향키: 이동
- R: 리셋
- ESC: 종료

### AI 학습 (Q-Learning)
```bash
python train_agent.py [던전파일] [에피소드수]

# 예시
python train_agent.py assets/dungeons/level_01_easy.txt 500
```

### 던전 뷰어
```bash
python run_viewer.py [던전파일]
```

### Gymnasium 환경 데모
```bash
python run_gym_env.py
```

### 웹 버전 (브라우저)
```bash
cd web
python -m http.server 8080
# http://localhost:8080/          → 랜딩 페이지 (소개)
# http://localhost:8080/play.html → 게임 본체
```
- 방향키/WASD: 이동 (모바일: 스와이프 또는 D-pad)
- AI Training: 시각적 학습 (1x/2x/3x 속도) 또는 Instant 모드
- Until Success: 95% 성공률 도달 시 자동 종료
- Continuous: Stop 버튼으로 수동 정지 (최대 10,000 에피소드)
- Q-Table 자동 저장/복원 (새로고침해도 학습 데이터 유지)
- Show Q-Values/Policy: 학습 시각화
- Fog of War: 전장의 안개 토글

### 웹 호스팅 (출시 1.0)
- github pages — `kalliroku.github.io/RLD/` (예정)
- itch.io — `kalliroku.itch.io/rld` (예정, 무료 + pay-what-you-want)

## 샘플 던전

```
assets/dungeons/
├── level_01_easy.txt   # 5x5 기본
├── level_02_trap.txt   # 7x7 함정+회복
└── level_03_maze.txt   # 9x9 미로
```

### 타일 종류
| 문자 | 타일 | 효과 |
|-----|------|------|
| `.` | 빈 칸 | 이동 가능 |
| `#` | 벽 | 이동 불가 |
| `S` | 시작점 | 스폰 위치 |
| `G` | 목표 | 클리어 (+100) |
| `T` | 함정 | HP -10 |
| `H` | 회복 | HP +10 |
| `P` | 구덩이 | 즉사 |
| `$` | 골드 | +10 보상 |
| `M` | 몬스터 | HP -30, 처치 시 +5G |

## 프로젝트 구조

```
RLD/
├── src/
│   ├── core/           # 타일, 그리드
│   ├── agents/         # 에이전트 (모험가)
│   ├── algorithms/     # RL 알고리즘 (Q-Learning)
│   └── ui/             # Pygame 렌더러
├── web/
│   ├── index.html      # 랜딩 페이지 (마케팅, 출시 1.0 진입점)
│   ├── play.html       # 게임 본체 (캠페인 + 데일리 + 에디터 + 데브)
│   ├── css/
│   │   ├── style.css    # 게임 UI 스타일
│   │   └── landing.css  # 랜딩 페이지 스타일
│   └── js/
│       ├── main.js     # 게임 엔트리포인트
│       ├── i18n/       # 한영 사전 (ko/en 222키) + loader
│       └── game/       # 그리드, 에이전트, 15개 RL 알고리즘 + DQN(실험), 모디파이어, 렌더러, 에디터, 사운드, 절차적 생성기
├── assets/
│   └── dungeons/       # 던전 파일들 (3개, 나머지 28개는 grid.js 하드코딩)
├── tests/
├── docs/
│   ├── GDD.md          # 게임 디자인 문서
│   └── TASK_BREAKDOWN.md  # 세부 작업 계획
├── play_game.py        # Pygame 직접 플레이
├── train_agent.py      # Pygame AI 학습
└── run_viewer.py       # 던전 뷰어
```

## Q-Learning 결과 예시

```
=== level_01_easy.txt (5x5) ===
학습: 500 에피소드
성공률: 100%
평균 스텝: 4.0 (최단 경로)

학습된 정책:
# # # # #
# v v v #
# v v v #
# > > G #
# # # # #
```

## 기술 스택

- **Python 3.10+**
- **Gymnasium**: RL 환경
- **NumPy**: 수치 연산
- **Pygame**: 게임 렌더링
- **Matplotlib**: 학습 시각화

## 주요 기능

- **27개 던전**: 튜토리얼부터 논문 벤치마크, 확률적 전이 환경, 50×50 절차적 생성 던전까지 (B-103 Ch.5 축소 후, Lv.20~23 은 grid.js 보존 자산)
- **골드 이코노미**: 던전 입장비, 클리어 보상, 몬스터 처치 보상
- **던전 언락**: 이전 던전 클리어 시 다음 던전 해금
- **전장의 안개**: 방문한 칸만 보이는 탐험 시스템
- **몬스터 시스템**: HP 데미지 + 처치 보상
- **HP-aware Q-Learning**: HP 상태를 고려한 학습
- **Learning from Demonstration**: 유저 플레이로 AI 학습 가속
- **Q-Table 저장/복원**: localStorage로 학습 데이터 보존
- **모바일 터치 컨트롤**: 스와이프 + D-pad
- **AI 학습 시각화**: 4단계 속도로 학습 과정 실시간 관찰
- **8비트 사운드**: Web Audio API 기반 효과음
- **15개 RL 알고리즘**: Q-Learning, SARSA, Monte Carlo, SARSA(λ), Dyna-Q, REINFORCE, Actor-Critic, Local Q-Learning, QV-Learning, ACLA, Ensemble, Expected SARSA, Double Q-Learning, n-step Tree Backup, Prioritized Sweeping
- **확률적 전이 환경**: FrozenLake 스타일 미끄러운 바닥 (Slippery) 지원
- **앙상블 시스템**: Boltzmann Multiplication으로 5개 알고리즘 결합 (Wiering & van Hasselt, 2008)
- **멀티스테이지 던전**: 여러 층을 묶어 하나의 던전으로 구성, HP 계승, 골드 보류
- **던전 에디터**: 브라우저 내 타일 배치, BFS 검증, 저장/불러오기, 커스텀 던전 AI 훈련
- **절차적 던전 생성**: BSP + Cellular Automata 하이브리드로 50×50 대규모 던전 생성

## 향후 계획

1. **M5 → 1.0 (현재)**: 출시 페이지 prep + BGM 4트랙 + 자체 플레이테스트 5회 + i18n 미터치 영역 (briefing 영문 라벨 / editor / dungeon options / hints)
2. **Act 2 (출시 후)**: 던전 마스터 모드 — 커스텀 던전 공유 + Weekly·이벤트 시드
3. **Neural 알고리즘 (출시 후)**: DQN 재활성화 (50×50+), PPO, A2C
4. **리더보드 (수요 측정 후)**: 백엔드 도입 검토 (V1.0 은 무백엔드)

## 참고 자료 / 논문 출처

**강의 자료**
- [DeepMind RL Course (David Silver)](https://www.deepmind.com/learning-resources/introduction-to-reinforcement-learning-with-david-silver) — Q-Learning, SARSA, MC, SARSA(λ), Dyna-Q, REINFORCE, Actor-Critic
- [Hugging Face Deep RL Course](https://huggingface.co/learn/deep-rl-course/unit0/introduction)
- [Gymnasium Documentation](https://gymnasium.farama.org/)
- [Sutton & Barto (2018) "Reinforcement Learning: An Introduction" 2nd ed.](http://incompleteideas.net/book/the-book-2nd.html)

**논문 — 현재 구현**
- Watkins & Dayan (1992) "Q-learning", Machine Learning — Q-Learning
- Rummery & Niranjan (1994) "On-line Q-learning using connectionist systems" — SARSA
- Sutton (1991) "Dyna, an integrated architecture for learning, planning, and reacting" — Dyna-Q
- Williams (1992) "Simple statistical gradient-following algorithms for connectionist RL" — REINFORCE
- Barto, Sutton & Anderson (1983) "Neuronlike adaptive elements..." — Actor-Critic
- Wiering & van Hasselt (2008) "Ensemble Algorithms in Reinforcement Learning", IEEE TSMCB — QV-Learning, ACLA, Ensemble (Boltzmann Multiplication)
- Mnih et al. (2015) "Human-level control through deep reinforcement learning", Nature 518 — DQN (실험적)
- Farama Foundation, MiniGrid — 로컬 관측(egocentric partial observation) 상태 인코딩 참조

**논문 — Phase 14~15 추가 알고리즘**
- van Seijen et al. (2009) "A Theoretical and Empirical Analysis of Expected Sarsa" — Expected SARSA
- van Hasselt (2010) "Double Q-learning", NeurIPS — Double Q-Learning
- Moore & Atkeson (1993) "Prioritized Sweeping", Machine Learning — Prioritized Sweeping
- Sutton & Barto (2018) Section 7.5 "A Unifying Algorithm: n-step Tree Backup" — n-step Tree Backup

**벤치마킹 연구**
- "Benchmarking Tabular RL Algorithms" (TDS, 2025) — 25×25까지 체계적 비교
- "Revisiting Benchmarking of Tabular RL Methods" (TDS) — n-step Tree Backup 최우수

**절차적 생성**
- BSP Tree + Cellular Automata 하이브리드 — 50×50 던전 자동 생성

**표준 벤치마크 환경**
- Gymnasium: CliffWalking, WindyGridworld, FrozenLake
- MiniGrid (Farama): Empty, FourRooms, DoorKey, LavaGap, MultiRoom
- AI Safety Gridworlds (DeepMind, 2017)

## 라이선스

MIT License
