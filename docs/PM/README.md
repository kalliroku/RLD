# Project Manager (PM) — RLD

이 폴더는 RLD 개발의 **영속 추적 시스템**입니다. 세션 간 컨텍스트가 끊기지 않도록, 결정·작업·검토 결과를 모두 파일로 박아둡니다.

## 구조

- `STATUS.md` — 한 페이지 현재 상태. **각 세션 시작 시 첫 읽기**.
- `VISION.md` — 출시 1.0 의 *그림* (정체성 / 콘텐츠 스코프 / 타임라인 / 플레이어 여정 / 검증 게이트). 큰 결정 발생 시 함께 갱신.
- `DECISIONS.md` — 시간순 의사결정 로그 (한 줄/결정 + 상세 파일 링크).
- `BACKLOG.md` — 우선순위별 작업 항목 (P0 / P1 / P2 / Tier 2 / 컷).
- `critiques/` — 비판적 검토 결과 아카이브 (3축 / 단축 / 외부 등).
- `decisions/<date>-<slug>/` — 결정별 토론 전문 (advocate-a / advocate-b / mediator / verdict).
- `handoffs/<date>-<slug>.md` — 세션/마일스톤 인계 문서. 다음 에이전트가 zero-base 로 진입할 수 있도록 컨텍스트 + 작업 명세 + 검증 자산 + 자율 결정사항을 한 문서에 정리.

## 운영 원칙

1. 세션 시작 시 `STATUS.md` + `DECISIONS.md` 최근 N 개를 우선 읽는다.
2. 의미 있는 행동 직후 `STATUS.md` 의 "Last updated" 와 활성 결정/in-progress 섹션을 갱신한다.
3. 모든 큰 결정은 `DECISIONS.md` 에 1 줄 + 상세 파일 링크로 박는다. ID 는 `D-YYYY-MM-DD-N` 형식.
4. **갈래 결정**은 "옹호 vs 옹호 + (필요 시) 중재자" 패턴으로 기록한다 → `decisions/<date>-<slug>/`.
5. 비판적 검토 (기획자 / UX / 리텐션 등) 결과는 원문 그대로 `critiques/` 에 보존하고, 그로부터 도출된 작업 항목만 `BACKLOG.md` 로 옮긴다.

## 상태 마커

- ✅ resolved
- ⏳ pending / in-progress
- ❌ rejected
- 🔁 superseded (대체된 결정)
