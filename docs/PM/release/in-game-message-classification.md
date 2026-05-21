# In-game showMessage 분류 가설 (A 1단계)

본 문서는 `web/js/main.js` 의 `showMessage(...)` 영문 박힘 47건에 대한 *narrative vs 시스템* 분류 가설.
사용자 검수 후 자율 i18n 마감 사이클 진입 (W16/W17 패턴 재사용).

작성: 2026-05-21 자율 사이클. 분류 기준 D-2026-05-12-4 + D-2026-05-15-15 + D-2026-05-19-1 + 사용자 톤 가이드 (b).

## 톤 룰 박힘 (분류 기준)

- **D-2026-05-12-4** — 알고리즘=캐릭터, RL 교육 부산물. 표면 카피 학명 회피.
- **D-2026-05-15-15** — 영문 톤 Crisp/Functional. Adventurer-flavored 회피.
- **D-2026-05-19-1 + 사용자 톤 가이드 (b)** — narrative 흡수 = *분위기/현상 + 추상 컬러*. 출처/진영/인물 직접 박힘 0건. "아빠가 얼린", "세르파 길드의 함정" NG.
- **STORY.md §RL 메타 흡수 룰** — "에피소드"→"탐험", "AI 학습"→"세르파 훈련", Q-heatmap = 길드장 옵션.

## 4분류 정의

| 분류 | 적용 영역 | 톤 박힘 |
|------|----------|---------|
| **1. narrative 흡수** | in-game 사건 (CLEAR / DIED / 함정 / 보물 / 던전 진입 등) | narrative 어휘 (탐험/세르파). 톤 가이드 (b). |
| **2. 시스템 학명 보존** | 학습 loop (Visual training / Instant training / NG+ Q-table / 에피소드 / Op 비용) | D-4 학명 보존. Crisp + 학명 박힘. |
| **3. 시스템 Crisp 일반** | 학명 무관 시스템 (Not enough gold / Custom dungeon not found / Bought / Enter a valid amount) | Crisp/Functional. 학명 회피. |
| **4. 편집기/디버깅** | `[Custom]` / `[Dungeon]` / `[Preset]` prefix 박힌 던전 마스터 모드 | 학명 보존 OK (D-3 편집기 영역). |

## 통계

- 전체 `showMessage` 호출: **58건** (line 4119 정의 1건 포함, 실 호출 = 57건)
- 이미 `t()` 박힘: **10건** — 958 (daily.start_msg), 989 (daily.victory composed of t()), 1011 (daily.fail_msg), 1977 (hire.need_gold), 1986 (hire.success), 2677 (modifier_effect.wind_gust), 2696 (food.warn.threshold), 2706 (rope.escape_with_treasure), 2708 (rope.escape), 3928 (hint.purchased)
- **분석 대상**: **47건** (showMessage 호출 사이트) + **7건** (finishTraining callers — 3609 relay 의 영문 literal 출처)
- 분류 분포 가설:
  - **1. narrative 흡수**: **24건** (사용자 톤 가이드 (b) 적용 핵심 영역)
  - **2. 시스템 학명 보존**: **12건** (training / NG+ / Op 비용)
  - **3. 시스템 Crisp 일반**: **13건** (gold / shop / load fail)
  - **4. 편집기/디버깅**: **5건** ([Custom]/[Dungeon]/[Preset]/[charDef.name] prefix)

## 분류 표 — showMessage 호출 47건

| # | line | 현 카피 | 의미 | 분류 | 권장 키 | 비고 |
|---|------|--------|------|------|--------|------|
| 1 | 1666 | `[Custom] ${name} [${charDef.name}]` | 커스텀 던전 로드 안내 (playCustomDungeon) | 4. 편집기 | `editor.msg.custom_loaded` | 학명 보존 OK |
| 2 | 1700 | `[Dungeon] ${name} (${grids.length} Floors) [${charDef.name}]` | 멀티-층 던전 로드 (playMultiStageDungeon) | 4. 편집기 | `editor.msg.multi_dungeon_loaded` | 학명 보존 OK |
| 3 | 1845 | `'Clear previous dungeons first!'` | dungeon map 노드 잠금 차단 (selectDungeon) | 1. narrative | `game.locked.previous_clear_first` | "이전 던전을 답파해야 합니다" |
| 4 | 2228 | `'🔒 Clear previous dungeons first!'` | dungeon-select dropdown 잠금 차단 | 1. narrative | `game.locked.previous_clear_first` (#3 과 동일 키 재사용) | 🔒 이모지 유지 vs 제거 — 사용자 결정 |
| 5 | 2274 | `Bought ${t('item.${id}.name')}! -${item.cost}G` | shop 아이템 구매 성공 | 3. Crisp | `shop.bought_item` (param: name, cost) | "구매 완료! {name} -{cost}G" |
| 6 | 2278 | `'Not enough gold!'` | shop 아이템 골드 부족 | 3. Crisp | `shop.not_enough_gold` | 핵심 시스템 어휘 |
| 7 | 2293 | `'Enter a valid amount'` | food shop 입력 검증 실패 | 3. Crisp | `shop.invalid_amount` | "유효한 수량을 입력하세요" |
| 8 | 2297 | `Not enough gold! Need ${amount}G` | food shop 골드 부족 (구체 금액) | 3. Crisp | `shop.not_enough_gold_specific` (param: amount) | 키 #6 과 분리 (param 박힘 차이) |
| 9 | 2303 | `Bought ${amount} food. Total: ${this.runState.food}` | food shop 구매 성공 | 3. Crisp | `shop.bought_food` (param: amount, total) | "식량 {amount} 구매. 보유: {total}" |
| 10 | 2439 | `'Custom dungeon not found!'` | editor 측 custom stage 로드 실패 | 3. Crisp | `game.msg.custom_not_found` | 편집기 외 영역 (loadDungeon 안) |
| 11 | 2454 | `[Custom] ${customId} [${charDef.name}]${loadNote}` | dropdown 측 custom 로드 (loadDungeon) | 4. 편집기 | `editor.msg.custom_loaded_select` (params: id, char, loadNote) | loadNote 자체도 i18n 필요 — " (Data loaded)" → `editor.msg.data_loaded` 토큰 |
| 12 | 2469 | `'Dungeon not found!'` | dropdown 측 multi-stage dungeon 로드 실패 | 3. Crisp | `game.msg.dungeon_not_found` | |
| 13 | 2475 | `'Failed to resolve dungeon stages!'` | multi-stage resolveDungeon 실패 | 3. Crisp | `game.msg.dungeon_resolve_failed` | |
| 14 | 2503 | `[Dungeon] ${dungeonData.name}${floorInfo} [${charDef.name}]${loadNote}` | dropdown 측 multi-stage 로드 | 4. 편집기 | `editor.msg.multi_dungeon_loaded_select` (params) | floorInfo " ({N} Floors)" 토큰 — `editor.msg.floor_count` |
| 15 | 2534 | `[Preset] ${preset.name} (${preset.stages.length}F) [${charDef.name}]${loadNote}` | preset 다중-층 로드 | 4. 편집기 | `editor.msg.preset_loaded` (params: name, floors, char) | |
| 16 | 2574 | `${name} - Cost: ${cost}G, Reward: ${firstReward}G${hpNote}${slipNote}${charNote}${loadNote}${opNote}` | loadDungeon 진입 시 dungeon info 박힘 | 2. 학명 (hpNote/slipNote/charNote)<br>1. narrative (name/Cost/Reward) **혼합** | `game.msg.dungeon_info` (params: name, cost, reward, ...notes) | **사용자 결정 필요** — 통합 키 vs 분리 키 / "Cost"·"Reward" 한국어 ("입장료"·"보상") 박힘 |
| 17 | 2592 | `Not enough gold! Need ${config.cost}G` | dungeon 입장료 부족 (tryEnterDungeon) | 3. Crisp | `game.msg.entry_not_enough_gold` (param: cost) | "입장료 골드 부족! {cost}G 필요" |
| 18 | 2608 | `Paid ${cost}G to enter. Food: ${food}. Good luck!` | 입장료 지불 후 안내 | 1. narrative | `game.msg.entry_paid` (params: cost, food) | "입장료 {cost}G 지불. 식량 {food}. 행운을 빕니다." narrative 톤 |
| 19 | 2610 | `Game Reset! Food: ${food}. Reach the green goal.` | 무료 던전 진입 리셋 안내 | 1. narrative | `game.msg.reset_intro` (params: food) | "재시작. 식량 {food}. 녹색 목표를 향해 가세요." |
| 20 | 2761 | `'Found treasure! Reach the exit to collect it.'` | 보물 픽업 (탈출까지 보존 필요) | 1. narrative | `game.event.treasure_picked` | "보물 발견! 출구에 도달하면 회수됩니다." |
| 21 | 2780 | `Floor ${stageNum + 1}/${total} reached! Advancing...` | 멀티-층 다음 층 진입 | 1. narrative | `game.event.floor_advanced` (params: cur, total) | "{cur}/{total} 층 도달. 진행 중..." |
| 22 | 2803 | `Emergency escape from pit! Rope consumed. Treasure +${val}G!` | pit 죽음 회피 (보물 보유) | 1. narrative | `game.event.escape_pit_with_treasure` (param: val) | rope.escape 패턴 — 이미 박힘. *키 통합 검토* |
| 23 | 2805 | `'Emergency escape from pit! Rope consumed.'` | pit 죽음 회피 (보물 없음) | 1. narrative | `game.event.escape_pit` | rope.escape 와 중복 — *키 통합 검토* |
| 24 | 2817 | `FELL INTO PIT! Instant death...${lostMsg}` | pit 즉사 (non-builtIn) | 1. narrative | `game.event.fell_into_pit` (param: lostMsg) | "pit 으로 추락. 즉사...{lostMsg}" |
| 25 | 2832 | `Emergency escape! Rope consumed. Treasure +${val}G!` | HP 죽음 회피 (보물 보유) | 1. narrative | `game.event.escape_hp_with_treasure` (param: val) | rope.escape_with_treasure 와 중복 |
| 26 | 2834 | `'Emergency escape! Rope consumed.'` | HP 죽음 회피 (보물 없음) | 1. narrative | `game.event.escape_hp` | rope.escape 와 중복 — 통합 |
| 27 | 2846 | `DIED! Steps: ${steps}${lostMsg}` | HP 죽음 (non-builtIn) | 1. narrative | `game.event.died` (params: steps, lostMsg) | "쓰러졌습니다. 스텝 {steps}{lostMsg}" |
| 28 | 2852 | `'Bump! (-1)'` | 벽 부딪힘 (-1 HP) | 1. narrative | `game.event.bump` | "벽에 부딪혔습니다 (-1)" |
| 29 | 2855 | `'TRAP! HP -10'` | 함정 데미지 | 1. narrative | `game.event.trap` | "함정! HP -10" — 너무 시스템적이면 "독바늘 (-10)" 류 narrative |
| 30 | 2859 | `'HEAL! HP +10'` | 회복 타일 | 1. narrative | `game.event.heal` | "회복 +10" |
| 31 | 2868 | `'Found Gold! +10'` | 골드 픽업 | 1. narrative | `game.event.gold_picked` | "금화 +10" |
| 32 | 2877 | `'MONSTER! HP -30, Defeated! +5G (Pending)'` | 몬스터 처치 (멀티-층, pending 골드) | 1. narrative | `game.event.monster_pending` | "몬스터 처치! HP -30, +5G (확정 대기)" |
| 33 | 2880 | `'MONSTER! HP -30, Defeated! +5G'` | 몬스터 처치 (built-in 확정 골드) | 1. narrative | `game.event.monster_kill` | "몬스터 처치! HP -30, +5G" |
| 34 | 2883 | `'MONSTER! HP -30, Defeated!'` | 몬스터 처치 (daily / custom — no 골드) | 1. narrative | `game.event.monster_kill_no_gold` | "몬스터 처치! HP -30" |
| 35 | 2913 | `CLEAR!${floorInfo} Steps: ${steps}${goldMsg}` | custom/preset 클리어 (no 캠페인 보상) | 1. narrative | `game.event.clear_no_reward` (params: floorInfo, steps, goldMsg) | "답파!{floorInfo} 스텝 {steps}{goldMsg}" *narrative 톤* |
| 36 | 3004 | `CLEAR! +${reward}G (Steps: ${steps})${treasureMsg}` | built-in 캠페인 클리어 (반복 클리어) | 1. narrative | `game.event.clear_campaign` (params: reward, steps, treasureMsg) | "답파! +{reward}G (스텝 {steps}){treasureMsg}" |
| 37 | 3044 | `FIRST CLEAR! Map sold for ${earned}G!` | 첫 클리어 — 지도 판매 선택 | 1. narrative | `game.event.first_clear_sold` (param: earned) | "첫 답파! 지도 판매 +{earned}G" |
| 38 | 3054 | `FIRST CLEAR! Map kept! Exclusive farming: ${exclusiveReward}G x ${exclusiveRuns} runs` | 첫 클리어 — 지도 보관 선택 | 1. narrative | `game.event.first_clear_kept` (params: reward, runs) | "첫 답파! 지도 보관. 독점 농작 {reward}G × {runs}회" |
| 39 | 3139 | `Run #${runNumber} started! Gold: ${gold}G` | 새 런 시작 (startNewRun) | 1. narrative | `game.event.new_run_started` (params: run, gold) | "런 #{run} 시작! 골드 {gold}G" |
| 40 | 3150 | `${charDef.name} is farming! Unassign first.` | farming 중 캐릭터 학습 시작 차단 | 2. 학명 (training 영역) | `training.msg.farming_blocked` (param: name) | "{name} 농작 중. 먼저 해제하세요." |
| 41 | 3158 | `Not enough gold! Need ${opCost}G/episode` | training 시작 시 op 비용 부족 | 2. 학명 | `training.msg.not_enough_gold_per_ep` (param: opCost) | "{opCost}G/탐험 부족" ("에피소드"→"탐험" narrative 흡수 적용) |
| 42 | 3200 | `Visual training started... [${charDef.name}]` | Visual training 시작 안내 | 2. 학명 | `training.msg.visual_started` (param: name) | "시각 학습 시작... [{name}]" |
| 43 | 3428 | `Instant training... [${charDef.name}]` | Instant training 시작 안내 | 2. 학명 | `training.msg.instant_started` (param: name) | "즉시 학습... [{name}]" |
| 44 | 3609 | `(message relay)` | finishTraining 의 7 caller 영문 literal | 2. 학명 | `(별 표 박힘 — 아래)` | relay — 호출자 측 박힘 |
| 45 | 3794 | `${charDef.name} farmed +${gold}G!` (+ optional `Map leaked to market!`) | farming 결과 보고 | 1. narrative (farming = 캐릭터 활동) | `game.event.farmed` (params: name, gold) + `game.event.map_leaked` (별 키) | "{name} 농작 +{gold}G" / "지도 정보가 새어나갔습니다!" |
| 46 | 3870 | `${charDef.name} upgraded to Lv.${newLevel}!` | 캐릭터 레벨업 | 1. narrative | `game.event.char_upgraded` (params: name, lv) | "{name} 성장! Lv.{lv}" — "upgraded" → narrative 어휘 |
| 47 | 3981 | `New Game+ ${ngPlusCount}! Q-tables preserved. Gold: ${gold}G` | NG+ 시작 | 2. 학명 (Q-tables 박힘) | `game.event.ngplus_started` (params: cnt, gold) | "NG+ {cnt}! Q-tables 보존. 골드 {gold}G" *학명 Q-tables 보존* (D-4) |

## 분류 표 — finishTraining 영문 literal 출처 (3609 relay)

| # | line | 현 카피 | 의미 | 분류 | 권장 키 |
|---|------|--------|------|------|--------|
| F1 | 3402 | `Max episodes (${MAX_EPISODES}) reached. Clear: ${rate}%` | Visual training MAX_EPISODES 종료 | 2. 학명 | `training.finish.max_episodes` (params: max, rate) |
| F2 | 3409 | `Converged! Clear: ${rate}% after ${ep} episodes` | Visual until_success 수렴 | 2. 학명 | `training.finish.converged` (params: rate, ep) |
| F3 | 3417 | `Out of gold! Need ${nextCost}G/ep. Clear: ${rate}%` | Visual 골드 소진 | 2. 학명 | `training.finish.out_of_gold` (params: cost, rate) |
| F4 | 3443 | `Out of gold! Need ${opCost}G/ep. Clear: ${rate}%` | Instant 골드 소진 (F3 와 동일 카피) | 2. 학명 | `training.finish.out_of_gold` (F3 와 동일 키 재사용) |
| F5 | 3475 | `Converged! Clear: ${rate}% after ${ep} episodes` | Instant until_success 수렴 (F2 와 동일 카피) | 2. 학명 | `training.finish.converged` (F2 와 동일 키 재사용) |
| F6 | 3489 | `Max episodes reached. Clear: ${rate}%` | Instant MAX_EPISODES 종료 (F1 와 유사) | 2. 학명 | `training.finish.max_episodes_short` 또는 F1 통합 — 사용자 결정 |
| F7 | 3640 | `Stopped at episode ${ep}. Clear: ${rate}%` | 사용자 명시적 stop | 2. 학명 | `training.finish.stopped` (params: ep, rate) |

## 가설 적용 단계 (다음 사이클)

1. **사용자 검수** — 분류 박힘 47 + 7 = 54 항목 OK/NG 결정. 한꺼번에 또는 분류 단위 (4분류) 묶음 검수.
   - 1차 빠른 검수: 4분류 분포 (24/12/13/5) 자체 OK?
   - 2차 세부 검수: 분류 4 (편집기) 가장 짧음 — 5건만 먼저 확정
   - 3차: narrative 흡수 24건 톤 (b) 적용 카피 검수
2. **자율 i18n 마감** (W16/W17 패턴 재사용):
   - dict-ko/en 양사전 키 박힘 (parity 418 → ~470 예상, +50 키)
   - showMessage 호출 t() 치환 (47건 + finishTraining 호출 7건)
   - 중복 키 통합 (rope.escape* vs game.event.escape_*)
3. **검증**: sync-check + dict parity + sim 회귀 0 + 토글 stale 가드 (이전 W11/W12 패턴 — _lastMessage thunk 캐시 적용)

## 잔여 의문 (사용자 결정 영역)

- **[U1] line 16 (#16, line 2574 dungeon info)** — name/Cost/Reward/hpNote/slipNote/charNote/loadNote/opNote 7-token 박힘 카피. **통합 키 vs 분리 키 결정 필요**. 추천: 토큰별 분리 키 (`game.msg.dungeon_info_template` + `[HP-Aware]`/`[Slippery]`/`(Data loaded)` 별 키) — briefing 의 mod_hp_aware 패턴과 일관.
- **[U2] "Q-tables" 학명 보존 영역** — 3981 (NG+) 의 `Q-tables preserved` 박힘. 게임오버 overlay 의 `overlay.game_over.note` 가 이미 "세르파의 기억은 보존됩니다" (W7.3 closure) 로 narrative 흡수 박힘. NG+ 측 토스트도 narrative 흡수 vs 학명 보존 — 사용자 결정.
- **[U3] 🔒 이모지** — line 2228 의 `🔒` 박힘 유지 vs 제거. dungeon-select option 의 `🔒` 와 일관성 (W5 차이 확인 필요).
- **[U4] rope.escape* vs game.event.escape_* 중복** — 이미 박힌 `rope.escape` / `rope.escape_with_treasure` (2706/2708) 와 신규 `game.event.escape_pit*` / `game.event.escape_hp*` (2803/2805/2832/2834) 의미 중복. *키 통합* (rope.escape 가 escape 모든 상황 커버) vs *상황별 분리* (pit / hp / treasure 4 변종).
- **[U5] "에피소드" → "탐험" 흡수 룰 적용** — STORY §RL 메타 흡수 룰 ④ 따르면 일관 적용. training.finish.* 카피 (`X episodes`) 도 `X 탐험` 으로 흡수 vs 학명 보존 — 영문은 `episodes` 그대로 유지 (D-15 Crisp 학명 보존) / 한국어만 흡수 가능.
- **[U6] "CLEAR!" / "DIED!" 영문 대문자 박힘** — narrative 톤이면 한국어 "답파!" / "쓰러졌습니다" 자연. 영문은 "Clear!" 케이스 정합성 (D-15 Crisp 톤 대문자 회피 vs 게임 관례) — 사용자 결정.
- **[U7] triggerGameOver 호출처 영문 cause** (2815 `'Fell into a pit! Instant death.'` / 2844 `'HP reached 0! The party leader has fallen.'`) — showMessage 가 아닌 triggerGameOver 인자. 분류 범위 외이지만 *gameOver overlay 측* (`overlay.game_over.cause_*`) 별 사이클 필요. 본 분류와 함께 다룰지 별 사이클로 분리할지 사용자 결정.

## 참조

- D-2026-05-15-16 (i18n 미터치 4 영역 4/4 closure) — 본 사이클은 *D-15-16 외 추가 영역* 으로 박힘
- W11/W12/W13 (showEditorI18nMessage / thunk 패턴) — 동적 메시지 toggle stale 가드 재사용
- W16/W17 (사용자 톤 가이드 (b) 확정 → 자율 마감) — 본 사이클 패턴 출처
- 메모리: [[project_rld_dynamic_message_stale]] (reviewer 측 박힘 — W11~W13 누적 패턴)
- 핸드오프: `.claude/handoff/w7-narrative-cycle1.md` §3 다음 즉시 행동 A 항목
