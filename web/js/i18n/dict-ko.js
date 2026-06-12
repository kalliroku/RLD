/**
 * RLD 한국어 사전 — ground truth.
 *
 * 추출 원칙:
 *   - 식별자 (id / data-*) 보존, 텍스트만 키로 분리
 *   - 보간: "{steps} 스텝 만에" 처럼 placeholder 유지
 *   - 카피 톤: 기존 한국어 그대로 (D-4 정체성 카피 보존)
 *
 * 카테고리 prefix:
 *   title.*      — 타이틀 화면
 *   guild.*      — 길드 홀 (헤더 / 자원 / 탭)
 *   dev.*        — Dev Mode 헤더
 *   mode.*       — 모드 탭
 *   game.*       — 캔버스 영역 부속
 *   overlay.*    — 오버레이 / 다이얼로그
 *   stat.* / stats_toggle.* — 통계 패널
 *   food_warning / sparkline.* / placeholder.* — 게임 UI 부속
 *   section.*    — 우측 컨트롤 섹션 헤더
 *   character.*  — 캐릭터 desc (이름은 D-4 정체성으로 dict 외 처리)
 *   dungeon.* / provisions.* / training.* — 우측 컨트롤
 *   game_mode.* / visualization.* / controls.* / legend.* — 우측 컨트롤
 *   daily.*      — 데일리 패널
 *   editor.*     — 에디터 (Stage / Dungeon)
 *   bottom_tab.* — 모바일 하단 탭
 *   footer.*     — 푸터
 *   msg.*        — JS 측 동적 메시지 (showMessage / toast)
 *   tutorial.*   — 튜토리얼 단계
 *   game_over.*  — 게임오버 사유
 */

export const KO = {
    // === Document ===
    'document.title': 'RL Dungeon — 세르파 길드',

    // === Title screen ===
    'title.logo': 'RL DUNGEON',
    'title.tagline': '멍청한 세르파와 던전 답파',
    'title.new_game': '시작',
    'title.start_opening': '오프닝부터',
    'title.start_tutorial': '튜토리얼 처음부터',
    'title.wipe_confirm': '저장된 진행이 모두 삭제됩니다. 처음부터 시작할까요?',
    'title.dev_mode': 'Dev Mode',

    // === Opening V2 — tutorial-as-opening (narrative locked 2026-06-02) ===
    'opening.v2.p2': '아빠를 따라 재미 삼아 들어온 던전은, 생각했던 것과 달랐다…',
    'opening.v2.p5_a': '식량이 얼마 남지 않았어.',
    'opening.v2.p5_b': '너는 먼저 올라가. 곧 따라가마.',
    'opening.v2.p5_c': '…하지만.',
    'opening.v2.scroll': '아빠가 귀환 스크롤을 펼쳤다.',
    'opening.v2.p7': '아빠는 돌아오지 않았다.',
    'opening.v2.clear': 'Clear',
    'opening.v2.food': '식량',
    'opening.v2.food_low': '식량이 부족하다',
    'opening.v2.warn': 'WARN',
    'opening.v2.guild': '세르파 길드',
    'opening.v2.skip': 'ESC 건너뛰기',
    'opening.v2.move': '방향키로 이동',
    'opening.v2.guide': '저 빛이 출구야. 따라와.',
    'opening.v2.speaker_dad': '아빠',
    'opening.v2.guide_a': '출구는 이쪽이야.',
    'opening.v2.guide_b': '거의 다 왔어. 멈추지 마.',
    'opening.v2.guide_c': '길을 잃으면 위험해. 빛을 따라와.',
    'opening.v2.continue': '아무 키나 누르세요',

    // === Guild hall ===
    'guild.title': 'RL Dungeon',
    'guild.run_format': 'Run #{n}',
    'guild.gold_format': '{n}G',
    'guild.food_format': '{n} Food',
    'guild.hp_format': 'HP {cur}/{max}',
    'guild.tab.quest': '의뢰',
    'guild.tab.party': '파티',
    'guild.tab.shop': '상점',
    'guild.tab.map': '지도',
    // 간판 진행도 — Run# 대신 챕터+누적 답파 ({master} 고정 '마스터' — _fmtGuildText)
    'guild.signboard': 'Ch.{ch} {name} · {k} 답파',
    'guild.master_name': '마스터',

    // === 길드 온보딩 대사 (자리표시자 — 톤 검수 후 조정) ===
    'onboard.speaker.repli': '레플리',
    'onboard.speaker.rika': '리카',
    'onboard.speaker.qkun': '퀴니',
    'onboard.b1': '{master}, 일어나셨군요. 벌써 한낮인걸요.',
    'onboard.b2': '…왜 하필 나한테 이 자리가 떨어진 걸까.',
    'onboard.b3': '첫날이니 딱 하나만요. 이게 길드 자금, G예요.',
    'onboard.b4': '던전에 들 땐 이 G로 식량을 채워 가요. 도중에 떨어지면 곤란하니까요.',
    'onboard.b5': '답파하고 나오면 그만큼 들어와요. 여유가 생기면 좋은 것도 갖출 수 있고요.',
    'onboard.b6': '그러니 바닥만은 내지 마세요. 우리 같이 잘 꾸려 봐요!',
    'onboard.b7': "'같이'라. 떠맡은 건 난데 말이지.",
    'onboard.b8': '{master}! 마침 잘 오셨어요. 모험가 길드에서 의뢰가 왔어요.',
    'onboard.b9': '벌써 첫 의뢰가 왔어요. 방금 게시판에 붙여 뒀어요!',
    'onboard.b10': '자, 저 의뢰서부터 살펴볼까요.',
    // 단축 온보딩 전용 — 인사(b1) 다음 짧은 마무리, 곧장 리카 등장(b8)로 연결.
    'onboard.short_go': '자, 오늘도 잘 해봐요 마스터!',
    // 첫 던전 클리어 후 길드 복귀 1회 재생 (GUILD_FIRSTCLEAR_BEATS). 리카 칭찬→지도판매 떡밥→게시판 / 레플리 퀴니 합류→파밍→2관 수동.
    'firstclear.b1': '{master}! 첫 의뢰를 벌써 답파하다니, 대단해요!',
    'firstclear.b2': '그 지도는 모험가 길드가 내준 거예요. 나중엔 직접 답파한 지도를 길드에 팔 수도 있고요.',
    'firstclear.b3': '게시판에 다른 의뢰도 붙여 뒀어요. 한번 확인해 보세요!',
    'firstclear.b4': '아, 마침 퀴니가 돌아왔네요. {master}의 첫 세르파예요.',
    'firstclear.qkun_hello': '퀴니예요! 잘 부탁드려요. 뭐든 맡겨만 주세요!',
    'firstclear.b5': '퀴니한테 1관을 맡겨 두면, 다른 일을 보는 동안 골드를 캐 와요. 이게 ‘파밍’이에요.',
    'firstclear.b6': '퀴니가 골드 캐는 동안, 다음 의뢰는 {master}가 다녀오죠.',
    // 액션 비트 — 게시판에서 답파한 1관을 열어 퀴니 배치(하이라이트 유도). 배치 완료 시 assign_done 으로.
    'firstclear.assign': '그럼 직접 해봐요. 게시판에서 답파한 첫걸음을 열어 퀴니를 배치하면 돼요.',
    'firstclear.assign_done': '좋아요! 이제 퀴니가 첫걸음에서 골드를 캐 와요.',
    // 2관(함정) 클리어 후 길드 복귀 1회 재생 (GUILD_SECONDCLEAR_BEATS).
    // 리카 칭찬→야생 던전 소개 / 마스터 복귀길 발견(속마음) / 레플리 수금 액션→파밍 수익 확인→위임 넛지 / 리카 보드 넛지.
    'secondclear.b1': '함정투성이 의뢰까지 답파라니! {master}, 점점 모험가다워지는데요?',
    'secondclear.b2': '…돌아오는 길에, 지도에 없는 동굴 입구를 봤다.',
    'secondclear.b3': '지도에 없는 입구요?! 그건 ‘야생 던전’이에요. 길드에도 지도가 없는 곳이죠.',
    // 액션 비트 — 게시판에서 파밍중 의뢰(퀴니)를 열어 수금(하이라이트 유도). 수금 완료 시 collect_done 으로.
    'secondclear.collect': '그 얘기 전에 — 퀴니가 그동안 골드를 캐 뒀어요. 게시판에서 파밍중인 의뢰를 열어 수금해 보세요.',
    'secondclear.collect_done': '이게 파밍 수익이에요. {master}가 던전을 도는 동안에도 퀴니는 계속 캐고 있어요.',
    'secondclear.b4': '그런데 그 야생 던전… 지도가 없는 곳은 위험해요. {master}가 직접 가는 것보다, 퀴니를 보내 보는 건 어때요?',
    'secondclear.b5': '퀴니라면 부딪히면서 길을 외워 올 거예요! 준비되면 게시판에서 새 의뢰를 확인해 주세요.',

    // === 미션 보드 / 카드 ===
    'mission.badge.new': 'NEW',
    'mission.badge.clear': 'CLEAR',
    'mission.badge.farming': '파밍중',
    'mission.badge.boss': '보스',
    'mission.boss_sep': '보스',
    'mission.board.more': '다음 의뢰는 답파 후 열립니다',
    'mission.board.boss_locked': '이 챕터 의뢰를 모두 답파하면 열립니다',
    'mission.reward.first': '보상 +{n}G',
    'mission.reward.farm': '파밍 보상 +{n}G',
    'mission.farming_lock': '🔒 {name} · 답파율 100%',

    // === 준비실 ===
    'prep.title': '준비실 — Lv.{lv} {name}',
    'prep.difficulty': '난이도 {stars}',
    'prep.cleared': '답파 완료',
    'prep.best': '최단 {n}보',
    'prep.uncleared': '미답파',
    'prep.reward.first': '첫 답파 +{n}G',
    'prep.reward.repeat': '반복 +{n}G',
    'prep.label.food': '식량',
    'prep.food_unit': '(1G/개)',
    // 출정 보급 합계 비용 — 보급량을 올리는 만큼 필요한 골드 표시.
    'prep.food_cost': '−{n}G',
    // 첫 출정 강제 단계 — 레플리의 메뉴 안내(게시판/준비실). 카피는 자리표시자, 톤 검수 후 조정.
    'firstdeploy.board_hint': '레플리: 여기가 의뢰 게시판이에요. 길드가 받은 던전 의뢰가 붙고, 답파하면 보상과 함께 다음 의뢰가 열려요. 우선 첫 의뢰부터 볼까요?',
    'firstdeploy.prep_hint': '레플리: 출정 준비실이에요. 식량은 던전에서 한 걸음마다 2씩 줄어요 — 이번엔 제가 추천량으로 챙겨 뒀으니 다음부터 직접 조절해요. 입장료가 붙는 의뢰도 있어요. 확인했으면 ‘출발’!',
    'prep.label.cost': '입장료',
    'prep.label.reward': '보상',
    'prep.cancel': '취소',
    'prep.deploy': '출발 ▶',

    // === 파밍 통제판 (답파 던전 대기실 변신 — 방치형 누적) ===
    'farm.assign_title': '세르파 배치',
    'farm.assign_hint': '맡길 세르파를 고르세요. 민첩할수록 빠르게, 튼튼할수록 오래 캡니다.',
    'farm.assign_btn': '배치',
    'farm.no_serpa': '아직 맡길 수 있는 세르파가 없어요. 이 던전 최단 경로를 감당할 만큼 강한 세르파가 필요해요.',
    'farm.assigned': '{name} 파밍 중',
    'farm.rate': '{sec}초마다 +{n}G',
    'farm.rate_preview': '{sec}초마다 +{n}G · 시간당 약 {perHour}G · 최대 {h}h 누적',
    'farm.cap_note': '최대 {h}시간까지 누적',
    'farm.exclusive': '독점 지도 ×3 ({n}회 남음)',
    'farm.accrued': '쌓인 보상 +{n}G ({runs}회)',
    'farm.collect': '수금 +{n}G',
    'farm.collect_empty': '아직 쌓이지 않음',
    'farm.unassign': '배치 해제',
    'farm.redeploy': '⚔ 재출격 (전투 재도전)',
    'farm.recall_title': '세르파 불러오기',
    'farm.recall_detail': '그만하고 불러올까요? 지금까지 쌓인 {gold}G를 회수합니다.',
    'farm.recall_dont_show': '다시 보지 않기',
    'farm.recall_yes': '불러오기',
    'farm.recall_no': '취소',
    'farm.recall_collected': '{gold}G를 회수했어요.',

    // === 클린 플레이 화면 ===
    'play.exit': '나가기',

    // === 던전 플레이버 (테마별 — 자리표시자, 톤 검수 후 조정) ===
    'flavor.treasure': '무언가 반짝이는 기운이 있다.',
    'flavor.enemy': '위험한 녀석이 도사린다.',
    'flavor.ice': '발밑이 미끄럽다.',
    'flavor.trap': '바닥 곳곳이 수상하다.',
    'flavor.maze': '길이 복잡하게 얽혀 있다.',
    'flavor.pit': '깊은 구덩이가 입을 벌리고 있다.',
    'flavor.danger': '방심했다간 후회한다.',
    'flavor.gauntlet': '시련이 줄지어 기다린다.',
    'flavor.cliff': '발 디딜 곳이 아슬아슬하다.',
    'flavor.hall': '끝이 보이지 않는 복도다.',
    'flavor.field': '사방이 탁 트여 있다.',
    'flavor.paths': '길이 두 갈래로 갈린다.',
    'flavor.dead_end': '막다른 길이 곳곳에 숨어 있다.',
    'flavor.bridge': '좁은 다리를 건너야 한다.',
    'flavor.cave': '어둠이 깊게 깔려 있다.',
    'flavor.default': '특별할 것 없어 보인다.',

    // === Dev Mode header ===
    'dev.back_to_game': '게임으로 돌아가기',
    'dev.title': 'RL DUNGEON',
    'dev.subtitle': '세르파 길드 — 길드장의 기록',

    // === Mode tabs ===
    'mode.play': '플레이',
    'mode.daily': '오늘의 도전',
    'mode.editor': '에디터',

    // === Game area ===
    'game.minimap': '미니맵',
    'game.step0_hint': '방향키로 세르파를 움직여 금빛 G 에 도달.',
    'game.bump_toast': '벽! (-1)',
    'game.reset_log': '던전 진입! 식량: {food}. 금빛 G 에 도달하라.',
    'game.clear_repeat': '답파! +{reward}G (스텝: {steps}){treasure}',
    'game.first_clear.map_sold': '첫 답파! 지도 판매 +{earned}G',
    'game.first_clear.map_kept': '첫 답파! 지도 보관! 전용 파밍: {reward}G × {runs}회',
    'quest.cost_label': '입장료: {cost}G | {size}',
    'quest.reward_first': '첫 답파: +{reward}G',
    'quest.reward_farming': '파밍: +{reward}G',
    'celebration.first_clear': '첫 답파!',
    'game.paid_entry': '입장료 {cost}G 지불. 식량: {food}. 행운을 빈다.',

    // === Opening card (W7.1 — 첫 새 게임 1회) ===
    'opening.heading': '세르파 길드',
    'opening.p1': '세르파 길드는 한때 모험가 길드의 그늘에서 살아왔다.',
    'opening.p2': '당신의 아빠는 그 시대 영웅이자, 세르파 길드를 세운 사람이었다. 그가 던전 깊은 곳에서 무엇을 보았는지는 아무도 모른다. 그는 당신을 귀환 아이템으로 탈출시키고, 본인은 돌아오지 않았다.',
    'opening.p3': '오랜 시간이 흘렀다. 길드는 명맥만 유지됐고, 모험가 길드는 신규 도전자를 막아왔다.',
    'opening.p4': '오늘, 그들이 당신을 다시 던전으로 부른다 — 아빠가 무언가를 남겼다는 추측을 가지고.',
    'opening.p5': '가지고 있는 건 아빠의 유산 하나. 사망한 세르파를 부활시키는 아이템.',
    'opening.p6': '다시 시작할 시간이다.',
    'opening.start': '시작',

    // === Overlays ===
    'overlay.game_over.title': 'GAME OVER',  // 게임 관례 영문 보존
    'overlay.game_over.note': '세르파의 기억은 보존됩니다. 다음 시도에서 더 멀리 갈 겁니다.',
    'overlay.game_over.new_run': '새 런',
    'overlay.ending.title': '모든 던전 답파!',
    'overlay.ending.note': '세르파의 기억은 보존됩니다. 자신의 기록을 갱신해보세요.',
    'overlay.ending.new_game_plus': 'New Game+',  // NG+ 게임 관례 영문 보존
    'overlay.briefing.back': '뒤로',
    'overlay.briefing.deploy': '출진',
    // briefing 패널 라벨 (overlay.briefing.* — D-2026-05-15-16 미터치 영역 마감)
    'overlay.briefing.entry_cost': '입장료',
    'overlay.briefing.first_reward': '첫 답파 보상',
    'overlay.briefing.repeat_reward': '반복 보상',
    'overlay.briefing.train_cost': '학습 비용',  // 학명 "학습" 유지 (D-4)
    'overlay.briefing.treasure': '보물',
    'overlay.briefing.modifiers': '모디파이어',
    'overlay.briefing.your_gold': '보유 골드',
    'overlay.briefing.food': '식량',
    'overlay.briefing.mod_slippery': '[미끄러움]',
    'overlay.briefing.mod_hp_aware': '[HP 인지]',  // HP 학명 약어 보존
    'overlay.briefing.hints_title': '힌트',
    'overlay.briefing.hint_locked': '???',  // narrative 미스터리 유지 (한/영 동일)
    'overlay.briefing.provisions_title': '신속 보급',
    'overlay.briefing.food_buy': '+{amount} 식량 ({cost}G)',
    'overlay.map_choice.title': '첫 클리어!',
    'overlay.map_choice.sell': '지도 판매',
    'overlay.map_choice.keep': '지도 보관',
    // 판매 미해금(길드 지급 지도 = 이미 밝혀짐) 시 선택지 없이 보상 확인만.
    'overlay.map_choice.confirm': '확인',
    'overlay.map_choice.sell_detail': '판매: +{price}G (즉시)',
    'overlay.map_choice.keep_detail': '보관: {reward}G/run × {runs}회 (전용 파밍)',
    // "{던전명} 해방!" 은 던전명이 '첫 함정' 같은 보통명사라 무슨 말인지 안 읽힘(bm) → 게시판 의뢰 추가로 명시.
    'overlay.map_choice.unlock_next': '게시판에 새 의뢰가 붙었어요 — {name}',
    'overlay.map_choice.chapter_join': '챕터 {ch} "{name}": {members} 합류!',

    // === Stats panel ===
    'stat.run': '런',
    'stat.gold': '골드',
    'stat.food': '식량',
    'stat.hp': 'HP',  // 게임 관례 약어 보존
    'stat.steps': '스텝',
    'stat.reward': '보상',
    'stat.clear_rate': '클리어율',
    'stats_toggle.show_more': '더보기',
    'stats_toggle.show_less': '접기',

    // === Game UI ===
    'food_warning': '식량 부족! 세르파가 굶주리고 있습니다!',
    'sparkline.label': '탐험 성공률',
    'placeholder.silent_q.title': '침묵의 학습',
    'placeholder.silent_q.desc': '시각화 차단됨 — 모디파이어 효과',

    // === Right column section headers ===
    'section.character': '캐릭터',
    'section.stats': '세르파 현황',
    'section.dungeon': '던전',
    'section.provisions': '보급',
    'section.farming': '파밍',
    'section.training': 'AI 학습',
    'section.game_mode': '게임 모드',
    'section.visualization': '시각화',
    'section.controls': '조작',
    'section.legend': '범례',

    // === Character names (D-4 정체성 — 알고리즘이 곧 캐릭터) ===
    // 알고리즘 라벨 (Q-Learning, SARSA, ACLA, …) 은 universal 약어라 i18n 외 처리.
    'char.qkun': '퀴니',
    'char.scout': '스카우트',
    'char.sarsa': '사르사',
    'char.monte': '몬테',
    'char.tracer': '트레이서',
    'char.dyna': '다이나',
    'char.gradi': '그래디',
    'char.critic': '크리틱',
    'char.qvkun': 'QV군',
    'char.acla': '아클라',
    'char.ensemble': '앙상블',
    'char.exsa': '에크사',
    'char.doubleq': '더블Q',
    'char.treeback': '트리백',
    'char.sweeper': '스위퍼',

    // === Character desc default (B-105) ===
    'character.desc.default': '한 번 가본 길을 그대로 기억합니다. 같은 던전을 반복하면 강합니다.',

    // === Dungeon controls ===
    'dungeon.reset': '초기화 (R)',

    // === Provisions ===
    'provisions.food_label': '식량:',
    'provisions.buy_food': '구매',
    'provisions.cost_format': '({cost}G)',
    'provisions.items_label': '아이템:',
    'provisions.item.escape_rope': '탈출 로프 100G',
    'provisions.item.defense_contract': '방어 계약 150G',
    'provisions.item.trap_nullify': '함정 무효 200G',

    // === Training ===
    'training.speed_label': '속도:',
    'training.speed.instant': '즉시',
    'training.mode_label': '모드:',
    'training.mode.until_success': '성공까지',
    'training.mode.continuous': '계속',
    'training.btn.start': '학습 시작',
    'training.btn.stop': '정지',
    'training.finish.converged': '학습 완료. 답파율 {rate}% ({episode}회 탐험)',
    'training.finish.max_episodes': '최대 탐험 도달 ({max}회). 답파율 {rate}%',
    'training.finish.out_of_gold': '골드 부족. 1탐험 {cost}G 필요. 답파율 {rate}%',
    'training.finish.stopped': '중단 ({episode}회 탐험). 답파율 {rate}%',
    'training.start.instant': '즉시 학습 시작... [{name}]',
    'ngplus.entered': 'New Game+ {n}! 세르파의 기억은 보존됩니다. 골드: {gold}G',

    // === Game mode toggles ===
    'game_mode.fog_of_war': '전장의 안개',
    'game_mode.sound': '소리',
    'game_mode.music': 'BGM',

    // === Visualization toggles ===
    'visualization.q_values': 'Q값 보기',
    'visualization.policy': '정책 보기',

    // === Controls hint ===
    'controls.move_keys': '이동',

    // === Legend ===
    'legend.start': '시작',
    'legend.goal': '목표 (+100)',
    'legend.trap': '함정 (-10 HP)',
    'legend.heal': '회복 (+10 HP)',
    'legend.pit': '구덩이 (즉사)',
    'legend.gold': '골드 (+10)',
    'legend.monster': '몬스터 (-30 HP)',
    'legend.wall': '벽',

    // === Daily mode panel (T2B-1) ===
    'daily.title': '오늘의 도전',
    'daily.label.date': '날짜',
    'daily.label.seed': '시드',
    'daily.label.modifiers': '모디파이어',
    'daily.label.pool': '사용 가능',
    'daily.desc': '매일 같은 시드. 어제의 자신과 겨룬다.',
    'daily.btn.start': '도전',
    'daily.btn.retry': '다시 도전',
    'daily.yesterday': '어제 기록',
    'daily.today': '오늘 기록',
    'daily.week': '최근 7일',

    // === Bottom tabs (mobile, B-202) ===
    'bottom_tab.character': '캐릭터',
    'bottom_tab.dungeon': '던전',
    'bottom_tab.training': '학습',
    'bottom_tab.provisions': '보급',
    'bottom_tab.stats': '통계',
    'bottom_tab.aria_label': '섹션 이동',

    // === Footer ===
    'footer.controls_hint': '방향키로 이동 | R 키로 초기화 | 금빛 목표에 도달하세요!',

    // === Modifier band (T2B-2) ===
    'modifier_band.this_run': '이번 런:',

    // === Daily — buttons / messages ===
    'daily.btn.retry_record': '다시 도전 (기록 갱신)',
    'daily.start_msg': '오늘의 도전 시작 — 시드 #{seed}',
    'daily.victory_msg': '오늘의 도전 클리어! {steps} 스텝',
    'daily.victory.first_clear': '(오늘 첫 성공!)',
    'daily.victory.improvement': '(최고 기록 갱신, 이전 {prev})',
    'daily.compare.same': '어제와 동일',
    'daily.compare.better': '어제보다 {diff} 스텝 빠름',  // diff 양수 (호출처 Math.abs)
    'daily.compare.worse': '어제보다 {diff} 스텝 느림',
    'daily.fail_msg': '오늘의 도전 실패 — {cause}',
    'daily.fail_toast': '오늘의 도전 실패: {cause}',

    // === Daily — yesterday/today record rows ===
    'daily.row.date': '날짜',
    'daily.row.result': '결과',
    'daily.row.cleared': '✓ 클리어',
    'daily.row.failed': '✗ 미클리어',
    'daily.row.best_steps': '최소 스텝',
    'daily.row.attempts': '시도',
    'daily.row.attempts_unit': '{n}회',
    'daily.row.deaths': '사망',
    'daily.row.deaths_unit': '{n}회',

    // === Hire (T2B-3) ===
    'hire.need_gold': '{name} 고용 골드 부족! {cost}G 필요 (보유 {gold}G)',
    'hire.confirm': '{name} ({personality}) 를 {cost}G 에 고용할까요?',
    'hire.success': '{name} 고용 완료! -{cost}G',

    // === Game-over ===
    'game_over.starvation': '식량이 다 떨어졌습니다. 던전에 갇혔습니다.',

    // === Food warning (F2 임계 경고) ===
    'food.warn.threshold': '⚠️ 식량 부족! 출구로 돌아가세요.',

    // === Tutorial safety net (첫 던전·첫 클리어 전 한정) ===
    // 1차: 레플리 식량 보급 (정식 등장). 2차: 자동 이동 어시스트 (한 줄 대사).
    'tutor.rescue.text': '보급 챙겨왔어요! 식량 떨어지면 큰일이니까, 든든하게 채워둘게요.',
    'tutor.rescue.ok': '고마워요',
    'tutor.assist.line': '이번엔 제가 G 까지 데려다줄게요. 길, 잘 봐두세요!',

    // === Escape rope (긴급 탈출 아이템) ===
    'rope.escape': '긴급 탈출! 로프가 소모되었습니다.',
    'rope.escape_with_treasure': '긴급 탈출! 로프 소모. 보물 +{val}G!',

    // === Modifier in-game effects ===
    'modifier_effect.wind_gust': '돌풍! 행동이 묶였습니다.',

    // === Tutorial-ish triggers ===
    'tutorial.train_now': '이제 AI 에게 길을 외우게 시켜보세요.',

    // === Modifiers (12종, D-2026-05-14-14, 데일리 전용) ===
    // 환경 6
    'modifier.slippery.name': '미끄러운 바닥',
    'modifier.slippery.desc': '이동이 30% 확률로 옆으로 빗나갑니다.',
    'modifier.heavy_fog.name': '안개 짙음',
    'modifier.heavy_fog.desc': '시야 범위 5 → 3 칸으로 축소.',
    'modifier.dim_torch.name': '횃불 꺼짐',
    'modifier.dim_torch.desc': '시야 범위 5 → 2 칸으로 더욱 축소.',
    'modifier.poison_floor.name': '독 바닥',
    'modifier.poison_floor.desc': '빈 칸을 밟을 때마다 HP -1.',
    'modifier.acid_rain.name': '산성비',
    'modifier.acid_rain.desc': '10 스텝마다 HP -3 (시간 압박).',
    'modifier.wind_gust.name': '돌풍',
    'modifier.wind_gust.desc': '10% 확률로 행동이 묶입니다.',
    // 제약 6
    'modifier.two_only.name': '두 명만',
    'modifier.two_only.desc': '세르파 2명만 사용 가능.',
    'modifier.hp_cap_50.name': 'HP 50 제한',
    'modifier.hp_cap_50.desc': '최대 HP 가 50 으로 묶입니다.',
    'modifier.mirror_input.name': '좌우 반전',
    'modifier.mirror_input.desc': '수동 플레이 좌/우 입력이 뒤바뀝니다.',
    'modifier.no_heal.name': '회복 차단',
    'modifier.no_heal.desc': '회복 타일 효과가 사라집니다.',
    'modifier.damage_boost.name': '치명상',
    'modifier.damage_boost.desc': '몬스터·함정 피해 × 1.5.',
    'modifier.silent_q.name': '침묵의 학습',
    'modifier.silent_q.desc': 'Q-value 히트맵과 학습 sparkline 이 숨겨집니다.',

    // === Tutorial steps (5개, 컨텍스트 트리거) ===
    'tutorial.welcome': '환영합니다! 방향키로 세르파를 움직여 금빛 G (목표) 에 도달하세요.',
    'tutorial.first_dungeon': '첫 던전 클리어! 다음 던전으로 가거나, AI 학습 패널에서 세르파에게 길을 외우게 시켜보세요.',
    'tutorial.ai_training': '세르파는 던전을 반복 탐험하며 길을 익힙니다. 속도를 바꿔보세요 — 즉시가 가장 빠릅니다. 매 탐험마다 골드가 소비됩니다.',
    'tutorial.economy': '이제 던전 입장에 골드가 듭니다. 지도를 팔아 즉시 현금으로 바꾸거나, 보관해서 전용 파밍 런을 돌리세요.',
    'tutorial.farming': '파밍 해금! 학습 완료된 세르파를 클리어한 던전에 배치하면 자동으로 골드를 벌어옵니다.',
    'tutorial.dismiss': '확인',

    // === Chapter names (7개, run-state.js CHAPTER_CONFIG) ===
    'chapter.1': '첫 발걸음',
    'chapter.2': '위험한 길',
    'chapter.3': '넓은 세계',
    'chapter.4': '직감과 비평',
    'chapter.5': '합의의 힘',
    'chapter.6': '불확실한 바닥',
    'chapter.7': '심연',

    // === Items (3종, run-state.js ITEMS) ===
    'item.escape_rope.name': '긴급 탈출 로프',
    'item.escape_rope.desc': '즉시 입구로 귀환 (사망 방지)',
    'item.defense_contract.name': '방어 용병 계약',
    'item.defense_contract.desc': '1탐험 피해 반감',
    'item.trap_nullify.name': '함정 해제사 계약',
    'item.trap_nullify.desc': '1탐험 함정 무효',

    // === Character personalities (15종, hire.confirm 노출) ===
    'character.personality.qkun': '충성스러운 덜렁이',
    'character.personality.scout': '근시안 정찰병',
    'character.personality.sarsa': '겁쟁이',
    'character.personality.monte': '끝까지 가봐야 직성',
    'character.personality.tracer': '흔적 추적자',
    'character.personality.dyna': '공상가',
    'character.personality.gradi': '감으로 찍는 싸구려',
    'character.personality.critic': '잔소리꾼',
    'character.personality.qvkun': '이중인격',
    'character.personality.acla': '변덕쟁이',
    'character.personality.ensemble': '합의체',
    'character.personality.exsa': '계산기',
    'character.personality.doubleq': '의심쟁이',
    'character.personality.treeback': '선견자',
    'character.personality.sweeper': '효율주의자',

    // === Character descriptions (15종, character-desc UI) ===
    'character.desc.qkun': '한 번 가본 길을 그대로 외우는 강아지 세르파. 자주 넘어져도 우직하게 다 기억해, 같은 던전을 반복할수록 강해집니다.',
    'character.desc.scout': '주변을 관찰해서 학습합니다. 처음 보는 던전도 경험을 활용!',
    'character.desc.sarsa': '실수에서 배우는 신중파. 안전한 길을 선호합니다.',
    'character.desc.monte': '끝까지 가봐야 안다! 완주 후 복기하는 사색가.',
    'character.desc.tracer': '발자취를 남기며 학습. 먼 과거의 선택도 평가합니다.',
    'character.desc.dyna': '상상력의 달인. 경험을 머릿속에서 반복 재생합니다.',
    'character.desc.gradi': '직감형 탐험가. 확률로 판단, 다양한 경로를 시도합니다.',
    'character.desc.critic': '배우와 비평가를 겸비. 안정적이고 효율적입니다.',
    'character.desc.qvkun': 'Q와 V를 동시에 학습. 과대추정을 줄여 안정적입니다.',
    'character.desc.acla': '학습 오토마톤. 확률을 직접 조작해 빠르게 정책을 바꿉니다.',
    'character.desc.ensemble': '5개 알고리즘의 합의. 볼츠만 곱으로 최적 행동을 선택합니다.',
    'character.desc.exsa': '기대값으로 학습. 분산 없는 업데이트로 퀴니와 사르사를 모두 지배합니다.',
    'character.desc.doubleq': '두 개의 눈으로 편향 없이 판단. 과대추정의 해결사.',
    'character.desc.treeback': 'n걸음 앞을 내다보는 전략가. 기대값의 나무를 키웁니다.',
    'character.desc.sweeper': '중요한 것부터 정리하는 효율주의자. 다이나의 진화형.',

    // === Editor (D-3 던전 마스터 모드 — Act 2 후 콘텐츠, 시스템 라벨이라 학명 보존: 에피소드 / HP) ===
    // Subtabs
    'editor.tab.stage': '스테이지',
    'editor.tab.dungeon': '던전',
    // Section headings
    'editor.head.grid_size': '그리드 크기',
    'editor.head.tile_palette': '타일 팔레트',
    'editor.head.tools': '도구',
    'editor.head.actions': '동작',
    'editor.head.stage_library': '스테이지 라이브러리',
    'editor.head.quick_test': '빠른 테스트',
    'editor.head.shortcuts': '단축키',
    'editor.head.dungeon_composer': '던전 구성기',
    'editor.head.floors': '층',
    'editor.head.rules': '규칙',
    // Buttons
    'editor.btn.apply': '적용',
    'editor.btn.undo': '되돌리기',
    'editor.btn.redo': '다시 실행',
    'editor.btn.clear': '비우기',
    'editor.btn.validate': '검증',
    'editor.btn.save': '저장',
    'editor.btn.load': '불러오기',
    'editor.btn.delete': '삭제',
    'editor.btn.play_stage': '이 스테이지 플레이',
    'editor.btn.save_dungeon': '던전 저장',
    'editor.btn.play_dungeon': '이 던전 플레이',
    'editor.btn.add_floor': '+ 층 추가',
    'editor.btn.quick_test': '빠른 테스트',
    'editor.btn.stop': '중지',
    // Tools
    'editor.tool.brush': '브러시',
    'editor.tool.eraser': '지우개',
    'editor.tool.fill': '채우기',
    // Placeholders
    'editor.placeholder.stage_name': '스테이지 이름...',
    'editor.placeholder.dungeon_name': '던전 이름...',
    // Select options
    'editor.option.select': '-- 선택 --',
    'editor.option.select_dungeon': '-- 던전 선택 --',
    // Quick test labels
    'editor.qt.character': '캐릭터:',
    'editor.qt.episodes': '에피소드:',  // 학명 보존 (개발자 영역)
    'editor.qt.show_policy': '학습 정책 보기',
    // Shortcut hints (Undo/Redo 는 btn.* 재사용)
    'editor.short.select_tile': '타일 선택',
    'editor.short.erase': '지우기',
    // Rules
    'editor.rule.hp_carry': 'HP 이월',  // HP 학명 약어 보존
    'editor.rule.gold_on_clear': '클리어 시만 골드',
    // Default name (editor.js 의 onPlayDungeon 폴백)
    'editor.default.custom_dungeon': '커스텀 던전',
    // Editor messages (showEditorMessage 본문 — main.js 호출, textContent 안전)
    'editor.msg.grid_resized': '그리드 크기 {w}×{h} 적용',
    'editor.msg.grid_cleared': '그리드 초기화',
    'editor.msg.valid_ready': '검증 통과. 플레이 가능.',
    'editor.msg.enter_stage_name': '스테이지 이름을 입력하세요',
    'editor.msg.enter_dungeon_name': '던전 이름을 입력하세요',
    'editor.msg.fix_errors_first': '오류 먼저 수정: {errors}',
    'editor.msg.saved': '"{name}" 저장됨',
    'editor.msg.loaded': '"{name}" 불러옴',
    'editor.msg.deleted': '삭제됨',
    'editor.msg.add_floor': '최소 1개 층 추가 필요',
    'editor.msg.floor_no_stage': '{floor}층에 스테이지 미선택',
    'editor.msg.floor_variant_empty': '{floor}층 {variant}번 변형이 비어있음',
    'editor.msg.saved_dungeon': '던전 "{name}" 저장됨',
    'editor.msg.dungeon_not_found': '던전을 찾을 수 없음',
    'editor.msg.loaded_dungeon': '던전 "{name}" 불러옴',
    'editor.msg.dungeon_deleted': '던전 삭제됨',
    'editor.msg.resolve_dungeon_failed': '던전 스테이지 해결 실패',
    'editor.msg.max_floors': '최대 5층',
    'editor.msg.no_floors_yet': '층이 없습니다. "+ 층 추가" 를 눌러 시작하세요.',  // editor.btn.add_floor 카피 변경 시 함께 갱신
    'editor.btn.remove_floor': '층 삭제',  // tooltip
    'editor.btn.remove_variant': '변형 삭제',  // tooltip
    // Editor validation errors (editor.js errors 배열 — { key, params? } 객체 push, main.js 의 showEditorErrorsMessage 에서 errors.map(e => t(e.key, e.params)).join(', ') 으로 매 토글마다 재평가, W12)
    'editor.err.no_grid': '그리드 미생성',
    'editor.err.start_missing': 'START 타일 누락',
    'editor.err.goal_missing': 'GOAL 타일 누락',
    'editor.err.no_path': 'START 에서 GOAL 까지 경로 없음',
    'editor.err.test_running': '테스트 실행 중',
    'editor.err.qt_not_configured': '빠른 테스트 미설정',

    // === Dungeon names (27 + backward compat 4, D-2026-05-19-1 narrative 흡수 — 분위기/현상 + 추상 컬러만, 출처/진영/인물 직접 박힘 0건, 깊이는 B-105 hover opt-in)
    // Ch.1 첫 발걸음
    'dungeon.level_01_easy': '첫걸음',
    'dungeon.level_02_trap': '첫 함정',
    'dungeon.level_03_maze': '시작의 미로',
    // Ch.2 위험한 길
    'dungeon.level_04_pit': '구덩이 골짜기',
    'dungeon.level_05_gold': '황금의 길',
    'dungeon.level_06_risk': '위험과 보상',
    'dungeon.level_07_gauntlet': '시련의 회랑',
    // Ch.3 넓은 세계 (HP 모디파이어 영역)
    'dungeon.level_08_deadly': '죽음의 미궁',
    'dungeon.level_09_treasure': '보물 사냥',
    'dungeon.level_10_final': '변곡점',
    'dungeon.level_11_hp_test': '인내 시험',  // HP 학명 회피 (in-game narrative 흡수, 단 briefing 시스템 라벨은 "HP 이월" 보존)
    'dungeon.level_12_hp_gauntlet': '인내 회랑',
    // Ch.4 직감과 비평
    'dungeon.level_13_cliff': '절벽 길',
    'dungeon.level_14_long_hall': '끝없는 복도',
    'dungeon.level_15_multi_room': '미로의 방들',
    'dungeon.level_16_open_field': '황량한 평원',
    'dungeon.level_17_two_paths': '두 갈래 길',
    // Ch.5 합의의 힘
    'dungeon.level_18_dead_end': '막다른 미궁',
    'dungeon.level_19_bridge': '좁은 다리',
    'dungeon.level_24_paper_maze': '종이 미로',
    'dungeon.level_25_paper_hard': '종이 미로 너머',
    // Ch.6 불확실한 바닥 (빙판 모디파이어 영역)
    'dungeon.level_26_frozen_lake': '빙판 호수',
    'dungeon.level_27_ice_maze': '얼어붙은 미로',
    'dungeon.level_28_frozen_cliff': '빙판 절벽',
    // Ch.7 심연
    'dungeon.level_29_big_maze': '거대한 미궁 (25×25)',
    'dungeon.level_30_generated_cave': '심연의 동굴 (50×50)',
    'dungeon.level_31_generated_rooms': '심연의 방들 (50×50)',
    // Backward compat (B-103 컷, DUNGEON_ORDER 미포함 — 영문 잔존 방지)
    'dungeon.level_20_sacrifice': '절벽 답파',
    'dungeon.level_21_desert': '사막 횡단',
    'dungeon.level_22_arena': '몬스터 투기장',
    'dungeon.level_23_mirage': '신기루',

    // === Dungeon hints (game-config.js DUNGEON_HINTS — narrative 흡수, 학명 박힌 5건 character 어휘로 흡수)
    // Ch.1
    'hint.level_01_easy.0': '비좁은 공간. 다섯 걸음이면 끝에서 끝까지.',
    'hint.level_02_trap.0': '발 밑이 무너진다. 한 칸씩 조심스레.',
    'hint.level_03_maze.0': '일곱 걸음의 미궁. 한 번 잘못 들면 돌아오기 어렵다.',
    // Ch.2
    'hint.level_04_pit.0': '발을 헛디디면 끝. 절벽이 입을 벌리고 있다.',
    'hint.level_05_gold.0': '일곱 걸음 안에 함정이 숨어 있다.',
    'hint.level_05_gold.1': '낙관적인 녀석이면 충분하다.',
    'hint.level_06_risk.0': '보상은 크다. 위험도 그만큼.',
    'hint.level_06_risk.1': '치유의 자리를 잘 밟아야 한다.',
    'hint.level_07_gauntlet.0': '함정이 연이어 기다린다.',
    'hint.level_07_gauntlet.1': '체력 관리가 핵심이다.',
    // Ch.3
    'hint.level_08_deadly.0': '미궁과 함정과 구덩이가 한 자리에.',
    'hint.level_08_deadly.1': '체력 좋은 녀석을 보내라.',
    'hint.level_09_treasure.0': '보물이 잠들어 있다.',
    'hint.level_09_treasure.1': '그림자를 피해 걸으면 안전하다.',
    'hint.level_10_final.0': '마지막 시험. 모든 것이 모인다.',
    'hint.level_10_final.1': '최고의 세르파가 필요하다.',
    'hint.level_11_hp_test.0': '체력의 무게가 다르게 느껴진다.',
    'hint.level_12_hp_gauntlet.0': '무게 + 연이은 충돌.',
    'hint.level_12_hp_gauntlet.1': '치유사가 있으면 좋겠지만...',
    // Ch.4
    'hint.level_13_cliff.0': '절벽 옆 좁은 길. 한 발짝의 무게.',
    'hint.level_14_long_hall.0': '끝없는 복도. 걸음을 아껴라.',
    'hint.level_15_multi_room.0': '여러 방이 얽혀 있다.',
    'hint.level_16_open_field.0': '넓은 공간. 시야가 멀리 닿는다.',
    'hint.level_17_two_paths.0': '두 갈래. 한쪽은 안전, 한쪽은 함정.',
    'hint.level_17_two_paths.1': '빠른 녀석이 유리하다.',
    // Ch.5
    'hint.level_18_dead_end.0': '막다른 길이 많다.',
    'hint.level_18_dead_end.1': '상상력이 풍부한 녀석이 좋다.',
    'hint.level_19_bridge.0': '좁은 다리. 뒤로는 갈 수 없다.',
    'hint.level_24_paper_maze.0': '종이처럼 얇은 벽.',
    'hint.level_25_paper_hard.0': '종이 미로 — 더 깊어졌다.',
    'hint.level_25_paper_hard.1': '여러 녀석의 합의가 필요하다.',  // 학명 회피 (ensemble)
    // Ch.6
    'hint.level_26_frozen_lake.0': '얼음 위. 발걸음이 의지대로 가지 않는다.',
    'hint.level_26_frozen_lake.1': '평균에 기대는 녀석이 유리하다.',  // 학명 회피 (Expected SARSA)
    'hint.level_27_ice_maze.0': '얼음 미궁. 미끄러지면 벽이 멈춰 세운다.',
    'hint.level_28_frozen_cliff.0': '얼음 절벽. 미끄러지면 떨어진다.',
    'hint.level_28_frozen_cliff.1': '두 눈으로 보는 녀석이 필요하다.',  // 학명 회피 (Double-Q)
    // Ch.7
    'hint.level_29_big_maze.0': '거대한 미궁. 천 걸음 안에 끝내야 한다.',
    'hint.level_29_big_maze.1': '머릿속에 던전을 그리는 녀석이 효율적이다.',  // 학명 회피 (Dyna-Q model-based)
    'hint.level_30_generated_cave.0': '지도가 매번 다르다.',
    'hint.level_30_generated_cave.1': '중요한 것부터 정리하는 녀석이 필요하다.',  // 학명 회피 (Prioritized Sweeping)
    'hint.level_31_generated_rooms.0': '방의 배치가 매번 바뀐다.',
    'hint.level_31_generated_rooms.1': '여러 걸음 내다보는 녀석이 필요하다.',  // 학명 회피 (Tree Backup / n-step)
    // Hint purchase toast (W17 추가 — main.js updateHintUI 의 hint 구매 메시지)
    'hint.purchased': '힌트 입수! -{cost}G',

    // === Language toggle ===
    'lang.toggle': 'EN',
    'lang.toggle.aria_label': '언어 전환',

    // === Landing page (marketing — web/index.html, 게임은 web/play.html) ===
    'landing.meta.title': 'RL Dungeon — 알고리즘이 곧 캐릭터인 시드 기반 로그라이크',
    'landing.meta.description': '알고리즘이 곧 캐릭터인 시드 기반 로그라이크. 매 런 다른 모디파이어 아래 한정된 세르파 풀로 던전을 답파한다.',

    'landing.hero.tagline': '알고리즘이 곧 캐릭터인 시드 기반 로그라이크',
    'landing.hero.subtagline': '매 런 다른 모디파이어 아래 한정된 세르파 풀로 던전을 답파한다.',
    'landing.hero.cta_play': '브라우저에서 플레이',
    'landing.hero.cta_github': 'GitHub',

    'landing.concept.heading': '핵심 컨셉',
    'landing.concept.seeded.title': '시드 기반 런',
    'landing.concept.seeded.body': '매 런 다른 모디파이어 (미끄러운 바닥 / 안개 짙음 / 두 명만 등). 데일리 시드는 모든 플레이어가 공유 — 10분 챌린지의 토대.',
    'landing.concept.algo.title': '알고리즘 = 캐릭터',
    'landing.concept.algo.body': '15종 RL 알고리즘이 각기 다른 성격의 세르파로 등장. 학명은 hover 툴팁, 표면은 “낙관적 멍청이 / 겁쟁이 / 공상가” 같은 성격 태그.',
    'landing.concept.visual.title': '시각적 RL 양념',
    'landing.concept.visual.body': 'Q-value 히트맵 + 정책 화살표 + sparkline 디폴트 ON — 학습이 눈에 보이는 시각 시그니처.',

    'landing.screenshots.heading': '스크린샷',
    'landing.screenshot.training.alt': 'Q-heatmap 시각화 — 각 셀의 색과 값에 세르파의 학습 결과가 드러나는 화면.',
    'landing.screenshot.daily.alt': '오늘의 도전 — 시드로 결정된 모디파이어와 던전 한 컷.',
    'landing.screenshot.party.alt': '세르파 길드 — 알고리즘 별 세르파를 영입하는 파티 화면.',
    'landing.screenshot.quest.alt': '챕터 진행 — 던전을 클리어할수록 다음 챕터가 열리는 구조.',

    'landing.quickstart.heading': '빠른 시작',
    'landing.quickstart.move': '방향키로 이동.',
    'landing.quickstart.death': 'HP 0 = 사망. 쓰러진 세르파는 유산의 힘으로 다시 일어선다.',
    'landing.quickstart.modifier': '런 시작 시 상단 모디파이어 띠 확인 → 캐릭터 선택.',
    'landing.quickstart.qvalue': 'Q-value 히트맵 색 = 학습한 위치 가치 (밝을수록 높음).',
    'landing.quickstart.daily': 'Daily 탭 = 모든 플레이어 동일 시드. 어제 기록과 자기 비교.',

    'landing.footnote.byproduct': 'RL 교육은 부산물.',
    'landing.footer.built_with': 'HTML5 캔버스. 백엔드 없음 (모든 상태는 localStorage).',
    'landing.footer.license': 'MIT License',
    'landing.footer.source_label': '소스',
};
