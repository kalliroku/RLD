---
name: handoff-load
description: .claude/handoff/<slug>.md 를 읽고 직전 세션 컨텍스트로 작업 재개. slug 생략 시 목록 + status 표시. PM 핸드오프 (docs/PM/handoffs/) 와는 별개 — 이건 *세션 단위* 스크래치 로딩.
allowed-tools: Bash(ls:*), Bash(git status:*), Bash(git log:*), Bash(cat:*), Read, AskUserQuestion
argument-hint: "<slug>  (생략 시 목록 표시)"
---

## Current Status

- Working dir: !`pwd`
- Available handoffs: !`ls -la .claude/handoff/*.md 2>/dev/null || echo '(empty)'`
- Git status: !`git status --short`

## Task

직전 세션의 `.claude/handoff/<slug>.md` 를 로드해서 작업을 즉시 재개. 컨텍스트 가져온 후 *현재 상태와의 차이* 를 점검해서 stale invariant 가 있으면 사용자에게 알림.

### Step 1: slug 해소

**`$ARGUMENTS` 에 slug 있을 때**:
- `.claude/handoff/<slug>.md` 가 존재하면 Step 2 진행
- 없으면 목록에서 가장 가까운 slug 추측해서 제안 (AskUserQuestion)

**`$ARGUMENTS` 없을 때**:
- `.claude/handoff/*.md` 목록을 status / created / session_summary 와 함께 표시:
  ```
  <slug-1>   active    2026-05-12  T2B-2 모디파이어 MVP 인계
  <slug-2>   closed    2026-05-10  Kiosk cycle 1
  ...
  ```
- AskUserQuestion 으로 어느 slug 를 로드할지 받기 (없으면 종료)

### Step 2: 핸드오프 로드

`Read` 로 `.claude/handoff/<slug>.md` 전체 읽기. 프론트매터 + 본문 6개 섹션 모두 파싱:

1. 한 줄 정체성 (불변)
2. 작업 중 (in-flight)
3. 결정된 것
4. 다음 즉시 행동
5. 열린 질문
6. 변경 파일 스냅샷
7. 참조

### Step 3: 현재 상태와의 정합성 점검

다음을 *현재 상태* 에서 확인 후 불일치 표면화:

1. **`pm_handoff_ref`** 가 가리키는 PM 핸드오프 파일이 여전히 존재하는가
2. **§5 변경 파일 스냅샷** 의 staged/unstaged/untracked 가 현재 `git status` 와 일치하는가
   - 일치 → "직전 세션 종료 후 추가 변경 없음" 보고
   - 불일치 → 어떤 파일이 *그 사이 커밋되었는지* / *추가 변경되었는지* 분리해서 보고
3. **§1 in-flight 작업** 의 task 가 TaskList 에 남아있는가 (있으면 in_progress 상태로 재개)
4. **§4 열린 질문** 중 사용자가 답변한 것이 있는가 (있으면 보고, 없으면 첫 turn 에서 다시 묻기 권장)

### Step 4: 작업 재개 안내

다음을 사용자에게 한 번에 보고:

```
## 핸드오프 로드 완료 — <slug>

직전 세션 요약 (<created> 저장):
> <session_summary>

### 작업 중이던 것
- <§1 내용 압축>

### 다음 즉시 행동
1. <§3 첫 항목>
2. ...

### 변경 파일 정합성
- 직전 세션 이후 새 커밋 N건: <hash 목록>
- 신규 unstaged/untracked: <목록 or 없음>
- 직전 세션이 남겨둔 in-flight 파일: <목록 + 현재 상태>

### 열린 질문 (대기 중)
- [Q1] ...
- [Q2] ...

PM 핸드오프 참조: <pm_handoff_ref> (변경 여부: 동일 / 갱신됨)

이대로 진행하시겠어요? 또는 어느 항목부터 시작할까요?
```

만약 **stale invariant** (예: §1 의 in-flight 파일이 그 사이 다른 사람/세션에서 수정됨) 가 감지되면 *명시적 경고* 후 사용자 확인을 받음.

### Step 5: 진행

사용자가 OK 하면 `§3 다음 즉시 행동` 의 첫 항목부터 실행. 첫 항목이 작업 ID (예: B-109.1) 면 해당 ID 의 명세를 PM 핸드오프 또는 BACKLOG 에서 다시 확인 후 진입.

## 메모

- 이 스킬은 *직전 사용자와의 대화 맥락* 을 보존한 핸드오프를 위한 도구. zero-base 신규 에이전트 진입 (PM 핸드오프 + STATUS + BACKLOG + VISION) 과는 별 절차
- 로드 후 `.handoff/<slug>.md` 의 frontmatter `status` 를 `closed` 로 자동 갱신하지 *않음* — 사용자가 명시적으로 마감할 때까지 active 유지 (긴 사이클 동안 여러 번 load/save 반복 가능)
- 충돌 (현재 git status 가 §5 스냅샷과 크게 어긋남) 시: 사용자에게 정확히 어디가 다른지 보고하고 진행 여부 확인
