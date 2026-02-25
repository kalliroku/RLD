# 브라우저 인터랙티브 테스트 + firstReward 버그 수정 (2026-02-24)

## 개요

Phase E-1까지 구현된 전체 게임을 브라우저에서 통합 테스트하고,
첫 클리어 보상(firstReward) 미지급 버그를 발견/수정했다.

## 테스트 결과

| 시스템 | 결과 | 세부사항 |
|--------|------|----------|
| 수동 이동 | OK | 화살표 키, 식량 소모 정상 |
| Fog of War | OK | on/off 전환 정상 |
| 게임 오버 | OK | Food 0 이동 → "Food depleted!" |
| New Run | OK | 상태 리셋, Run# 증가 |
| 식량 구매 | OK | 50G → Food 50 |
| AI Instant 트레이닝 | OK | Lv.2, 20ep, 95% 수렴, 6G/ep |
| 첫 클리어 보상 | OK | **버그 수정 후** firstReward 정상 |
| 맵 선택 (Sell/Keep) | OK | Sell +12G, Keep exclusive x4 |
| 파밍 (exclusive) | OK | +45G, exclusive 4→3, 🌾 아이콘 |
| 보물 렌더링 | OK | 금색 다이아몬드 'T' 정상 표시 |
| 보물 수집 | OK | 픽업 메시지 + 클리어 시 +100G |
| 캐릭터 잠금 | OK | 🔒 표시, Ch.1은 Q군만 |
| 던전 해금 | OK | 클리어 시 다음 언록, ✓ 표시 |
| JS 에러 | OK | 없음 (favicon 404만) |

## 버그 수정: firstReward 미지급

### 증상
수동으로 던전을 첫 클리어해도 `firstReward` 골드가 지급되지 않음.
맵 판매/보유 선택에서 주는 골드만 받았음.

### 원인
`main.js:handleVictory()` — 첫 클리어 분기에서 `config.firstReward`를
`runState.gold`에 더하는 코드가 누락되어 있었음.

시뮬레이터(`sim/simulator.js`)에서는 이미 `firstReward`를 지급하고 있었으므로
시뮬레이션 결과에는 영향 없음. 브라우저 게임 경로에서만 빠져있던 버그.

### 수정 (main.js:1886)
```javascript
if (isFirstClear) {
    this.runState.clearedDungeons.add(this.currentDungeon);

    // First clear reward  ← 추가
    const firstReward = config.firstReward || 0;
    if (firstReward > 0) {
        this.runState.gold += firstReward;
    }

    // Unlock next dungeon ...
```

### 검증
- Lv.1 클리어: Gold 750 → 850 (+100G firstReward) + 맵 판매 12G = 862G
- Lv.2 클리어: Gold 742 → 892 (+150G firstReward)
- Lv.5 클리어: Gold 5000 → 5400 (+300G firstReward + 100G treasure)

## 보물 렌더링 확인

`renderer.js:renderTreasure()` + `af0e4be` 커밋에서 이미 구현 완료.
MEMORY.md의 "보물 캔버스 렌더링 미구현" 노트는 오래된 정보였음.

- 금색 다이아몬드 + 글로우 효과 + 'T' 레이블
- Fog of War 연동 (안개 속이면 숨김)
- `carryingTreasure` 시 맵에서 사라짐
- 클리어 시 `collectTreasure()` → 골드 획득

## 커밋

`137d511 Fix missing first clear gold reward in handleVictory`
