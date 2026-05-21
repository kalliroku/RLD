# 인계 — M5 후반 cleanup (rename + itch closure + BGM 4트랙) → 1.0 게이트 직전

| 항목 | 값 |
|---|---|
| 인수일 | 2026-05-21 |
| 인계자 | M5 후반 cleanup 사이클 (3 commits origin/main push 완료) |
| 인계 대상 | 다음 작업 에이전트 (M5 → 1.0 게이트 — BGM 시청 검증 / W7 narrative / 자체 플레이테스트) |
| 예상 작업 기간 | 1.0 출시 직전 ~5~6주 (VISION §5). 다음 1주 권장: BGM 시청 ear-test + 톤 fix → A showMessage 분류 1단계 → W7.2/4/5 narrative 진입 |
| 진입 후 첫 행동 | `STATUS.md` + 이 문서 + `.claude/handoff/w7-narrative-cycle1.md` 읽고 BGM 시청 (`https://kalliroku.github.io/RLD/play.html`) 또는 잔여 항목 선택 |

---

## 0. 한 줄 정체성 (불변)

> **알고리즘이 곧 캐릭터인 시드 기반 로그라이크 — 매 런 다른 모디파이어 아래 한정된 세르파 풀로 던전을 답파한다. RL 교육은 부산물.**

D-2026-05-12-4 verdict 유지. 본 사이클은 *코드 정체성 영역 무변경* — BGM 추가도 D-4 정체성 보호 방향 (모험가 fanfare 회피 / RL 메타 자기참조 0건 / 학명 노출 0).

추가 박힘 (D-2026-05-21-1): BGM 4트랙 = *절차적 합성* (산업 표준 = 작곡됨, RLD 이탈점은 [[feedback_design_tooling_preference]] Claude 자체 정체성 우선).

---

## 1. 이번 사이클 마감 스냅샷 (3 커밋, origin/main push 완료)

| Commit | 마감 항목 |
|---|---|
| `185beb6` | **master → main rename** ([O1] closure) — 9단계 절차 + Pages env branch policy 동기 (11단계 됨). github-pages environment 의 `master` 만 허용 protection 발견 → `main` policy POST + 기존 master DELETE 로 fix. `workflow.yml:5` + `README.md:82` 두 줄 변경. historical refs (STATUS/BACKLOG/handoff) 는 보존 (historical accuracy). |
| `0252813` | **itch.io 검수 6 Q closure** (B-208.2 draft 정합화) — Q1 slug=rld / Q2 ko 183자 / Q3 $0 + tip 제거 / Q4 EN+KO 통합 / Q5 daily.compare 유지 / Q6 PPO `sim/` 한정. `docs/PM/release/itch-io-draft.md` 8 영역 박힘 (Pricing + URL slug 본문칸 + Tagline KO 헤더 + 체크리스트 6건 + PPO 표기 EN/KO + 메타 자기참조 검수 + Q5 신규 항목). 게임 코드 변경 0. korean-git-reviewer 1회 사이클 W-1/W-2/W-3 + I-1 동시 fix. |
| `41ac033` | **BGM 4트랙 도입** ([O2] closure, **D-2026-05-21-1**) — Web Audio raw 절차적 합성. 신규 `web/js/game/music.js` 470 lines (MusicManager 클래스, sound.js 패턴) + main.js _bgmTrackFor 헬퍼 + loadDungeon/loadDailyDungeon 트랙 전환 + play.html music-toggle UI + i18n 양사전 1쌍. korean-git-reviewer 2회 사이클 C-1/C-2/C-3 + W-1/W-2/W-3 fix. |

### 측정 결과

#### sim 무영향
본 사이클 변경 — `sim/` 디렉토리 0건. BGM 은 `web/` 전용, `music.js` 안 import 0. 직전 측정 (W17, 2026-05-20) `node sim/run-balance.js --runs=5` HybridPlayer Avg 25.0~25.4/27 ± 2 범위 ✓ 유지.

#### dict 검증
- ko: 418키 / en: 418키 / 누락 0 (BGM 토글 1쌍 추가)
- D-2026-05-15-16 양사전 동시 갱신 룰 정합

#### syntax + 게이트
- `node --check` (music.js / main.js / dict-{ko,en}.js / *.html) 모두 통과
- `MusicManager.trackForDungeon` 미정의 호출 잔존 0건 ([[feedback_static_check_call_existence]] 사례 박힘 + fix)

### 비-자명 결정 (DECISIONS.md 박제 완료)

- **D-2026-05-21-1** ✅ BGM 4트랙 — Web Audio raw 절차적 합성. 슬롯 박힘: T1 Ch.1 (level_01~12, A natural minor, 95 BPM, ~45초) / T2 Ch.2 (level_13~20, D minor, 85 BPM, ~60초) / T3 Ch.3 (level_21~27, E phrygian, 105 BPM, ~75초) / T4 데일리 (seed-based, ~30초 무한). 톤 가이드: STORY 박힘 + D-2026-05-15-15 Crisp + 모험가 fanfare 회피. RLD 이탈점 = *절차적 합성* (정체성 우선 의도된 이탈).

---

## 2. 다음 작업 (M5 → 1.0 게이트 잔여)

### 2.1 BGM 시청 검증 + 톤 fix (가장 빠른 다음 진입점)

GitHub Pages 자동 배포 success — `https://kalliroku.github.io/RLD/play.html` 에서 즉시 시청 가능.

**검증 체크**:
- 사이드바 *게임 모드* 의 `BGM` 토글 노출 (sound 토글 옆)
- 던전 진입 — level_01~12 / 13~20 / 21~27 / daily 별 트랙 다름
- 챕터 전환 (e.g. level_03 → level_04) 시 cross-fade 1.5초
- 토글 OFF → ON 으로 끊김 / 재시작

**잔여 톤 fix 후보** (시청 후):
- [B1] 볼륨 0.12 (sound 0.3 대비) — 너무 작거나 큼
- [B2] 작곡 톤 — 멜로디 데이터 / BPM 95-85-105 인상 검증
- [B3] 4트랙 루프 분량 (T1 8 bars / T2 10 bars / T3 12 bars / T4 4 bars) — 너무 짧음/김
- [B4] post-1.0 영역 — 전투 stinger / 진엔딩 트랙 (W7.5 결정 후)

### 2.2 narrative 잔여 사이클 (사용자 협업)

- **A** in-game showMessage ~28건 narrative vs 시스템 분류 — *자율 1단계 가능* (위치/카피/분류 가설 박힘), 사용자 마지막 검수만
- **C** W7.4 모험가 도움 시스템 (가장 큰 사이클)
- **D** W7.5 진엔딩 카피
- **E** W7.2 첫 클리어 overlay + map choice

### 2.3 1.0 게이트 마지막

- **[O3]** 자체 플레이테스트 5명 섭외 (사용자 행동) — 외부 5명 5분 합격률 80%+ 검증

### 2.4 itch.io 출시 직전 잔여

itch-io-draft.md 의 6 Q 마감 ✓ + 후속 W1~W3 잔여 (embed index file / 모디파이어 6+6 분류 / tagline 톤 분리) + 스크린샷 cover 결정 + 자체 플레이테스트 5회 통과 후 Public 전환 (§11 절차).

---

## 3. 위생 / 환경

- **GitHub Actions Pages 배포**: success 누적. 마지막 deploy `41ac033` (BGM 4트랙, 2026-05-21) 자동.
- **default branch**: `main` (rename 후). github-pages environment branch policy 도 `main` 박힘.
- **gh auth 컨텍스트**: `bm-caveduck` 활성 (kalliroku 는 admin 작업 시만 임시 switch). 핸드오프 박힘 `bm-caveduckling` 은 오기였음 — 실제 `bm-caveduck`.
- **agent-browser daemon**: 종료 상태 유지. 다음 브라우저 작업 시 재기동.
- 포트 8765 (dev server) / 9222 (CDP) 청취자 없음.

---

## 4. 참조

### 결정 (이 사이클 직접 관련)

- **D-2026-05-21-1** ✅ BGM 4트랙 절차적 합성 (본 사이클)
- D-2026-05-19-1 (narrative — BGM 톤 가이드 기준)
- D-2026-05-15-15 (영문 톤 Crisp — BGM 정합)
- D-2026-05-12-4 (정체성 — 모험가 fanfare 회피 룰)
- D-2026-05-12-6 (1.0 비전 — BGM 4~6트랙 1.0 게이트)
- D-2026-05-12-8 (데일리 격리 — T4 데일리 트랙 BGM 영역만)

### 메모리 (본 세션 신규 박힘 ⭐)

- ⭐ [[project_rld_chapter_ssot]] — chapter ↔ dungeon 매핑 SSOT (`runState.getChapterForDungeon`, line 162). BGM 사이클 발견
- ⭐ [[project_rld_audio_suspended_ctx]] — AudioContext suspended 처리 패턴 (`_pendingTrack` queue + `resume()` flush). BGM C-2 fix
- ⭐ [[feedback_static_check_call_existence]] — `node --check` 가 call existence 미검증. BGM C-1 차단 사례

기존 메모리:
- [[feedback_no_meta_lessons]] — narrative 박을 때 게임 내 세계관 vs 메타 자기참조 분리
- [[project_rld_runstate_sim_coupling]] — sim baseline 가드 (W6 발견)
- [[feedback_design_tooling_preference]] — Claude 자체 우선 (BGM 경로 C 의 근거)
- [[feedback_rld_identity_trojan]] / [[feedback_rld_screenshot_artifact_drift]] / [[project_rld_dynamic_message_stale]]

### 핸드오프

- 직전 PM 인계: `2026-05-15-i18n-to-launch.md` (M5 후반 i18n + 출시 페이지 사이클)
- 세션 핸드오프: `.claude/handoff/w7-narrative-cycle1.md` (active, 2026-05-19 ~ 본 세션 누적)
- 이전 closed: `m5-launch-1st-pass` (closed 2026-05-19 by w7)

### narrative 출처

- `docs/PM/STORY.md` — 모든 후속 게임 카피의 유일한 출처 (변경 시 DECISIONS 동시 갱신 룰)

---

## 5. 진입 후 첫 행동 권장

1. **BGM 시청 시도** — Pages URL 진입. 4트랙 ear-test. 톤 fix 사이클 진입 여부 결정.
2. 또는 **A 1단계 자율 진행** — main.js 의 28건 showMessage 위치 + 카피 풀이 + narrative vs 시스템 분류 가설 박힘 (1~2시간). 사용자 마지막 검수만.
3. 또는 **W7.2/W7.4/W7.5 narrative 사이클 진입** — 사용자 협업, 큰 사이클.

본 핸드오프 작성자: 2026-05-21 자율 사이클 (사용자 *알잘딱* + *하나씩 쉬운 거 부터* 모드).
