# itch.io 페이지 카피 초안 — RL Dungeon (B-208.2)

| 항목 | 값 |
|---|---|
| 상태 | 초안 (M5 후반, B-208.2 자율 작성) |
| 사용자 검수 | 필요 (톤 / 태그 선정 / 가격 정책 최종 확정) |
| 출시 시점 | M5 → 1.0 게이트 통과 후 itch.io 업로드 |
| 정체성 출처 | D-2026-05-12-4 한 줄 정체성 (VISION §1) + D-2026-05-15-15 영문 카피 톤 (Crisp/Functional) |

---

## 1. Project meta (itch.io 폼)

| 필드 | 값 | 메모 |
|---|---|---|
| URL slug | `kalliroku.itch.io/rld` | 2026-05-21 확정 — GitHub Pages `kalliroku.github.io/RLD/` 와 일관성 우선 |
| Classification | Game | |
| Kind of project | HTML | 브라우저 플레이 (캔버스) |
| Genre | Adventure | 보조: Strategy |
| Tags | `roguelike`, `reinforcement-learning`, `html5`, `procedural-generation`, `dungeon-crawler`, `free`, `indie`, `casual`, `educational`, `daily-challenge` | itch.io 검색 노출 |
| Rating | Everyone | 폭력 = cartoon HP only |
| Pricing | `$0 minimum` + optional "pay what you want" (no suggested tip — donation fully voluntary) | VISION §1 결정 + 2026-05-21 사용자 결정 (tip suggestion 제거, 무료 정체성 우선) |
| Platforms | Browser (HTML5) | 데스크탑 + 모바일 반응형 |
| Mobile-friendly | Yes | B-201/202/204 모바일 트랙 마감 |

---

## 2. Title

```
RL Dungeon
```

---

## 3. Tagline (≤ 60 chars)

EN:
```
An algorithm-as-character seeded roguelike.
```
(44 chars ✓)

KO (본문 내 한국어 섹션, 2026-05-21 EN+KO 통합 확정):
```
알고리즘이 곧 캐릭터인 시드 기반 로그라이크.
```

---

## 4. Short description (~180 chars, search results)

EN:
```
15 RL algorithms appear as 15 Sherpa characters. Each run rolls new modifiers under shifting daily seeds. Clear 27 dungeons with your limited pool. RL education is a byproduct.
```
(175 chars ✓)

KO:
```
15종 RL 알고리즘이 15명의 세르파 캐릭터로 등장. 매 런 다른 모디파이어, 매일 같은 시드. 27개 던전을 한정된 풀로 답파. RL 교육은 부산물.
```

---

## 5. Long description (markdown — main page body)

### 5.1 EN (primary — itch.io 본문)

```markdown
**RL Dungeon** is an algorithm-as-character seeded roguelike. Each run rolls new modifiers, and you clear dungeons with a limited Sherpa pool — algorithms personified.

## Three pillars

- **Seeded Runs** — New modifiers each run (6 environment: slippery / heavy fog / dim torch / poison floor / acid rain / wind gust + 6 constraint: two only / hp cap 50 / mirror input / no heal / damage boost / silent Q = 12 in total). The daily seed is shared by every player — the bedrock of a 10-minute challenge.

- **Algorithms as Characters** — 15 reinforcement learning algorithms appear as Sherpas with distinct personalities. Hover for the academic name; surface tags read *optimistic fool / coward / dreamer / committee / skeptic*.

- **Visual RL Flavor** — Q-value heatmap + policy arrows + sparkline on by default. Learning is plainly visible — but the game itself is the goal.

## Run structure

| Mode | Length | Role |
|---|---|---|
| Campaign run | 30–45 min | Main progression, chapter-based |
| Daily seed | 8–12 min | Shared 10-minute hook |
| Full campaign clear | 6–10 hours | "I beat this game" |
| NG+ | infinite | Q-tables preserved; campaign reset for replay |

## How it plays

- Move with arrow keys or **WASD**
- HP 0 = death. **4 cumulative deaths = campaign restart**
- Check the modifier band at run start → pick your character
- Q-value heatmap color = learned value at each tile (brighter is higher)
- The **Daily** tab uses one shared seed for all players. Compare against your previous run.

## What this is not

- Not a tutorial or course — RL education is a byproduct, not the goal
- Not a benchmark of "AI beats human" — simulators are 100× faster, accepted
- No gacha, no hyperparameter sliders, no leaderboard (V1.0 is backend-free)

## Tech

- HTML5 canvas. No backend (all state in localStorage).
- 15 tabular RL algorithms (Q-Learning, SARSA, Dyna-Q, REINFORCE, Actor-Critic, Expected SARSA, Double Q-Learning, n-step Tree Backup, Prioritized Sweeping, QV-Learning, ACLA, Ensemble, ...) + experimental PPO (in `sim/` tooling, not in-game characters).
- 27 hand-crafted dungeons (5×5 → 50×50) + procedural daily generator.
- Bilingual (Korean / English) — toggle in the top right.
- MIT license. [Source on GitHub](https://github.com/kalliroku/RLD).

## Credits

- Design / Development — kalliroku
- Audio — TBA (BGM in progress)
- Built with Claude Code

---

## 한국어 (Korean)

**RL Dungeon** — 알고리즘이 곧 캐릭터인 시드 기반 로그라이크. 매 런 다른 모디파이어 아래 한정된 세르파 풀로 던전을 답파한다.

### 세 축

- **시드 기반 런** — 매 런 다른 모디파이어 12종 (환경 6: 미끄러운 바닥 / 짙은 안개 / 어둑한 횃불 / 독 바닥 / 산성비 / 돌풍 + 제약 6: 둘만 / HP 50 한도 / 거울 입력 / 회복 봉인 / 데미지 증폭 / 침묵의 학습). 데일리 시드는 모든 플레이어가 공유 — 10분 챌린지의 토대.
- **알고리즘 = 캐릭터** — 15종 RL 알고리즘이 각기 다른 성격의 세르파로 등장. 학명은 hover 툴팁, 표면은 "낙관적 멍청이 / 겁쟁이 / 공상가 / 합의체 / 의심쟁이" 같은 성격 태그.
- **시각적 RL 양념** — Q-value 히트맵 + 정책 화살표 + sparkline 디폴트 ON. 학습이 눈에 보이는 시각 시그니처. 단, RL 교육 자체는 게임 목적이 아닌 부산물.

### 게임 길이

| 모드 | 길이 | 역할 |
|---|---|---|
| 캠페인 런 | 30~45분 | 챕터 단위 메인 진행 |
| 데일리 시드 | 8~12분 | 모든 플레이어 동일 시드, 10분 챌린지 |
| 전체 클리어 | 6~10시간 | "이 게임 깼다" |
| NG+ | 무한 | Q-table 보존, 캠페인 리셋 후 재도전 |

### 조작

- 방향키 또는 **WASD** 로 이동
- HP 0 = 사망. **누적 4 사망 = 캠페인 처음부터**
- 런 시작 시 상단 모디파이어 띠 확인 → 캐릭터 선택
- Q-value 히트맵 색 = 학습한 위치 가치 (밝을수록 높음)
- **Daily** 탭 = 모든 플레이어 동일 시드. 어제 기록과 자기 비교

### 이 게임이 아닌 것

- 튜토리얼이나 강의 아님 — RL 교육은 부산물, 목적 아님
- "AI 가 인간보다 강하다" 입증 아님 — 시뮬레이터 100× 격차 받아들임
- 가차 X, 하이퍼파라미터 슬라이더 X, 리더보드 X (V1.0 무백엔드)

### 기술

- HTML5 캔버스. 백엔드 없음 (모든 상태는 localStorage)
- 15종 RL 알고리즘 (Q-Learning, SARSA, Dyna-Q, REINFORCE, Actor-Critic 등) + 실험적 PPO (`sim/` 도구 한정, 게임 내 캐릭터 아님)
- 27 핸드크래프트 던전 (5×5 → 50×50) + 데일리 절차적 생성기
- 한국어 / 영어 양언어 (우측 상단 토글)
- MIT 라이선스. [GitHub 소스](https://github.com/kalliroku/RLD)

### 크레딧

- 디자인 / 개발 — kalliroku
- 오디오 — 진행 중 (BGM 4트랙 M5 잔여)
- Claude Code 와 함께 만들었습니다
```

---

## 6. Embed options (HTML5 game)

| 항목 | 값 |
|---|---|
| Viewport width | `1280` |
| Viewport height | `800` |
| Mobile orientation | Auto (responsive) |
| Click to launch | Yes (autoplay 미사용 — 첫 진입에서 사용자 의지 확인) |
| Fullscreen button | Enabled |
| Scrollbars | Disabled |
| Frame options | Allow only same origin |
| Index file | `index.html` (랜딩) — 사용자가 "Play" 클릭 후 `play.html` 진입 |
| Upload format | ZIP of `web/` directory contents |

---

## 7. Cover image (630 × 500)

**Status**: 미작성. B-208.1 (스크린샷 캡처) 사이클에서 결정.

**후보 컨셉**:
- 옵션 A: 게임 캔버스 + Q-value 히트맵 시각 (강한 시그니처)
- 옵션 B: "RL DUNGEON" 로고 + 캐릭터 4명 실루엣 + 모디파이어 띠
- 옵션 C: 4-grid 콜라주 — 캐릭터 / 던전 / 학습 시각 / 모디파이어

권장: A — 학습 시각화가 게임의 유일한 시각 시그니처. 첫 인상으로 직진.

---

## 8. Screenshots (4 ~ 6, 1280 × 720 권장)

**Status**: 미캡처. B-208.1 사이클.

**후보 화면**:
1. 캠페인 진행 — 캐릭터 선택 + 던전 입장
2. AI 학습 시각화 — Q-value 히트맵 + sparkline 활성
3. 모디파이어 데일리 — 띠 + 칩 + 데일리 패널
4. 게임 오버 — 사망 한도 (4/4) 표시
5. 길드홀 — Quest / Party / Shop / Map 탭
6. 모바일 view — 하단 탭 바 + 미니맵

---

## 9. Devlog 첫 글 (출시 시점 작성, 미리 박제)

**Title**: `RL Dungeon — 1.0 Released`

**Body 초안** (출시일 결정 시 채움):
- 한 줄 정체성
- 무엇이 만들어졌는가 (M1~M5 요약)
- 왜 이렇게 만들었는가 (D-4 정체성 노선)
- 무엇이 다음에 오는가 (Act 2 던전 마스터 모드)
- 감사 — Claude Code

---

## 10. 검수 체크리스트 (사용자)

- [x] **URL slug 확정 → `rld`** (2026-05-21 결정, GitHub Pages `kalliroku.github.io/RLD/` 와 일관성 우선)
- [ ] Tagline 영문/한국어 본문 톤 OK
- [x] **Short desc 글자 수 결정 → 한국어 183자 그대로 업로드** (2026-05-21, itch.io 실측 후 잘리면 그때 에디트 — 손실 없는 시도)
- [x] **"What this is not" 메타 자기참조 검수** (2026-05-21, EN §100 / KO §149 모두 *byproduct, not the goal* — 교육 의도 차단 방향이므로 [[feedback_no_meta_lessons]] 룰 정합 ✓)
- [x] **가격 정책 → `$0 minimum` + suggested tip 제거** (2026-05-21, 기부 완전 자율, 무료 정체성 우선)
- [ ] 태그 10개 적정 (search 노출 / spam 방지)
- [x] **한국어 섹션 배치 → EN + KO 한 페이지 통합** (2026-05-21, draft 구조 유지, itch 계정 단일 운영)
- [ ] B-208.1 스크린샷 후 cover image / screenshots 4~6 결정
- [ ] **W1**: §6 Embed Index file — itch.io 페이지 자체가 랜딩 역할 → embed 진입은 `play.html` 직접 권장. 업로드용 별 빌드 필요 (web/play.html → ZIP 의 index.html 로 rename, 또는 `release-itch/` 디렉토리 생성). §11 절차 4번 보강
- [x] **W2 마감 → Three pillars 모디파이어 분류 박힘** (2026-05-21, 영문 §75 + 한국어 §126 양쪽 — 환경 6 + 제약 6 = 12 in total. D-2026-05-14-14 인용)
- [ ] **W3**: itch.io tagline (Crisp/Functional) vs 게임 내 `title.tagline` ("Dumb Sherpas, Deep Dungeons" / "멍청한 세르파와 던전 답파") 톤 분리 — 의도된 분리 유지 vs 일치화 결정
- [ ] **NG+ 카피 확인**: 1.0 출시 시점 NG+ = Q-table 보존 + 캠페인 리셋 (modifier pool 확장은 post-1.0 로드맵, VISION §5/§4). 카피 정합 ✓ (2026-05-15 C1 수정 후)
- [x] **PPO 표기 명확화 → `sim/` tooling 한정 명시** (2026-05-21, §107 EN + §156 KO 양사전 박힘 — 게임 캐릭터 오해 차단, D-2026-05-12-4 정체성 보호)
- [x] **daily.compare 카피 결정 → 현 `'X steps under/over yesterday'` 유지** (2026-05-21 W3 closure 재확인, Crisp/Functional 통일 의도, +/- 기호 미도입)

---

## 11. itch.io 업로드 절차 (B-208.3 직후)

1. itch.io 계정 생성 / 로그인 (kalliroku)
2. New Project → Game → HTML
3. 본 문서의 §1~§9 필드 입력
4. itch.io 업로드용 별 빌드 — `web/play.html` 을 ZIP 의 `index.html` 로 rename (itch.io embed 진입점). 의존 자산 (`css/`, `js/`, `assets/`) 그대로 포함. github pages 의 `web/` 와 분리 (별 `release-itch/` 디렉토리 또는 빌드 스크립트). 사유: itch.io 페이지 본문이 이미 랜딩 역할 → embed 에서 또 랜딩이 뜨면 중복
5. 업로드 후 embed preview 확인
6. Visibility = **Restricted (password)** 로 시작 — 자체 플레이테스트 5회 통과 후 Public
7. Public 전환 시 Devlog 첫 글 (§9) 동시 게시
8. README 의 출시 URL 갱신 (`kalliroku.itch.io/rld` → 실제 URL)
9. landing 의 GitHub CTA 옆 itch.io CTA 추가 (i18n: `landing.hero.cta_itch`)
