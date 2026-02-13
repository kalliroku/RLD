# 강화학습 던전 - 세부 작업 계획

> **원칙**: 모든 작업은 즉시 눈으로 확인 가능해야 함
> **참고 자료**:
> - [DeepMind RL Course](https://www.deepmind.com/learning-resources/introduction-to-reinforcement-learning-with-david-silver)
> - [Hugging Face Deep RL Course](https://huggingface.co/learn/deep-rl-course/unit0/introduction)
> - [Gymnasium Custom Environment](https://gymnasium.farama.org/introduction/create_custom_env/)
> - [MiniGrid](https://minigrid.farama.org/)

---

## Phase 0: 프로젝트 셋업 (즉시 확인 가능)

### 0.1 개발 환경 구성
- [ ] **0.1.1** Python 가상환경 생성 (`python -m venv venv`)
  - ✅ 확인: `venv` 폴더 생성됨
- [ ] **0.1.2** 가상환경 활성화
  - ✅ 확인: 프롬프트에 `(venv)` 표시
- [ ] **0.1.3** 기본 패키지 설치 (gymnasium, numpy, pygame)
  - ✅ 확인: `pip list`로 설치 확인
- [ ] **0.1.4** pytest 설치
  - ✅ 확인: `pytest --version` 출력

### 0.2 프로젝트 구조 생성
- [ ] **0.2.1** 루트 폴더 구조 생성
  ```
  RLD/
  ├── src/
  ├── tests/
  ├── assets/
  └── docs/
  ```
  - ✅ 확인: 폴더 존재 확인
- [ ] **0.2.2** src 하위 폴더 생성
  ```
  src/
  ├── env/          # 환경 (던전)
  ├── agents/       # 에이전트 (모험가)
  ├── algorithms/   # RL 알고리즘
  ├── ui/           # 사용자 인터페이스
  └── core/         # 핵심 데이터 구조
  ```
  - ✅ 확인: 폴더 존재 확인
- [ ] **0.2.3** 각 폴더에 `__init__.py` 생성
  - ✅ 확인: 파일 존재 확인
- [ ] **0.2.4** `pyproject.toml` 또는 `setup.py` 생성
  - ✅ 확인: 파일 존재 확인

---

## Phase 1: 그리드 월드 기초 (눈으로 보이는 것부터!)

### 1.1 타일 시스템 정의
- [ ] **1.1.1** `TileType` Enum 클래스 생성 (EMPTY, WALL, START, GOAL 4개만)
  - ✅ 확인: Python REPL에서 `TileType.WALL` 출력
- [ ] **1.1.2** 각 타일의 속성 정의 (통과 가능 여부, 보상)
  - ✅ 확인: `TileType.WALL.passable == False` 확인
- [ ] **1.1.3** 타일 → 문자 변환 함수 (`tile_to_char`)
  - ✅ 확인: `tile_to_char(TileType.WALL)` → `'#'`
- [ ] **1.1.4** 문자 → 타일 변환 함수 (`char_to_tile`)
  - ✅ 확인: `char_to_tile('#')` → `TileType.WALL`

### 1.2 그리드 데이터 구조
- [ ] **1.2.1** `Grid` 클래스 생성 (width, height 속성만)
  - ✅ 확인: `Grid(5, 5).width == 5`
- [ ] **1.2.2** 2D numpy 배열로 타일 저장
  - ✅ 확인: `grid.tiles.shape == (5, 5)`
- [ ] **1.2.3** 특정 위치 타일 가져오기 (`get_tile(x, y)`)
  - ✅ 확인: `grid.get_tile(0, 0)` 반환
- [ ] **1.2.4** 특정 위치 타일 설정하기 (`set_tile(x, y, tile)`)
  - ✅ 확인: 설정 후 `get_tile`로 확인
- [ ] **1.2.5** 그리드 경계 체크 (`is_valid_position(x, y)`)
  - ✅ 확인: `is_valid_position(-1, 0) == False`

### 1.3 그리드 텍스트 출력 (첫 번째 시각적 확인!)
- [ ] **1.3.1** 그리드를 문자열로 변환 (`__str__` 메서드)
  - ✅ 확인: `print(grid)` 실행 시 그리드 보임
  ```
  #####
  #S..#
  #...#
  #..G#
  #####
  ```
- [ ] **1.3.2** 빈 그리드 생성 함수 (`create_empty_grid(w, h)`)
  - ✅ 확인: 모든 칸이 '.'으로 출력
- [ ] **1.3.3** 벽으로 둘러싸인 그리드 생성 (`create_bordered_grid(w, h)`)
  - ✅ 확인: 테두리가 '#'으로 출력

### 1.4 그리드 파일 로드/저장
- [ ] **1.4.1** 텍스트 파일에서 그리드 로드 (`load_from_file(path)`)
  - ✅ 확인: 샘플 파일 로드 후 `print(grid)`
- [ ] **1.4.2** 그리드를 텍스트 파일로 저장 (`save_to_file(path)`)
  - ✅ 확인: 저장 후 파일 내용 확인
- [ ] **1.4.3** 샘플 던전 3개 생성 (5x5, 7x7, 10x10)
  - ✅ 확인: 각 파일이 assets/dungeons/에 존재

### 1.5 Pygame 기본 렌더링 (드디어 그래픽!)
- [ ] **1.5.1** Pygame 초기화 및 윈도우 생성 (640x480)
  - ✅ 확인: 검은 창이 뜸
- [ ] **1.5.2** 타일 크기 상수 정의 (TILE_SIZE = 32)
  - ✅ 확인: 코드에 상수 존재
- [ ] **1.5.3** 단색 사각형으로 타일 그리기
  - EMPTY: 흰색, WALL: 검정, START: 파랑, GOAL: 초록
  - ✅ 확인: 창에 색깔 사각형 보임
- [ ] **1.5.4** 그리드 전체 렌더링 (`render_grid(surface, grid)`)
  - ✅ 확인: 5x5 그리드가 화면에 표시
- [ ] **1.5.5** 게임 루프 구현 (창 닫기 전까지 유지)
  - ✅ 확인: X 버튼 누르면 종료
- [ ] **1.5.6** FPS 표시 (디버깅용)
  - ✅ 확인: 창 제목에 FPS 표시

---

## Phase 2: 에이전트(모험가) 기초

### 2.1 에이전트 데이터 구조
- [ ] **2.1.1** `Agent` 클래스 생성 (x, y 위치만)
  - ✅ 확인: `Agent(1, 1).x == 1`
- [ ] **2.1.2** HP 속성 추가 (기본 100)
  - ✅ 확인: `agent.hp == 100`
- [ ] **2.1.3** 에이전트 상태 체크 (`is_alive`)
  - ✅ 확인: `hp > 0`이면 True

### 2.2 행동(Action) 정의
- [ ] **2.2.1** `Action` Enum 생성 (UP, DOWN, LEFT, RIGHT)
  - ✅ 확인: `Action.UP.value == 0`
- [ ] **2.2.2** 액션 → 방향 벡터 변환 (`action_to_delta`)
  - ✅ 확인: `action_to_delta(Action.UP)` → `(0, -1)`
- [ ] **2.2.3** 랜덤 액션 선택 함수
  - ✅ 확인: 여러 번 호출 시 다른 값 반환

### 2.3 에이전트 이동
- [ ] **2.3.1** 다음 위치 계산 (`get_next_position(action)`)
  - ✅ 확인: 현재 (1,1)에서 UP → (1,0)
- [ ] **2.3.2** 이동 가능 여부 체크 (벽, 경계)
  - ✅ 확인: 벽으로 이동 시 False
- [ ] **2.3.3** 실제 이동 실행 (`move(action)`)
  - ✅ 확인: 위치 변경됨
- [ ] **2.3.4** 이동 실패 시 제자리 유지
  - ✅ 확인: 벽으로 이동 시도 후 위치 그대로

### 2.4 에이전트 렌더링
- [ ] **2.4.1** 에이전트를 원으로 그리기 (노란색)
  - ✅ 확인: 그리드 위에 노란 원 보임
- [ ] **2.4.2** 에이전트 위치가 그리드 좌표와 일치
  - ✅ 확인: START 타일 위에 에이전트 표시
- [ ] **2.4.3** HP 바 그리기 (에이전트 위)
  - ✅ 확인: 빨간/초록 바 보임

### 2.5 키보드 조작 (수동 모드)
- [ ] **2.5.1** 방향키 입력 감지
  - ✅ 확인: 키 누르면 콘솔에 출력
- [ ] **2.5.2** 키 입력 → Action 변환
  - ✅ 확인: ↑ 키 → Action.UP
- [ ] **2.5.3** 키 입력으로 에이전트 이동
  - ✅ 확인: 방향키로 노란 원 이동!
- [ ] **2.5.4** 이동 시 애니메이션 (부드러운 이동) - 선택사항
  - ✅ 확인: 슬라이딩 효과

---

## Phase 3: 게임 로직

### 3.1 보상 시스템
- [ ] **3.1.1** 스텝 보상 상수 정의 (`STEP_REWARD = -0.1`)
  - ✅ 확인: 상수 존재
- [ ] **3.1.2** 타일별 보상 딕셔너리
  - ✅ 확인: `TILE_REWARDS[TileType.GOAL] == 100`
- [ ] **3.1.3** 보상 계산 함수 (`calculate_reward(tile, action_success)`)
  - ✅ 확인: GOAL 도달 시 100 반환
- [ ] **3.1.4** 누적 보상 추적 (`total_reward`)
  - ✅ 확인: 여러 스텝 후 누적값 확인

### 3.2 에피소드 관리
- [ ] **3.2.1** 에피소드 시작 (`reset()`)
  - 에이전트를 START로, HP 회복, 보상 초기화
  - ✅ 확인: reset 후 초기 상태
- [ ] **3.2.2** 에피소드 종료 조건 체크
  - GOAL 도달 → 성공
  - HP <= 0 → 실패
  - 최대 스텝 초과 → 타임아웃
  - ✅ 확인: 각 조건에서 `done == True`
- [ ] **3.2.3** 에피소드 결과 표시 (성공/실패/타임아웃)
  - ✅ 확인: 화면에 메시지 출력

### 3.3 Gymnasium 환경 래퍼
- [ ] **3.3.1** `gymnasium.Env` 상속 클래스 생성
  - ✅ 확인: 클래스 정의됨
- [ ] **3.3.2** `observation_space` 정의 (에이전트 위치)
  - ✅ 확인: `env.observation_space` 출력
- [ ] **3.3.3** `action_space` 정의 (4방향)
  - ✅ 확인: `env.action_space.n == 4`
- [ ] **3.3.4** `reset()` 구현
  - ✅ 확인: `obs, info = env.reset()` 동작
- [ ] **3.3.5** `step(action)` 구현
  - ✅ 확인: `obs, reward, done, truncated, info = env.step(0)` 동작
- [ ] **3.3.6** `render()` 구현 (Pygame 연동)
  - ✅ 확인: `env.render()` 호출 시 화면 갱신
- [ ] **3.3.7** Gymnasium 호환성 테스트 (`gymnasium.utils.env_checker`)
  - ✅ 확인: 체커 통과

### 3.4 함정 타일 추가
- [ ] **3.4.1** `TileType.TRAP` 추가
  - ✅ 확인: Enum에 TRAP 존재
- [ ] **3.4.2** 함정 색상 정의 (빨간색)
  - ✅ 확인: 빨간 사각형 렌더링
- [ ] **3.4.3** 함정 밟으면 HP 감소 (-10)
  - ✅ 확인: 함정 밟은 후 HP 90
- [ ] **3.4.4** 함정 밟으면 화면 깜빡임 효과
  - ✅ 확인: 빨간색 플래시

### 3.5 회복 타일 추가
- [ ] **3.5.1** `TileType.HEAL` 추가
  - ✅ 확인: Enum에 HEAL 존재
- [ ] **3.5.2** 회복 색상 정의 (분홍색)
  - ✅ 확인: 분홍 사각형 렌더링
- [ ] **3.5.3** 회복 타일에서 HP 증가 (+10, 최대 HP 제한)
  - ✅ 확인: HP 90 → 100

---

## Phase 4: Q-Learning 구현

### 4.1 Q-테이블 기초
- [ ] **4.1.1** Q-테이블 초기화 (상태 × 액션)
  - 상태 = (x, y) 위치
  - 액션 = 4방향
  - ✅ 확인: `q_table.shape == (width * height, 4)`
- [ ] **4.1.2** 상태 → 인덱스 변환 (`state_to_index`)
  - ✅ 확인: `(1, 2)` → `1 * width + 2`
- [ ] **4.1.3** Q값 조회 (`get_q_value(state, action)`)
  - ✅ 확인: 초기값 0 반환
- [ ] **4.1.4** Q값 업데이트 (`set_q_value(state, action, value)`)
  - ✅ 확인: 설정 후 조회 시 값 일치

### 4.2 탐험 정책 (Epsilon-Greedy)
- [ ] **4.2.1** epsilon 파라미터 (기본 1.0)
  - ✅ 확인: `agent.epsilon == 1.0`
- [ ] **4.2.2** epsilon 기반 액션 선택
  - epsilon 확률로 랜덤, 아니면 최대 Q값 액션
  - ✅ 확인: epsilon=1.0이면 항상 랜덤
- [ ] **4.2.3** epsilon decay (에피소드마다 감소)
  - ✅ 확인: 1000 에피소드 후 epsilon ≈ 0.01
- [ ] **4.2.4** 현재 epsilon 화면 표시
  - ✅ 확인: UI에 "ε: 0.95" 표시

### 4.3 Q-Learning 업데이트
- [ ] **4.3.1** 학습률 alpha 정의 (기본 0.1)
  - ✅ 확인: `agent.alpha == 0.1`
- [ ] **4.3.2** 할인율 gamma 정의 (기본 0.99)
  - ✅ 확인: `agent.gamma == 0.99`
- [ ] **4.3.3** Q-Learning 업데이트 공식 구현
  ```
  Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]
  ```
  - ✅ 확인: 단위 테스트 통과
- [ ] **4.3.4** 한 스텝 학습 (`learn_step`)
  - ✅ 확인: Q값 변화 로그 출력

### 4.4 학습 루프
- [ ] **4.4.1** 단일 에피소드 실행 함수 (`run_episode`)
  - ✅ 확인: 에피소드 종료까지 실행
- [ ] **4.4.2** 에피소드 보상 반환
  - ✅ 확인: 에피소드 총 보상 출력
- [ ] **4.4.3** 다중 에피소드 학습 (`train(n_episodes)`)
  - ✅ 확인: 100 에피소드 학습 완료
- [ ] **4.4.4** 학습 중 통계 수집 (에피소드별 보상)
  - ✅ 확인: 리스트에 보상 기록

### 4.5 학습 시각화 (핵심!)
- [ ] **4.5.1** 에피소드 보상 그래프 (matplotlib)
  - ✅ 확인: 선 그래프 표시
- [ ] **4.5.2** 이동 평균 보상 그래프 (100 에피소드)
  - ✅ 확인: 부드러운 곡선 표시
- [ ] **4.5.3** Q-테이블 히트맵 시각화
  - 각 셀의 최대 Q값을 색상으로 표시
  - ✅ 확인: 그리드에 색상 그라데이션
- [ ] **4.5.4** 최적 정책 화살표 표시
  - 각 셀에서 최선의 행동 방향
  - ✅ 확인: 그리드에 화살표 오버레이
- [ ] **4.5.5** 실시간 학습 시각화 모드
  - 학습하면서 Q값 변화를 실시간으로 봄
  - ✅ 확인: 애니메이션처럼 Q값 색상 변화

### 4.6 학습된 정책 테스트
- [ ] **4.6.1** 학습된 Q-테이블로 greedy 행동 선택
  - ✅ 확인: epsilon=0으로 실행
- [ ] **4.6.2** 학습된 에이전트 자동 플레이 시연
  - ✅ 확인: 에이전트가 스스로 GOAL까지 이동
- [ ] **4.6.3** 성공률 측정 (100회 테스트)
  - ✅ 확인: "성공률: 95%" 출력
- [ ] **4.6.4** 평균 스텝 수 측정
  - ✅ 확인: "평균 12.3 스텝" 출력

---

## Phase 5: 웹 UI 기초

### 5.1 FastAPI 서버 셋업
- [ ] **5.1.1** FastAPI 앱 생성
  - ✅ 확인: `uvicorn` 실행 성공
- [ ] **5.1.2** 헬스체크 엔드포인트 (`GET /health`)
  - ✅ 확인: `{"status": "ok"}` 응답
- [ ] **5.1.3** CORS 설정
  - ✅ 확인: 브라우저에서 API 호출 성공
- [ ] **5.1.4** 정적 파일 서빙 (`/static`)
  - ✅ 확인: HTML 파일 접근 가능

### 5.2 던전 API
- [ ] **5.2.1** 던전 목록 조회 (`GET /dungeons`)
  - ✅ 확인: JSON 배열 반환
- [ ] **5.2.2** 던전 상세 조회 (`GET /dungeons/{id}`)
  - ✅ 확인: 그리드 데이터 반환
- [ ] **5.2.3** 던전 생성 (`POST /dungeons`)
  - ✅ 확인: 새 던전 저장됨

### 5.3 게임 세션 API
- [ ] **5.3.1** 게임 시작 (`POST /games`)
  - 던전 ID로 새 게임 세션 생성
  - ✅ 확인: session_id 반환
- [ ] **5.3.2** 게임 상태 조회 (`GET /games/{session_id}`)
  - ✅ 확인: 현재 상태 JSON 반환
- [ ] **5.3.3** 액션 실행 (`POST /games/{session_id}/action`)
  - ✅ 확인: 액션 후 새 상태 반환
- [ ] **5.3.4** 게임 리셋 (`POST /games/{session_id}/reset`)
  - ✅ 확인: 초기 상태로 복구

### 5.4 HTML/CSS 기본 레이아웃
- [ ] **5.4.1** index.html 생성 (기본 구조)
  - ✅ 확인: 브라우저에서 페이지 로드
- [ ] **5.4.2** 그리드 컨테이너 div
  - ✅ 확인: 빈 박스 표시
- [ ] **5.4.3** CSS Grid로 레이아웃
  - ✅ 확인: 그리드 형태로 배치
- [ ] **5.4.4** 타일 스타일 (색상)
  - ✅ 확인: 각 타일 타입별 색상 적용

### 5.5 Canvas 렌더링
- [ ] **5.5.1** Canvas 요소 생성
  - ✅ 확인: 캔버스 보임
- [ ] **5.5.2** 그리드 데이터 → Canvas 렌더링
  - ✅ 확인: 던전이 화면에 표시
- [ ] **5.5.3** 에이전트 렌더링 (원)
  - ✅ 확인: 노란 원 표시
- [ ] **5.5.4** 키보드 이벤트 연결
  - ✅ 확인: 방향키로 이동

### 5.6 학습 UI
- [ ] **5.6.1** 학습 시작 버튼
  - ✅ 확인: 버튼 클릭 가능
- [ ] **5.6.2** 학습 API 연동 (`POST /train`)
  - ✅ 확인: 학습 시작됨
- [ ] **5.6.3** 학습 진행률 표시
  - ✅ 확인: 프로그레스 바 움직임
- [ ] **5.6.4** 학습 완료 후 결과 표시
  - ✅ 확인: 보상 그래프 표시

---

## Phase 6: 게임 확장 (이코노미 + 전장의 안개) ✅ 완료

### 6.0 구현된 기능
- [x] 골드 이코노미 (던전 입장비, 클리어 보상)
- [x] 전장의 안개 (Fog of War) - 방문한 칸만 보이는 시스템
- [x] 12개 던전 (level_01 ~ level_12)
- [x] 구덩이(Pit) 즉사 타일, 골드($) 타일 추가
- [x] 8비트 사운드 효과 (Web Audio API)
- [x] 던전 언락 진행 시스템
- [x] 몬스터(M) 시스템 - HP 데미지 + 처치 보상
- [x] HP-aware Q-Learning (HP 상태를 고려한 학습)
- [x] Learning from Demonstration (유저 플레이 → AI 학습)
- [x] Q-Table localStorage 저장/복원
- [x] 모바일 터치 컨트롤 (스와이프 + D-pad)
- [x] AI 학습 시각화 모드 (1x/2x/3x/Instant 속도)
- [x] 수렴 감지 (95% 성공률 자동 종료) + 수동 정지
- [x] 캐릭터 시스템 (Q군/스카우트) + 캐릭터별 Q-Table 분리
- [x] 관찰형 Q-Learning (LocalQLearning V12: 8방시야+거리)

## Phase 7: 관찰형 Q-Learning 캐릭터 (스카우트) ✅ 완료

### 7.0 구현된 기능
- [x] LocalQLearning 클래스 (V12: 8방향 시야 + 골 거리)
  - 상태: `tU_tD_tL_tR_tUL_tUR_tDL_tDR_goalDir_goalDist_hpLevel`
  - 좌표 대신 로컬 관찰 기반 → 던전 간 전이학습 가능
- [x] 캐릭터 선택 UI (Q군 암기형 / 스카우트 관찰형)
- [x] 캐릭터별 Q-Table 독립 저장 (`rld_qtable_{character}_{dungeon}`)
- [x] 스카우트 전이학습 (공유 Q-Table `rld_qtable_scout_shared`)
- [x] 기존 Q-Table 마이그레이션 (구 키 → Q군 네임스페이스)
- [x] test() 메서드 (greedy 평가 모드)

### 7.1 성능 비교 결과 (5000ep 학습, 3회 평균)
```
클리어 던전 수: Q군 8/12 | 스카우트(V12) 9/12
스카우트 우위:  Lv.11 HP Test (100% vs 33%), Lv.12 HP Gauntlet (67% vs 0%)
Q군 우위:      Lv.7 Gauntlet (33% vs 0% - 불안정)
동률:          Lv.1~4, 6, 9 (둘 다 100%)
```

### 7.2 버전 선정 과정
- 원본 (4방향 + 골방향 + HP): perceptual aliasing으로 미로 실패
- V1 (8방시야): 대각선 추가만으로는 효과 미미
- V2 (거리추가): Lv.7 단독 클리어, 유망
- V3 (메모리): 상태 폭발로 전멸
- **V12 (8방+거리): 종합 최강 → 정식 채택**

---

## Phase 8: David Silver RL 알고리즘 캐릭터 시스템 ✅ 완료

### 8.0 구현된 기능
- [x] SARSA (사르사) - On-policy TD, 신중한 안전 경로 학습
- [x] Monte Carlo (몬테) - First-visit MC Control, 에피소드 단위 역방향 리턴
- [x] SARSA(λ) (트레이서) - Eligibility trace로 먼 과거 선택도 업데이트
- [x] Dyna-Q (다이나) - Q-Learning + 환경 모델 + planning step 10회
- [x] REINFORCE (그래디) - Softmax 정책 경사법, running-average baseline
- [x] Actor-Critic (크리틱) - Actor(theta) + Critic(V) 이중 테이블, TD error
- [x] 8캐릭터 그리드 UI (2열×4행 카드 레이아웃)
- [x] CHARACTERS 레지스트리 + createAlgorithm() 팩토리 패턴
- [x] 5개 쇼케이스 던전 (Lv.13 Cliff Walk ~ Lv.17 Two Paths) → Phase 9에서 6개 추가
- [x] 전체 알고리즘 serialize/deserialize + localStorage 저장
- [x] Q-Values 히트맵 / Policy 화살표 시각화 호환

### 8.1 알고리즘 파일 구조
```
web/js/game/
├── sarsa.js          # SARSA (On-policy TD)
├── monte-carlo.js    # First-visit Monte Carlo Control
├── sarsa-lambda.js   # SARSA(λ) with eligibility traces
├── dyna-q.js         # Dyna-Q (model-based planning)
├── reinforce.js      # REINFORCE (policy gradient)
└── actor-critic.js   # TD Actor-Critic
```

### 8.2 공통 알고리즘 인터페이스
```
chooseAction(x, y, hp)          // epsilon-greedy 또는 softmax
learn(state, action, reward, nextState, done)
runEpisode(maxSteps) / train(nEpisodes, options) / test(nEpisodes)
stepAction(x, y, hp)            // visual training용
serialize() / deserialize(json) // 저장/복원
getValueGrid() / getPolicyGrid() // 시각화
getBestAction(x, y, hp) / getMaxQValue(x, y, hp) / getQValues(x, y, hp)
```

### 8.3 쇼케이스 던전 목록
| 던전 | 대상 알고리즘 | 설계 의도 |
|------|-------------|----------|
| Lv.13 Cliff Walk | SARSA | 구덩이 바로 위 최적경로 vs 안전 우회 |
| Lv.14 Long Hall | Monte Carlo | 30+ 스텝, 중간 보상 없는 장거리 |
| Lv.15 Multi Room | SARSA(λ) | 3개 방, eligibility trace 전파 효과 |
| Lv.16 Open Field | Dyna-Q | 넓은 개방 공간, 모델 기반 계획 효과 |
| Lv.17 Two Paths | REINFORCE | 상하 대칭 경로, 확률적 정책 학습 |

### 8.4 알고리즘 핵심 수식
```
Q-Learning:   Q(s,a) += α[r + γ·max Q(s',a') - Q(s,a)]       (off-policy)
SARSA:        Q(s,a) += α[r + γ·Q(s',a'_next) - Q(s,a)]      (on-policy)
Monte Carlo:  G = Σγ^t·r_t, Q(s,a) += α[G - Q(s,a)]          (에피소드 단위)
SARSA(λ):     e(s,a)+=1, ∀: Q+=α·δ·e, e*=γλ                  (eligibility trace)
Dyna-Q:       Q-Learning + model[s][a] + N회 planning           (모델 기반)
REINFORCE:    θ(s,a) += α·G·(1-π(a|s))                         (policy gradient)
Actor-Critic: V+=α_c·δ, θ+=α_a·δ·(I-π)                        (TD actor-critic)
```

---

## Phase 9: 알고리즘 쇼케이스 스테이지 확장 + 골드 소비 메커니즘 ✅ 완료

### 9.0 구현된 기능
- [x] 6개 신규 쇼케이스 던전 (Lv.18-23) 추가
- [x] 골드 소비 메커니즘 (에피소드 내 최초 방문 시에만 보상, 이후 사라짐)
- [x] 8개 알고리즘 전체에 collectedGold Set 패턴 적용
- [x] Node.js 테스트 스크립트 (test-stages.mjs)

### 9.1 신규 던전 목록
| 던전 | 크기 | 대상 알고리즘 | 설계 의도 |
|------|------|-------------|----------|
| Lv.18 Dead End Labyrinth | 15×11 | TD > MC/PG | 미로+타임아웃, TD 점진 학습 vs MC 실패 |
| Lv.19 Narrow Bridge | 17×9 | SARSA > QL | 양쪽 구덩이 다리, on-policy 안전 우회 |
| Lv.20 Cliff Walking | 17×10 | SARSA > QL | 클래식 절벽 걷기, 신중한 탐험 빠른 수렴 |
| Lv.21 Desert Crossing | 19×13 | Dyna-Q >> 전체 | 초대형 개방 공간, 모델 기반 10배 빠른 수렴 |
| Lv.22 Monster Arena | 13×7 | HP 관리 | 몬스터+힐 필수 통과, useHpState 학습 |
| Lv.23 The Mirage | 15×7 | MC > TD | 골드+구덩이 함정, MC 1회 사망 즉시 학습 |

### 9.2 알고리즘 수렴 테스트 결과 (Node.js, 2000ep)
```
Lv.18: 다이나@54, Q군@102, 몬테 FAIL(0.1%)     — TD > MC 확인
Lv.19: 사르사@126, Q군@430                       — SARSA 3.4x 빠름
Lv.20: 사르사@261, Q군@434                       — SARSA 1.7x 빠름
Lv.21: 다이나@54, Q군@125                        — Dyna-Q 2.3x 빠름
Lv.22: 크리틱@134, 그래디@116, Q군@80            — HP 관리 테스트
Lv.23: 몬테@54, Q군 FAIL(0.2%), 트레이서@72     — MC > TD 확인
```

### 9.3 골드 소비 메커니즘
- 골드 타일 최초 방문 시: +10 보상, 해당 에피소드 내 EMPTY로 변환
- 재방문 시: 보상 없음 (반복 골드 루프 방지)
- 에피소드 종료 후: 원래 상태로 복원
- 구현: 8개 알고리즘의 runEpisode()/test() + main.js 비주얼 훈련에 collectedGold Set 적용

### 9.4 수정된 파일
```
web/js/game/grid.js          — 6개 맵 추가
web/js/main.js               — config/order/display name + 골드 소비
web/index.html               — 6개 option 추가
web/js/game/qlearning.js     — collectedGold
web/js/game/local-qlearning.js — collectedGold
web/js/game/sarsa.js         — collectedGold
web/js/game/monte-carlo.js   — collectedGold
web/js/game/sarsa-lambda.js  — collectedGold
web/js/game/dyna-q.js        — collectedGold
web/js/game/reinforce.js     — collectedGold
web/js/game/actor-critic.js  — collectedGold
test-stages.mjs              — 신규 테스트 스크립트
```

---

## Phase 10+: Quick Test (에디터 내 AI 테스트) ✅ 완료

### 10+.0 구현된 기능
- [x] 에디터 내 Quick Test 섹션 (캐릭터/에피소드 선택, 진행률 바, 결과 표시)
- [x] 콜백 패턴으로 editor.js → main.js 훈련 위임
- [x] Grid 딥카피로 에디터 그리드 무변경 보장
- [x] 수렴 감지 (20ep 중 95% 성공 시 조기 종료)
- [x] Stop 버튼으로 중간 중단
- [x] "Show learned policy" 체크박스 → Q-Value/Policy 오버레이
- [x] 그리드 변경 시 정책 오버레이 자동 해제
- [x] 모드 전환 시 진행 중인 테스트 자동 중단

---

## Phase 11: Multi-Stage Dungeon System — 계획 수립

> 상세 설계서: `docs/MULTI_STAGE_DUNGEON.md`

### Phase 11-A: Stage Library (소)

기존 에디터의 저장 대상을 Stage Library로 전환.

- [ ] **11.A.1** `rld_stages` localStorage CRUD 함수
  - ✅ 확인: saveStage/loadStage/deleteStage/getStageList 동작
- [ ] **11.A.2** 기존 `rld_custom_dungeons` → `rld_stages` 마이그레이션
  - ✅ 확인: 기존 저장 던전이 Stage Library에 표시
- [ ] **11.A.3** 에디터 Save/Load UI를 Stage Library로 전환
  - ✅ 확인: "Stage Library" 라벨, 드롭다운에 스테이지 목록

### Phase 11-B: Dungeon Composer UI (중)

에디터에 Dungeon 서브탭 추가, Floor 슬롯 관리.

- [ ] **11.B.1** Stage / Dungeon 서브탭 전환 UI
  - ✅ 확인: 탭 클릭 시 패널 전환
- [ ] **11.B.2** `rld_dungeons` localStorage CRUD
  - ✅ 확인: saveDungeon/loadDungeon/deleteDungeon 동작
- [ ] **11.B.3** Floor 슬롯 추가/삭제 UI
  - ✅ 확인: [+ Add Floor] 클릭 시 슬롯 추가, 삭제 가능
- [ ] **11.B.4** Floor에 Stage 선택 드롭다운 (Stage Library에서)
  - ✅ 확인: 드롭다운에 Stage Library 목록 표시
- [ ] **11.B.5** 선택된 Floor의 스테이지 캔버스 프리뷰
  - ✅ 확인: Floor 클릭 시 캔버스에 해당 그리드 표시
- [ ] **11.B.6** Rules 설정 (HP Carry Over, Gold on Clear)
  - ✅ 확인: 체크박스 상태가 Dungeon 데이터에 저장
- [ ] **11.B.7** Dungeon 저장/불러오기/삭제
  - ✅ 확인: Save → Load → Delete 사이클 정상

### Phase 11-C: MultiStageGrid + Algorithm Integration (중~대)

여러 스테이지를 하나의 환경으로 결합, 8개 알고리즘 연동.

- [ ] **11.C.1** `multi-stage-grid.js` 신규 - MultiStageGrid 클래스
  - Virtual Coordinate Stacking (세로 쌓기)
  - Grid 인터페이스 호환: width, height, startPos, goalPos, getTile, tiles Proxy, isValidPosition
  - ✅ 확인: 3개 스테이지 결합 후 getTile/isValidPosition 정상
- [ ] **11.C.2** `tryAdvanceStage(agent)` 메서드
  - 비-최종 스테이지 Goal 도달 시 다음 스테이지 전환, HP 유지
  - ✅ 확인: agent가 1층 Goal → 2층 Start로 이동, HP 유지
- [ ] **11.C.3** 8개 알고리즘 runEpisode()/test()에 stage transition 코드 추가
  - qlearning, local-qlearning, sarsa, monte-carlo, sarsa-lambda, dyna-q, reinforce, actor-critic
  - ✅ 확인: 3층 던전에서 runEpisode() 성공적으로 전 층 통과
- [ ] **11.C.4** Local Q-Learning goalPos 처리 (currentStageGoalPos)
  - ✅ 확인: 스카우트가 현재 층 Goal 방향으로 학습
- [ ] **11.C.5** 몬스터/골드 복원 로직 멀티스테이지 정상 동작
  - ✅ 확인: 각 층의 몬스터/골드 독립 복원
- [ ] **11.C.6** 단일 스테이지(기존 Grid) 회귀 테스트
  - ✅ 확인: 기존 23개 던전 + 커스텀 던전 정상 동작

### Phase 11-D: Play Mode Multi-Stage (중)

수동 플레이 + AI 훈련에서 멀티스테이지 동작.

- [ ] **11.D.1** 멀티스테이지 던전 로드 (resolveDungeon + MultiStageGrid 생성)
  - ✅ 확인: 드롭다운에서 멀티스테이지 던전 선택 시 로드
- [ ] **11.D.2** 수동 플레이: Goal 도달 시 스테이지 전환 + HP 유지
  - ✅ 확인: 방향키로 1층 클리어 → 2층 시작
- [ ] **11.D.3** 스테이지 전환 시각 효과 ("Floor N Clear!")
  - ✅ 확인: 메시지 + 플래시 효과
- [ ] **11.D.4** 현재 층 표시 UI ("Floor 1/3")
  - ✅ 확인: 게임 UI에 층 정보 표시
- [ ] **11.D.5** 골드 보류 시스템 (pendingGold 표시 + 클리어 시 확정)
  - ✅ 확인: Pending Gold UI, 클리어 시 gold 증가, 사망 시 소실
- [ ] **11.D.6** Visual/Instant Training 멀티스테이지 동작
  - ✅ 확인: 두 모드 모두 다층 던전에서 학습 정상
- [ ] **11.D.7** Play 모드 드롭다운에 멀티스테이지 던전 표시
  - ✅ 확인: "[Custom] 화염의 던전 (3F)" 형식

### Phase 11-E: Variant System (소)

Floor 슬롯에 랜덤 변형 후보 추가.

- [ ] **11.E.1** Floor에 "Add Variant" 버튼 + variant 목록 UI
  - ✅ 확인: variant 추가/삭제/weight 설정 가능
- [ ] **11.E.2** resolveDungeon()에서 weighted random 선택
  - ✅ 확인: 여러 번 실행 시 weight에 따라 다른 스테이지 선택
- [ ] **11.E.3** Training 시 매 에피소드 새 변형 생성
  - ✅ 확인: 학습 중 변형 다양하게 경험

### Phase 11-F: Polish (소)

- [ ] **11.F.1** 던전 답파율 표시
  - ✅ 확인: 최근 N 에피소드 기반 성공률
- [ ] **11.F.2** Quick Test 멀티스테이지 지원
  - ✅ 확인: 에디터에서 멀티스테이지 던전 Quick Test 가능
- [ ] **11.F.3** 프리셋 멀티스테이지 던전 1~2개 추가
  - ✅ 확인: 기본 제공 던전 플레이 가능
- [ ] **11.F.4** 기존 커스텀 던전 마이그레이션 안내
  - ✅ 확인: 첫 실행 시 자동 변환 + 알림

---

## Phase 10 (Old): NPC 가차 시스템 (알고리즘 캐릭터화) — 미구현

### 10.1 알고리즘 NPC 정의
- [ ] **10.1.1** `AlgorithmNPC` 클래스 생성
  - name, rarity, algorithm_type, stats
  - ✅ 확인: 클래스 정의됨
- [ ] **10.1.2** 레어리티 정의 (Common, Rare, Epic, Legendary)
  - ✅ 확인: Enum 존재
- [ ] **10.1.3** 기본 NPC 데이터 정의
  ```
  Q군 (Common) - Q-Learning
  사르사 (Common) - SARSA
  딥큐 (Rare) - DQN
  에이투씨 (Rare) - A2C
  피피오 (Epic) - PPO
  삭 (Legendary) - SAC
  ```
  - ✅ 확인: 데이터 파일/코드 존재
- [ ] **10.1.4** NPC별 특수 능력 정의
  - Q군: 학습 속도 빠름
  - 피피오: 안정적인 학습
  - 삭: 탐험 보너스
  - ✅ 확인: 능력치 차이 확인

### 10.2 가차 시스템
- [ ] **10.2.1** 가차 확률 정의
  - Common: 60%, Rare: 30%, Epic: 8%, Legendary: 2%
  - ✅ 확인: 확률 합 100%
- [ ] **10.2.2** 가차 실행 함수 (`pull_gacha`)
  - ✅ 확인: NPC 객체 반환
- [ ] **10.2.3** 10연차 기능 (`pull_gacha_10`)
  - ✅ 확인: 10개 NPC 반환
- [ ] **10.2.4** 천장 시스템 (100회 내 Epic 보장)
  - ✅ 확인: 100회 안에 Epic 등장

### 10.3 가차 UI
- [ ] **10.3.1** 가차 버튼
  - ✅ 확인: 버튼 표시
- [ ] **10.3.2** 가차 연출 (카드 뒤집기 애니메이션)
  - ✅ 확인: 애니메이션 재생
- [ ] **10.3.3** 결과 표시 (NPC 일러스트 + 이름)
  - ✅ 확인: 결과 화면 표시
- [ ] **10.3.4** 레어리티별 이펙트 (Legendary는 화려하게)
  - ✅ 확인: 금색 이펙트

### 10.4 NPC 컬렉션
- [ ] **10.4.1** 보유 NPC 목록 저장
  - ✅ 확인: 로컬 스토리지 또는 DB
- [ ] **10.4.2** NPC 도감 UI
  - ✅ 확인: 그리드 형태로 NPC 표시
- [ ] **10.4.3** 미보유 NPC는 실루엣 표시
  - ✅ 확인: 회색 실루엣
- [ ] **10.4.4** NPC 상세 정보 팝업
  - ✅ 확인: 클릭 시 상세 정보

---

## Phase 10: 던전 에디터 ✅ 완료

### 10.0 구현된 기능
- [x] DungeonEditor 클래스 (`web/js/game/editor.js` 신규)
- [x] Play/Editor 탭 전환 UI (body.editor-mode로 game-ui/dpad 숨김)
- [x] 9종 타일 팔레트 (TileProperties에서 동적 생성)
- [x] 클릭/드래그 타일 페인팅 + 우클릭 지우개
- [x] START/GOAL 단일 강제 (새 배치 시 기존 자동 제거)
- [x] Brush / Eraser / Fill (BFS flood fill) 도구
- [x] Undo/Redo (Grid.toString() 스냅샷 스택, 최대 50)
- [x] BFS 검증 (START/GOAL 존재 + 경로 존재 확인)
- [x] localStorage 저장/불러오기/삭제 (`rld_custom_dungeons` 키)
- [x] "Play This Dungeon" → 검증 후 게임 모드 전환 + AI 훈련 가능
- [x] 키보드 단축키 (0-8 타일선택, Ctrl+Z/Y Undo/Redo)
- [x] 터치 이벤트 핸들러 (모바일 대응)
- [x] 그리드 리사이즈 (3x3 ~ 25x25, 기존 내용 보존)
- [x] 커서 하이라이트 (호버 시 반투명 프리뷰 + 흰색 테두리)
- [x] 커스텀 던전 드롭다운 (`[Custom] 이름` 형식)
- [x] 커스텀 던전 이코노미 격리 (비용 0, 보상 0)

### 10.1 수정 파일
```
web/js/game/editor.js   — 신규: DungeonEditor 클래스 전체
web/js/main.js          — 탭 전환, setupEditor(), playCustomDungeon(), loadCustomDungeonOptions()
web/index.html          — 모드 탭 네비게이션, 에디터 컨트롤 패널
web/css/style.css       — 탭, 팔레트, 도구, 에디터 모드 UI 스타일
```

### 10.2 검증 결과
- Play↔Editor 탭 전환 정상
- 7x7 기본 그리드 (벽 테두리 + S + G)
- 타일 페인팅 (9종 전체)
- Undo/Redo 동작
- BFS 검증 (START 없음/GOAL 없음/경로 없음 에러 검출)
- 그리드 리사이즈 (기존 타일 보존)
- Flood Fill 동작
- 저장 → 새로고침 → 불러오기
- "Play This Dungeon" → 게임 모드 전환 + Instant 훈련 30ep 100% 수렴
- 드롭다운에 [Custom] 던전 표시
- 기존 23개 던전 회귀 테스트 정상
- 콘솔 JS 에러 0건

---

## Phase 12: 추가 RL 알고리즘

### 8.1 SARSA 구현
- [ ] **8.1.1** SARSA 업데이트 공식 구현
  ```
  Q(s,a) ← Q(s,a) + α[r + γ·Q(s',a') - Q(s,a)]
  ```
  (Q-Learning과 달리 실제 다음 액션 a' 사용)
  - ✅ 확인: 단위 테스트 통과
- [ ] **8.1.2** Q-Learning과 SARSA 비교 시연
  - ✅ 확인: 두 알고리즘 동시 학습 그래프

### 8.2 DQN 구현
- [ ] **8.2.1** PyTorch 신경망 모델 정의
  - ✅ 확인: `QNetwork` 클래스 존재
- [ ] **8.2.2** Experience Replay 버퍼
  - ✅ 확인: `ReplayBuffer` 클래스 존재
- [ ] **8.2.3** Target Network 분리
  - ✅ 확인: 메인/타겟 네트워크 2개
- [ ] **8.2.4** DQN 학습 루프
  - ✅ 확인: 학습 실행 가능
- [ ] **8.2.5** DQN vs Q-Learning 비교
  - ✅ 확인: 성능 비교 그래프

### 8.3 PPO 구현 (Stable-Baselines3 래퍼)
- [ ] **8.3.1** Stable-Baselines3 PPO 래퍼 클래스
  - ✅ 확인: SB3 PPO 사용 가능
- [ ] **8.3.2** 우리 환경에 맞게 설정
  - ✅ 확인: 환경 호환성 테스트 통과
- [ ] **8.3.3** PPO 학습 시연
  - ✅ 확인: 학습 후 GOAL 도달

---

## 작업 순서 가이드

1. **Phase 0** → 환경 준비 (30분)
2. **Phase 1.1 ~ 1.3** → 콘솔에서 던전 보기 (1시간)
3. **Phase 1.5** → Pygame으로 던전 보기! (1시간)
4. **Phase 2** → 키보드로 캐릭터 조작 (1시간)
5. **Phase 3.1 ~ 3.2** → 간단한 게임 완성 (1시간)
6. **Phase 4.1 ~ 4.4** → Q-Learning 작동 (2시간)
7. **Phase 4.5** → 학습 과정 시각화 (1시간)

**여기까지가 최소 플레이 가능한 프로토타입!**

---

## 알고리즘 비교 참고

| 알고리즘 | 유형 | 장점 | 단점 | 적합한 상황 |
|---------|------|------|------|------------|
| Q-Learning | Value-based | 단순, 빠름 | 테이블 폭발 | 작은 상태 공간 |
| SARSA | Value-based | 안전한 학습 | 느림 | 위험한 환경 |
| DQN | Value-based + NN | 큰 상태 공간 | 불안정 | 이미지 입력 |
| A2C | Actor-Critic | 안정적 | 느림 | 연속 행동 |
| PPO | Actor-Critic | 매우 안정 | 복잡 | 범용적 |
| SAC | Actor-Critic | 탐험 우수 | 복잡 | 연속 행동 |

*참고: [PPO vs Q-learning 비교](https://mpi.ai/blog/2025/PPO-VS-DQN/)*

---

*Last Updated: 2026-02-14*
