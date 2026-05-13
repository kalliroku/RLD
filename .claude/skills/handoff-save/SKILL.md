---
name: handoff-save
description: 현재 세션 컨텍스트를 .claude/handoff/<slug>.md 로 dump. PM 핸드오프 (docs/PM/handoffs/) 가 작업 사이클 인계라면, 이건 *세션 단위* 스크래치 — in-flight 작업·열린 질문·다음 즉시 행동을 박제. 파일은 .gitignore 되므로 머신/repo 본체와 분리.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(ls:*), Bash(mkdir:*), Read, Write, AskUserQuestion
argument-hint: "<slug>  (예: t2b2-modifier-mvp, b109-sim-integration)"
---

## Current Status

- Working dir: !`pwd`
- Git status: !`git status --short`
- Recent commits: !`git log --oneline -5`
- Existing handoffs: !`ls .claude/handoff/ 2>/dev/null || echo '(empty)'`

## Task

현재 세션의 in-flight 컨텍스트를 `.claude/handoff/<slug>.md` 로 저장. 다음 세션이 `/handoff-load <slug>` 로 즉시 재개 가능하도록.

### Step 1: slug 결정

- `$ARGUMENTS` 에 slug 가 있으면 그대로 사용 (kebab-case 권장)
- 없으면 AskUserQuestion 으로 받기:
  - 질문: "이 세션의 slug 를 정해주세요 (kebab-case, 예: t2b2-modifier-mvp)"
  - 옵션 없이 자유 입력 (사용자에게 직접 받음 → "Other" 슬롯)

slug 검증:
- `^[a-z0-9-]+$` 패턴
- 기존 파일과 충돌 시: "덮어쓰기 / 신규 (slug 뒤에 `-v2` 추가) / 취소" 질문

### Step 2: 컨텍스트 수집

다음 5개 영역을 *현재 대화 + git 상태* 에서 추출:

1. **작업 중 (in-flight)** — 이번 세션에서 진행 중이지만 끝나지 않은 것. TaskList 의 in_progress + pending 항목, 미커밋 변경 (`git status` + `git diff --stat`)
2. **결정된 것** — 이번 세션에서 박힌 결정 (DECISIONS.md 에 들어갔거나 들어갈 D-* 항목). 결정 ID 와 한 줄 요약
3. **다음 즉시 행동** — 다음 세션이 첫 turn 에서 할 일. 구체적 명령 또는 작업 ID
4. **열린 질문** — 사용자에게 물어야 하지만 아직 답 못 받은 것. 자율 결정 불가 항목
5. **변경 파일** — `git status` + `git diff --stat`. 새 파일은 `(NEW)` 마크

### Step 3: 핸드오프 파일 작성

경로: `.claude/handoff/<slug>.md`

프론트매터:
```yaml
---
slug: <slug>
created: <YYYY-MM-DD HH:MM TZ>
status: active   # active / closed / superseded
pm_handoff_ref: docs/PM/handoffs/<latest>.md   # 관련 PM 핸드오프 링크 (없으면 null)
session_summary: <한 줄 요약, 30자 내외>
---
```

본문 템플릿:
```markdown
# 핸드오프 — <session_summary>

## 0. 한 줄 정체성 (RLD 불변)

> 알고리즘이 곧 캐릭터인 시드 기반 로그라이크 — 매 런 다른 모디파이어 아래 한정된 세르파 풀로 던전을 답파한다. RL 교육은 부산물.

## 1. 작업 중 (in-flight)

- [task subject] — 현재 상태 / 남은 sub-step
- ...

## 2. 결정된 것 (이번 세션)

- **D-YYYY-MM-DD-N** ✅ <한 줄 요약>
- ...

## 3. 다음 즉시 행동

다음 세션의 첫 turn 에서:

1. `/handoff-load <slug>` (이 문서 자동 로드)
2. <구체적 명령 또는 작업 ID> — <왜>
3. ...

## 4. 열린 질문 (사용자 결정 대기)

- [Q] <질문 본문> — 자율 결정 불가 사유
- ...

## 5. 변경 파일 스냅샷

### Staged
- (없음 / <파일 목록>)

### Unstaged
- <파일 path> — <한 줄 변경 요지>
- ...

### Untracked
- <파일 path> (NEW) — <의도>
- ...

## 6. 참조

- PM 핸드오프: <pm_handoff_ref>
- 관련 결정: D-*, D-*
- 직전 커밋: <hash> <title>
```

### Step 4: 결과 보고

저장 완료 후:
- 경로 + slug 안내
- 파일 size (라인 수) 안내
- 다음 세션 재개 명령 예시: `/handoff-load <slug>`
- PM 핸드오프 갱신 여부 점검 — 작업 사이클이 마감되었다면 `docs/PM/handoffs/` 에 별도 PM 인계 작성 권장

## 메모

- 이 스킬은 *세션 단위* 컨텍스트 dump 가 목적. 작업 사이클 인계 (T2B-2 → B-109 같은) 는 `docs/PM/handoffs/` 에 별도 작성
- `.claude/handoff/` 는 `.gitignore` 됨 — git 에 안 들어감, 머신 로컬
- slug 충돌 시 덮어쓰기 결정은 사용자 몫
- PM 핸드오프 (tracked) 와 이 로컬 핸드오프 (ignored) 의 *경계*:
  - PM: 작업 ID 단위 (T2B-2 / B-109), 마일스톤 전환 정당화, 누구나 zero-base 진입 가능
  - 로컬: 세션 단위, *직전 사용자와의 대화 맥락* 보존, 같은 사용자가 이어붙이기 위한 도구
