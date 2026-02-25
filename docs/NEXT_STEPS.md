# RLD — 다음 에이전트 핸드오프 문서

> 최종 업데이트: 2026-02-25

---

## 1. 현재 상태 요약

### Act 1: 던전 정복 — 완료

| 단계 | 상태 | 내용 |
|------|------|------|
| Phase A | ✅ 완료 | RunState, 식량, 게임오버, localStorage |
| Phase B/B+ | ✅ 완료 | 운영비, 답파, 스탯, 파밍, 지도경제, 힌트 |
| Phase C | ✅ 완료 | 챕터, 보물, 아이템, 엔딩/NG+, UI 통합 |
| Phase E-1 | ✅ 완료 | 밸런싱 시뮬레이터 (4전략, HP-aware BFS) |
| 브라우저 테스트 | ✅ 완료 | 전 시스템 인터랙티브 검증 (2026-02-24) |
| UI/UX 폴리시 | ✅ 완료 | 토스트, 던전맵, 브리핑, 튜토리얼, 리소스경고 (2026-02-25) |

### 주요 커밋 히스토리

```
f4534c8 Add Act 1 UI/UX polish: toast, dungeon map, briefing, tutorial
137d511 Fix missing first clear gold reward in handleVictory
9540374 Add balance simulator with economy tuning and manual play simulation (Phase E-1)
af0e4be Add treasure diamond rendering on canvas
e4e9a4a Add economic systems, chapter progression, treasure, items, ending/NG+ (Phase B/B+/C)
debf02e Add roguelike skeleton: run system, character lock/unlock, food, game over (Phase A)
30d4714 Add game redesign document v3.0 with economic system overhaul
```

### 파일 구조

```
web/
  index.html              ← 메인 UI (캔버스, 오버레이, 컨트롤)
  css/style.css           ← 스타일 (~1900줄, 토스트/맵/브리핑/튜토리얼 포함)
  js/
    main.js               ← 게임 코어 클래스 (~3100줄, UI+로직 통합)
    game/
      game-config.js      ← 공유 상수 (CHARACTERS, DUNGEON_CONFIG 등)
      run-state.js        ← 게임 상태 (골드, 식량, 클리어, 파밍 등)
      grid.js             ← 31개 던전 맵 + 로드
      agent.js            ← RL 에이전트
      tiles.js            ← 타일 정의
      renderer.js         ← 캔버스 렌더링
      toast.js            ← 토스트 알림 시스템
      dungeon-map.js      ← 챕터별 시각적 던전 맵
      briefing.js         ← 던전 진입 전 브리핑 오버레이
      tutorial.js         ← 컨텍스트 튜토리얼 + 프로그레시브 디스클로저
      qlearning.js        ← Q-Learning (+ 14개 알고리즘 파일)
      ...
sim/
  simulator.js            ← 헤드리스 시뮬레이터 + HP-aware BFS
  strategies.js           ← 4개 전략 (StraightForward/Balanced/FarmHeavy/Hybrid)
  run-balance.js          ← CLI: node sim/run-balance.js [runs] [strategy]
docs/
  GAME_LOOP_REDESIGN.md   ← 게임 디자인 v3.0 (3막 구조)
  GDD.md                  ← GDD
  devlog/                 ← 작업 기록
```

---

## 2. 알려진 이슈 & 개선점

### 밸런스 이슈 (시뮬레이터 기반)

| 이슈 | 상세 | 우선도 |
|------|------|--------|
| Ch.6~7 돌파율 낮음 | HybridPlayer 기준 Ch.7 = 7/10 | 중 |
| level_12_hp_gauntlet 병목 | AI 다회 시도 필요, 범용적 병목 | 중 |
| level_13_cliff AI 수렴 불가 | Pit 지형이 AI에 불리, 수동만 가능 | 하 (의도적?) |
| 미끄러운 던전 (Ch.6) | 수동/AI 모두 어려움 | 하 (의도적 난이도) |
| 수동 플레이 ~100배 저렴 | 경제적으로 수동이 압도적 우위 | 중 (의도 확인 필요) |

### UX 이슈

| 이슈 | 상태 | 상세 |
|------|------|------|
| ~~Food 0 경고 없음~~ | ✅ 해결 | 빨간 경고 배너 + HP 바 색상 (2026-02-25) |
| ~~정보 구매 UI 미구현~~ | ✅ 해결 | 브리핑 오버레이에서 힌트 표시, 던전맵에 ? 배지 |
| 아이템 사용 UI 미구현 | 미해결 | run-state.js에 인벤토리 있으나 사용/구매 UI 없음 |
| NG+ UI 미구현 | 미해결 | 엔딩 후 NG+ 로직은 있으나 UI 흐름 부족 |
| ~~튜토리얼 없음~~ | ✅ 해결 | 5단계 컨텍스트 튜토리얼 + 프로그레시브 디스클로저 |

### 기술 부채

| 항목 | 상세 |
|------|------|
| main.js 비대 | ~3100줄, UI+로직 혼합 — Act 2 전에 분리 권장 |
| 테스트 커버리지 | Node.js 유닛 테스트 91개 있으나, 통합 테스트 부족 |
| favicon.ico 없음 | 브라우저에서 404 (기능 영향 없음) |

---

## 3. 추천 다음 작업 (우선순위순)

### Option A: Act 1 나머지 폴리시

> 이미 대부분 완료. 남은 것만 마무리.

1. **아이템 UI** — 아이템 구매/사용 UI (긴급 탈출, 함정 무효 등)
2. **NG+ 전환 UI** — 엔딩 → NG+ 흐름 개선
3. **밸런스 미세 조정**
   - `node sim/run-balance.js 50 all 2>/dev/null` 로 대량 테스트
   - Ch.6~7 보상 증가 또는 비용 감소
   - level_12_hp_gauntlet 맵 조정 검토
   - 수동/AI 비용 격차 줄이기 (운영비 추가 인하 or 식량 비용 증가)

### Option B: Act 2 설계 & 프로토타입 (야심찬 선택)

> 게임의 다음 막 — 던전 마스터 모드

Act 2 핵심 (GAME_LOOP_REDESIGN.md 섹션 2):
```
━━━ Act 2: 던전 마스터 (솔로, 공방전) ━━━━━━━━━
  던전 에디터 해금 — 내 던전을 설계하고 방어
  AI 던전 마스터가 세르파를 보내 침공
  동시에 적 던전도 공략 — 공격 vs 방어 자원 분배
  타임 어택: 적이 내 던전 뚫기 전에 적 던전 먼저 클리어
```

필요한 작업:
1. **Act 2 상세 설계 문서** (GAME_LOOP_REDESIGN.md 확장)
   - 던전 에디터 스펙
   - AI 침공 시스템 (적 세르파 AI)
   - 공격/방어 자원 분배 메커니즘
   - 타임 어택 규칙
2. **main.js 리팩토링** (Act 2 전 필수)
   - 현재 ~3100줄 모놀리스 → 모듈 분리
   - GameEngine / UIController / TrainingManager 등
3. **던전 에디터 기반 재활용**
   - Phase 10에서 구현한 에디터 (`web/editor.html`) 활용 가능
4. **프로토타입**: 방어 모드 (내 던전에 AI 세르파 침입)

### Option C: main.js 리팩토링 (기반 강화)

> Act 2 진행 전 기술 부채 해소

1. `main.js` → 모듈 분리
   - `GameEngine.js`: 게임 로직 (trainDungeon, handleVictory, farming)
   - `UIController.js`: DOM 조작, 오버레이, 이벤트
   - `TrainingManager.js`: AI 훈련 루프
   - `ManualPlayManager.js`: 수동 플레이 + 식량
2. 공유 인터페이스 정리 (game-config.js 확장)
3. 통합 테스트 추가

---

## 4. 실행 가이드

### 브라우저 게임 실행
```bash
cd web && python -m http.server 8080
# 또는
npx http-server web -p 8080
# 브라우저에서 http://localhost:8080
```

### 밸런스 시뮬레이터 실행
```bash
# 전체 전략 10회씩
node sim/run-balance.js 10 all 2>/dev/null

# 특정 전략만
node sim/run-balance.js 5 HybridPlayer 2>/dev/null
```

### Node.js 코드 테스트 패턴
```bash
# 개별 모듈 테스트
node --input-type=module -e "
import { RunState } from './web/js/game/run-state.js';
const rs = new RunState();
console.log(rs.gold);  // 800
" 2>/dev/null
```

---

## 5. 핵심 파일 가이드

| 파일 | 역할 | 읽어야 할 때 |
|------|------|-------------|
| `docs/GAME_LOOP_REDESIGN.md` | 게임 디자인 전체 (~500줄) | Act 2 설계 시 |
| `web/js/main.js` | 게임 코어 (~3100줄) | 기능 추가/수정 시 |
| `web/js/game/game-config.js` | 상수/알고리즘 매핑 | 밸런스 조정 시 |
| `web/js/game/run-state.js` | 상태 관리 + 데이터 테이블 | 시스템 이해 시 |
| `web/js/game/toast.js` | 토스트 알림 | UX 수정 시 |
| `web/js/game/dungeon-map.js` | 시각적 던전 맵 | 던전 UI 수정 시 |
| `web/js/game/briefing.js` | 던전 브리핑 오버레이 | 던전 진입 흐름 수정 시 |
| `web/js/game/tutorial.js` | 튜토리얼 + 프로그레시브 디스클로저 | 온보딩 수정 시 |
| `sim/simulator.js` | 시뮬레이터 | 밸런스 분석 시 |
| `sim/strategies.js` | 전략 정의 | 새 전략 추가 시 |

### 디자인 문서
- `docs/GAME_LOOP_REDESIGN.md` — 3막 구조, 세르파 시스템, 경제, 던전 설계
- `docs/GDD.md` — 원본 GDD
- `docs/devlog/` — 작업 기록 (날짜순)

### MEMORY.md (에이전트 자동 메모리)
- 위치: `C:\Users\c\.claude\projects\C--RLD\memory\MEMORY.md`
- 프로젝트 상태, 밸런스 결과, 구현 세부사항 기록
- 새 작업 완료 시 업데이트 권장

---

## 6. 주의사항

- **알고리즘 파일 15개는 건드리지 않음** — 논문 기반 구현, 변경 시 논문 확인 필수
- **확률 요소 추가 금지** — 알고리즘 정책 이외의 랜덤 요소 없음 (설계 원칙)
- **main.js 수정 시 주의** — 모놀리스라 사이드 이펙트 가능, localStorage 저장 구조 변경 시 마이그레이션 필요 (`run-state.js:SAVE_VERSION`)
- **시뮬레이터와 main.js 동기화** — 게임 로직 변경 시 양쪽 모두 반영 (현재 firstReward 등 일부 로직이 따로 구현)
- **UI 모듈 4개 독립적** — toast.js, dungeon-map.js, briefing.js, tutorial.js는 기존 알고리즘/로직 파일과 무관
