# Phase 15 구현 기록: 대규모 던전 + 절차적 생성 + 알고리즘 2개

**날짜**: 2026-02-20
**상태**: 완료

## 요약

Phase 14에서 13개 알고리즘과 29개 던전을 완성한 후, Phase 15에서 다음을 추가:
- **n-step Tree Backup**: TDS 벤치마크 1위 tabular 알고리즘
- **Prioritized Sweeping**: Dyna-Q 개선판, 우선순위 큐 기반 계획
- **절차적 던전 생성기**: BSP + Cellular Automata 하이브리드
- **50×50 던전 2개**: Cave (동굴형), Rooms (방+복도형)

최종 결과: **15개 알고리즘, 31개 던전**.

---

## 1. n-step Tree Backup (`tree-backup.js`)

### 참조
- Sutton & Barto (2018) Section 7.5 "A Unifying Algorithm: n-step Tree Backup"
- TDS "Revisiting Benchmarking of Tabular RL Methods" — 전체 1위

### 핵심 로직
Expected SARSA의 n-step 확장. 각 중간 단계에서 importance sampling 없이 off-policy n-step return을 계산.

**데이터 구조:**
- Q-table (Map, 기존 패턴 동일)
- Circular buffer size n+1: `{state, action, reward, actionProb}[]`

**Tree Backup Return 계산 (backward pass):**
```
Base: G = ExpQ(S_{endIdx}) if not terminal, else 0
Leaf level (k == endIdx-1): G = R_{k+1} + γ·G
Inner levels (k < endIdx-1): G = R_{k+1} + γ·(ExpQ(S_{k+1}) - π·Q(S_{k+1},A_{k+1}) + π·G)
Update: Q(S_τ, A_τ) += α·(G - Q(S_τ, A_τ))
```

**하이퍼파라미터**: n=4, alpha=0.5, gamma=0.99, epsilon=1.0→0.01

### 구현 이슈
초기 구현에서 backward pass의 인덱싱이 잘못되어 수정. 핵심: leaf level과 inner level을 구분하여 tree decomposition을 정확히 적용해야 함.

---

## 2. Prioritized Sweeping (`prioritized-sweeping.js`)

### 참조
- Moore & Atkeson (1993) "Prioritized Sweeping", Machine Learning
- Sutton & Barto (2018) Section 8.4

### 핵심 로직
Dyna-Q와 동일한 모델 기반 계획이지만, 랜덤 샘플링 대신 TD-error 크기 순 우선순위 큐 사용. predecessor 추적으로 변화를 역방향 전파.

**데이터 구조:**
- Q-table, Model (Dyna-Q와 동일)
- Priority Queue: 배열 기반 max-heap (`pQueue`, `pQueueSet`)
- Predecessor Map: `Map<stateKey, Set<{stateKey, action, reward}>>`

**Planning Step:**
1. 실제 경험 → TD-error 계산 → threshold(θ) 초과 시 큐에 삽입
2. 큐에서 최대 priority (s,a) pop → 모델로 Q 업데이트
3. predecessor들의 TD-error 재계산 → threshold 초과 시 큐에 삽입
4. planningSteps번 반복

**하이퍼파라미터**: theta=0.0001, planningSteps=5, alpha=0.5, gamma=0.99

---

## 3. 절차적 던전 생성기 (`dungeon-generator.js`)

### BSP + CA 하이브리드 5단계 파이프라인

1. **BSP 분할**: 그리드를 재귀적으로 이등분 → 12~20개 리프 파티션
2. **방 배치**: 각 리프에 최소 4×4 방 배치 (패딩 1)
3. **복도 연결**: 형제 노드의 방을 L자 복도로 연결 (연결성 보장)
4. **CA 보정** (cave 스타일만): birth≥5, survival≥4, 3회 반복으로 유기적 동굴 형태
5. **요소 배치**: BFS 거리 기반 확률 배치 (S=가장 가까운, G=가장 먼, T/M/$=중거리, H=중간, P=장거리)

### 파라미터
- BSP: MIN_LEAF=10, MAX_LEAF=24, MIN_ROOM=4, PADDING=1
- CA: birth≥5, survive≥4, 3 iterations
- PRNG: Mulberry32 (시드 기반 재현 가능)

### 스타일
- `'cave'`: BSP + CA 보정 → 유기적 동굴 형태
- `'rooms'`: BSP만 → 깔끔한 방+복도 구조

---

## 4. 50×50 던전

| 던전 | 시드 | 스타일 | maxSteps |
|------|------|--------|----------|
| Lv.30 Cave (50×50) | 42 | cave | 2000 |
| Lv.31 Rooms (50×50) | 7777 | rooms | 2000 |

시드 고정으로 사전 생성 후 `grid.js`에 하드코딩 (기존 던전과 동일 방식). 생성 시 BFS로 S→G 경로 존재 검증 완료.

---

## 5. 브라우저 테스트 결과

| 항목 | 결과 |
|------|------|
| 콘솔 에러 | 없음 |
| 트리백 Lv.1 Instant | 100% 수렴 (20 에피소드) |
| 스위퍼 Lv.1 Instant | 100% 수렴 (20 에피소드) |
| Lv.30 Cave 50×50 렌더링 | 정상 (모든 타일 유형 확인) |
| Lv.31 Rooms 50×50 렌더링 | 정상 (50×50 그리드 확인) |
| 캐릭터 카드 15개 | 정상 표시 |

---

## 수정 파일 목록

| 파일 | 작업 |
|------|------|
| `web/js/game/tree-backup.js` | 신규 |
| `web/js/game/prioritized-sweeping.js` | 신규 |
| `web/js/game/dungeon-generator.js` | 신규 |
| `web/js/game/grid.js` | 50×50 던전 2개 추가 |
| `web/js/main.js` | import, CHARACTERS, DUNGEON_CONFIG 등록 |
| `web/index.html` | 캐릭터 카드 2개, 던전 옵션 2개 |
| `docs/GDD.md` | Phase 15 섹션, 알고리즘 15개 |
| `README.md` | Phase 15 완료, 31개 던전 |
