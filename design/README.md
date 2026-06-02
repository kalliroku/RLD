# design/ — Claude Design 작업 폴더

이 폴더는 **디자인 에이전트(Claude Design)가 소유·관리**합니다. Claude Code(통합 담당)는 여기서 **읽기만** 하고, 게임 코드(`web/`)로 이식합니다.

## 소유권 규칙 (충돌 방지)

| 영역 | 누가 건드림 |
|---|---|
| `design/` | **Claude Design 만** 작성/수정 |
| `web/`, `docs/`, 그 외 레포 전체 | **Claude Code 만** |

→ 두 에이전트가 같은 파일을 절대 편집하지 않으므로 머지 충돌이 원천 차단됩니다. 같은 `main` 브랜치에서 작업해도 안전. (서로의 작업을 보려면 `git pull`/`git fetch` — 레포가 비동기 메시지 버스 역할.)

## 산출물 규칙

- **코드만 commit.** 산출물은 함수 코드(예: `drawFatherPortrait.js`) + 절차적 미리보기(작은 standalone HTML).
- **큰 바이너리 금지.** raster PNG / 임베드 이미지가 박힌 대용량 HTML(수백 KB~MB)은 git 히스토리를 부풀리므로 commit 금지. 컨셉 레퍼런스 등 큰 이미지는 레포 밖(`/Users/bm/Downloads/test/`)에 두고 경로만 노트로 남길 것. (`.gitignore` 가 `design/` 내 이미지/영상 확장자를 차단함)
- **자동 반영 아님.** 여기 코드가 게임에서 바로 도는 게 아니라, Claude Code 가 가져다 `web/`에 이식 + 검수 후 실행됩니다.

## 현재 작업

- **father-portrait** — 절차적 `drawFatherPortrait(ctx, cx, baseY, scale)` 구현.
  - 브리프: `docs/PM/handoffs/2026-06-02-opening-v2-asbuilt-to-claude-design.md` §6
  - 확정 컨셉 레퍼런스: `docs/PM/handoffs/assets/2026-06-02-opening-v2-father-ref-hero.png` (사본 `/Users/bm/Downloads/test/father-ref-hero.png`)
  - 산출물 두기: `design/father-portrait/drawFatherPortrait.js` + 미리보기 HTML
  - 이식 대상(Claude Code 가 처리): `web/js/game/opening-art.js:241` 슬롯 교체 → P5/P6 스왑
