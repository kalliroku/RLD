# RL Dungeon (강화학습 던전)

강화학습을 게임화한 교육적 엔터테인먼트 프로젝트.
AI 모험가를 훈련시켜 던전을 공략하거나, 자신만의 던전을 설계해 다른 모험가들을 격파하세요.

## 핵심 컨셉

- **모험가 모드**: AI 에이전트를 학습시켜 던전 클리어
- **던전 마스터 모드**: 그리드 월드 던전 제작 (예정)
- **NPC 가차 시스템**: 알고리즘을 캐릭터화 (Q군, 피피오, 삭 등) (예정)

## 현재 진행 상황

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 0 | 프로젝트 셋업 | ✅ 완료 |
| Phase 1 | 그리드 월드 (타일, 던전, 렌더링) | ✅ 완료 |
| Phase 2 | 에이전트 (이동, HP, 보상) | ✅ 완료 |
| Phase 3 | 게임 로직 (Gymnasium 환경) | ✅ 완료 |
| Phase 4 | Q-Learning | ✅ 완료 |
| Phase 5 | 웹 UI | ✅ 완료 |
| Phase 6 | 게임 확장 (이코노미, 전장의 안개) | ✅ 완료 |
| Phase 7 | 던전 언락, 몬스터, LfD | ✅ 완료 |
| Phase 8 | Q-Table 저장, 모바일 터치, AI 학습 시각화 | ✅ 완료 |
| Phase 9 | NPC 가차 시스템 | ⏳ 예정 |
| Phase 10 | 던전 에디터 | ⏳ 예정 |
| Phase 11 | 추가 알고리즘 (DQN, PPO) | ⏳ 예정 |

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
# 브라우저에서 http://localhost:8080/ 접속
```
- 방향키/WASD: 이동 (모바일: 스와이프 또는 D-pad)
- AI Training: 시각적 학습 (1x/2x/3x 속도) 또는 Instant 모드
- Until Success: 95% 성공률 도달 시 자동 종료
- Continuous: Stop 버튼으로 수동 정지 (최대 10,000 에피소드)
- Q-Table 자동 저장/복원 (새로고침해도 학습 데이터 유지)
- Show Q-Values/Policy: 학습 시각화
- Fog of War: 전장의 안개 토글

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
│   ├── index.html      # 웹 UI
│   ├── css/style.css   # 스타일
│   └── js/
│       ├── main.js     # 게임 엔트리포인트
│       └── game/       # 그리드, 에이전트, Q-Learning, 렌더러, 사운드
├── assets/
│   └── dungeons/       # 던전 파일들 (12개)
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

- **12개 던전**: 튜토리얼부터 HP Gauntlet까지 난이도별 진행
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

## 향후 계획

1. **NPC 가차**: 알고리즘 캐릭터화
   - Q군 (Common) - Q-Learning
   - 피피오 (Epic) - PPO
   - 삭 (Legendary) - SAC
2. **던전 에디터**: 유저 던전 제작
3. **DQN/PPO**: 신경망 기반 알고리즘

## 참고 자료

- [DeepMind RL Course](https://www.deepmind.com/learning-resources/introduction-to-reinforcement-learning-with-david-silver)
- [Hugging Face Deep RL Course](https://huggingface.co/learn/deep-rl-course/unit0/introduction)
- [Gymnasium Documentation](https://gymnasium.farama.org/)

## 라이선스

MIT License
