---
name: commit
description: RLD staged 변경을 korean-git-reviewer 사전 실행 + Critical/Warning 분류 + 인터랙티브 결정 후 커밋. RLD 정체성 (D-2026-05-12-4) 위배 / 결정론 깨짐 / 캠페인 발란스 25.5/27 ± 2 이탈 / hidden invariant 누락을 Critical 로 차단.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git commit:*), Bash(git add:*), Agent, AskUserQuestion
argument-hint: "[커밋 메시지 (선택, 영문 imperative)]"
---

## Current Status

- Full status: !`git status --short`
- Staged stat: !`git diff --staged --stat`
- Unstaged stat: !`git diff --stat`
- Recent commit style (RLD): !`git log --oneline -5`

## Task

스테이징된 RLD 변경을 커밋합니다. **korean-git-reviewer 사전 실행이 필수**.

### Step 1: 스테이징 확인

- staged 가 비어있으면 untracked + modified 목록을 보여주고 `git add <files>` 가이드 후 종료
- staged 가 있으면 다음 단계로
- `.env` / `credentials*` / `*.pth` / `saved_models/` 같은 민감/대용량 파일이 staged 면 사용자 확인 후 진행

### Step 2: 코드 리뷰 (필수)

`korean-git-reviewer` 에이전트를 호출. 다음 컨텍스트를 함께 전달:

- 작업 출처: 현재 인계 문서 (`docs/PM/handoffs/<latest>.md`) 의 §1 마감 스냅샷
- 관련 결정: `docs/PM/DECISIONS.md` 의 D-* 항목 (특히 D-2026-05-12-4 정체성 verdict)
- 검증 상태: 이미 통과한 검증 (sim 회귀 수치, agent-browser visual, 결정론 테스트)
- 리뷰 요청 관점 (작업 성격에 맞춰 선택):
  1. **결정론 안전성** — Math.random 누락 / seeded RNG 분리
  2. **데일리 ↔ 캠페인 격리** (D-2026-05-12-8) — modifier 잔존, fog 미복원, 이코노미 누락
  3. **AI 측 비용 상수 보호** — `BASE_OP_COST` / `MAX_EPISODES` / `CONVERGENCE_THRESHOLD` 절대 수정 금지 (D-4)
  4. **정체성 카피 정합성 (D-4)** — 가차 흔적, 학술 용어 노출, 알고리즘명 일반 명사화
  5. **legacy 등가성** — 시야 감쇠 / slip 모델 / 식량 모델 같은 기존 발란스가 깨지지 않았는가
  6. **인계 누락** — 다음 에이전트 진입 시 막힐 hidden invariant 표면화

리뷰 지적은 **Critical / Warning / Info** 3-tier 로 받음.

#### Critical Issues (🚨 차단)

- 결정론 깨짐 — Math.random 도입 / seeded RNG salt 충돌 / Object.keys 순서 의존 변경
- 정체성 위배 (D-2026-05-12-4) — 한 줄 정체성 모순, 가차 흔적 부활, "AI 가 인간보다 강하다" 카피 도입, 던전 마스터 모드 메인 격상
- 라이프사이클 누락 — modifier 잔존, fog 미복원, lastPlayCharacter/lastPlayDungeon 미복원 같은 hidden invariant
- 데이터 손실 위험 — localStorage 키 충돌, save migration 누락, NG+ 가 데일리 이력 덮어쓰기
- 캠페인 발란스 위반 — `BASE_OP_COST` / `MAX_EPISODES` / `CONVERGENCE_THRESHOLD` 변경, 또는 sim 측정 시 25.5/27 ± 2 이탈
- 보안 — `.env` / 토큰 / saved Q-table 노출

#### Warnings (⚠️ 진행 허용)

- 정체성 카피 미세 어긋남 — 알고리즘명 일반 명사화 누락 (예: "사르사" → "세르파")
- 영문/한국어 혼재 — game-over cause 같은 사용자 노출 텍스트
- 주석/문서 정합성 — D-* 룰을 코드는 따르지만 주석은 모호
- 매직 넘버 — `CONVERGENCE_WINDOW` 같은 export 가능한 상수의 하드코딩
- 방어적 코딩 여지 — `reset()` 의 명시 클리어 같은 fail-safe 누락

#### Info (참고만)

- 스타일 / 리팩토링 제안
- 커밋 범위가 의미 단위 분리 권장 영역 (Critical 의 큰 변경 게이트로 별도 처리)
- 미세 성능 개선 / future-proofing

### Step 3: 리뷰 결과 따른 인터랙티브 분기

**Critical 발견 시 🚨**:

AskUserQuestion:
- 질문: "Critical N건 발견 — 어떻게 진행할까요?"
- 옵션:
  1. "차단 — fix 후 재커밋 (강력 권장)"
  2. "BACKLOG.md 박제 후 커밋 (별 항목으로 fast-follow)"
  3. "강제 커밋 (비권장, 메시지에 ⚠️ 마커)"

분기:
- 1 → 차단 + 이슈 위치 file_path:line 표시, 작업 재개 안내
- 2 → BACKLOG.md 에 항목 신설 (간단한 비고 + Critical 출처 명시) 후 Step 4 진행
- 3 → 메시지 첫 줄에 `⚠️` prefix + Step 4 진행

**Warning 만 발견 시 ⚠️**:

AskUserQuestion:
- 질문: "Warning N건 발견 — 어떻게 진행할까요?"
- 옵션:
  1. "그대로 커밋 (권장)"
  2. "Warning 먼저 fix 후 커밋"
  3. "Warning 상세 보기"

분기:
- 1 → Step 4
- 2 → 차단 + Warning 목록 표시 (fix 후 사용자가 다시 `/commit` 호출)
- 3 → 상세 출력 후 같은 질문 재시도

**이슈 없음 ✅** → Step 4 직접 진행

**큰 변경 게이트** (15+ files 또는 +500 라인 — RLD 컨텍스트에서 임계 조정):

AskUserQuestion (Critical/Warning 처리와 *동시에* 묻지 말고, 둘 다 통과한 후 마지막에 묻기):
- 질문: "변경 규모가 큽니다 (파일 X / +Y/-Z). 분리 검토할까요?"
- 옵션:
  1. "단일 커밋 진행"
  2. "의미 단위 분리 가이드 (T2B / B-XXX / docs)"
  3. "취소"

분기:
- 1 → Step 4
- 2 → 차단 + 분리 제안 (예: "T2B-2 핵심 / Act1 후속 B-* / PM docs" 3-way) + `git reset` 후 의미 단위로 `git add` 가이드
- 3 → 취소

### Step 4: 커밋 메시지 작성

**RLD 메시지 컨벤션** (직전 커밋 스타일과 일치):

- 제목 첫 단어: 영문 imperative — `Add`, `Fix`, `Update`, `Refactor`, `Remove`, `Doc`
- 제목 70자 이내, 본문은 한국어 + 영문 혼용 자유
- Conventional Commits 의 `feat:`/`fix:` 접두는 **사용 안 함** (RLD 직전 스타일 보존)
- 본문에 다음 포함 권장:
  - 핵심 변경 (모듈/파일 단위 한 줄 요약)
  - 관련 D-* 결정 ID
  - 검증 결과 한 줄 (sim 회귀 수치 / visual 통과 / 결정론 수치)

**금지**:
- 🤖 "Generated with Claude Code" 푸터
- Co-Authored-By 태그 (사용자 명시 요청 시에만)
- Conventional Commits 접두 (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`)
- "as discussed", "based on review" 류 자기참조 / 메타 멘트 — RLD 메모리 [메타 자기참조 메시지 금지] 룰 준수

**리뷰 마커**:

리뷰가 통과되어 커밋이 진행되는 모든 경우, 제목 끝에 `[reviewed]` 추가.

예시:
```
Add T2B-2 modifier MVP (daily-only: slippery / two_only / heavy_fog) [reviewed]

- modifiers.js: mulberry32 per-effect salt PRNG 스트림 분리 (D-2026-05-12-4)
- daily-mode.js: getDailyChallenge 가 모디파이어 1개를 시드에서 픽
- agent.js: modifierSet / visibilityRange + _resolveAction 분기 (D-10 grid 우선)
- main.js: activeModifierSet 라이프사이클 + two_only character picker + 모디파이어 띠

Refs: D-9 / D-10 / D-11. 검증: slip 0.300/10k, 캠페인 회귀 sim 25.0/27 ✓.
```

**argument 처리**:

- 있을 때: `$ARGUMENTS` 를 제목으로 사용. 끝에 `[reviewed]` 없으면 추가. 본문은 자동 생성 안 함 (사용자가 제공한 메시지 신뢰)
- 없을 때: 변경 분석 후 메시지 초안 작성. 다음 출처를 우선 참조:
  1. 직전 인계 문서 (`docs/PM/handoffs/<latest>.md`) 의 §1 작업 ID
  2. `docs/PM/BACKLOG.md` Done 섹션의 갱신 행
  3. 변경된 파일 path + 핵심 결정 D-* ID

**확인**:

AskUserQuestion:
- 질문: "생성된 커밋 메시지: '<제목>'. 사용?"
- 옵션:
  1. "사용 (권장)"
  2. "수정 (사용자 입력 받음)"
  3. "다시 생성"

### Step 5: 커밋 실행

HEREDOC 으로 멀티라인 메시지 전달 (개행 안전):

```bash
git commit -m "$(cat <<'EOF'
<제목> [reviewed]

<본문>
EOF
)"
```

`--no-verify` / `--no-gpg-sign` 금지. pre-commit hook 실패 시:
- 원인 분석 → fix → 재스테이지 → 새 커밋 (`--amend` 절대 금지, 이전 커밋이 사라질 수 있음)

### Step 6: 후속 안내

- `git log -1 --stat` 으로 결과 확인
- `git status` 보고 남은 staged/unstaged 표시
- 푸시는 **사용자 명시 지시 없으면 수행 안 함**
- 다음 단계가 명확하면 (예: 인계 문서 추가 커밋 / sim 회귀 측정) 안내

## 메모

- 이 스킬은 caveduck `/commit` 의 골격을 RLD 컨텍스트로 이식한 것. 차이점:
  - 리뷰어: `code-reviewer` → `korean-git-reviewer` (RLD 의 유일한 리뷰 에이전트)
  - 메시지 컨벤션: Conventional Commits → RLD 직전 스타일 (영문 imperative)
  - Critical 범주: RLD 의 D-* 결정 (정체성 / 격리 / AI 비용 상수 / 발란스 25.5/27 ± 2) 반영
  - `/push` 부재 — `[reviewed]` 마커는 미래 후속 자동화를 위해 보존
- 스킬 자체는 `.claude/` 안에 위치 → git untracked 유지 (RLD 의 `.claude/` 는 .gitignore 미등록이지만 관례상 미커밋)
