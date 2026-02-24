# Act 1 UI/UX Polish — Game-Like Overhaul

**Date:** 2026-02-25

## Summary

Act 1의 모든 백엔드 시스템(식량, 아이템, 힌트, 파밍, NG+)은 완성되었지만 UI가 개발도구처럼 느껴지는 문제를 해결. Darkest Dungeon, Slay the Spire 등을 참고하여 6단계 UI/UX 개선 적용.

## Changes (6 Steps)

### Step 1: Toast Notification System
- **새 파일**: `web/js/game/toast.js` — `ToastManager` 클래스
- 캔버스 위 플로팅 토스트 (max 3개 스택, 3초 auto-dismiss)
- 5가지 타입: gold/damage/success/warning/info (각각 색상 구분)
- Instant training 중 토스트 스킵 (스팸 방지)

### Step 2: Resource Warning System
- HP 바 색상 4단계: green(>60%) → yellow(>30%) → red(>15%) → pulse(≤15%)
- Gold < 50: orange↔red 깜빡임 애니메이션
- Food = 0 + 던전 진행 중: 빨간 경고 배너 ("No food! Your serpa is starving!")

### Step 3: Visual Dungeon Map
- **새 파일**: `web/js/game/dungeon-map.js` — `DungeonMap` 클래스
- 31개 던전 flat dropdown → 7챕터 그룹화 시각 맵
- 노드 상태: 잠금(회색)/해제/클리어(✓)/현재선택(빨간 테두리)
- 미구매 힌트 있는 던전에 "?" 보라색 배지
- 스크롤 가능 (max-height: 340px)
- hidden `<select>` 유지하여 기존 로직 호환

### Step 4: Hint UI Polish
- hint-area에 보라색 배경/테두리 추가
- 비어있을 때 자동 숨김 (`:empty` pseudo-class)
- 던전 맵 노드에 힌트 배지 연동

### Step 5: Pre-Dungeon Briefing Overlay
- **새 파일**: `web/js/game/briefing.js` — `BriefingOverlay` 클래스
- 던전 맵 노드 클릭 → 브리핑 화면 표시
- 내용: 던전명/챕터, 진입비/보상/운영비, 보물, 구매 힌트, 현재 골드/식량
- Quick Provisions: +10 Food / +50 Food 즉석 구매
- Deploy(진입) / Back(취소) 버튼
- Training 중 또는 커스텀 던전은 브리핑 스킵

### Step 6: Tutorial + Progressive Disclosure
- **새 파일**: `web/js/game/tutorial.js` — `TutorialManager` 클래스
- 5단계 컨텍스트 튜토리얼:
  1. `welcome` — 게임 시작 시
  2. `first_clear` — 첫 던전 클리어
  3. `first_train` — 첫 AI 트레이닝 완료
  4. `chapter2` — Ch.2 도달 시 경제 설명
  5. `first_farm_unlock` — 파밍 해금
- localStorage 기반 추적 (한 번만 표시)
- Progressive Disclosure:
  - Farming 섹션: 첫 클리어 후 표시 + "NEW!" 배지
  - Stats/Item Shop: Ch.2 이후 표시
  - "NEW!" 배지: 15초 후 자동 제거

## Files Changed

| File | Type | Lines |
|------|------|-------|
| `web/js/game/toast.js` | NEW | ~60 |
| `web/js/game/dungeon-map.js` | NEW | ~100 |
| `web/js/game/briefing.js` | NEW | ~120 |
| `web/js/game/tutorial.js` | NEW | ~80 |
| `web/index.html` | MODIFIED | +20 |
| `web/css/style.css` | MODIFIED | +350 |
| `web/js/main.js` | MODIFIED | +113 |

## Test Results

| Test | Status |
|------|--------|
| Instant Training (level_02_trap, 20ep) | OK — toast skipped, 100% converge |
| Manual Clear (level_01_easy) | OK — first clear overlay + map update |
| Tutorial Tips (3/5 triggered) | OK — welcome, first_train, farming |
| Progressive Disclosure | OK — Farming section with NEW! badge |
| Briefing Overlay (Lv.01 + Lv.02) | OK — costs, hints, provisions |
| Resource Warnings | OK — food banner, HP bar colors |
| Editor Mode | OK — fully intact |
| Dungeon Map | OK — chapters, badges, node states |
| Console Errors | None (favicon 404 only) |

## Architecture Notes

- 4개 새 모듈 모두 독립적 — 기존 15개 알고리즘 파일 미수정
- `main.js`에서 `showMessage()` 한 곳만 수정하여 토스트 연동
- hidden `<select>` 유지로 기존 dropdown 의존 로직 100% 호환
- CSS-only 애니메이션 (JS 의존 없음) — hp-pulse, gold-blink, food-pulse, badge-pulse
