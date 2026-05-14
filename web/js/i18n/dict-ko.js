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
    'document.title': 'RL Dungeon - 강화학습 던전',

    // === Title screen ===
    'title.logo': 'RL DUNGEON',
    'title.tagline': '멍청한 세르파와 던전 답파',
    'title.new_game': 'New Game',
    'title.continue': 'Continue',
    'title.dev_mode': 'Dev Mode',

    // === Guild hall ===
    'guild.title': 'RL Dungeon',
    'guild.run_format': 'Run #{n}',
    'guild.gold_format': '{n}G',
    'guild.food_format': '{n} Food',
    'guild.hp_format': 'HP {cur}/{max}',
    'guild.deaths_format': '사망 {cur}/{max}',
    'guild.tab.quest': 'Quest',
    'guild.tab.party': 'Party',
    'guild.tab.shop': 'Shop',
    'guild.tab.map': 'Map',

    // === Dev Mode header ===
    'dev.back_to_game': 'Back to Game',
    'dev.title': 'RL Dungeon',
    'dev.subtitle': '강화학습 던전 탐험 — Dev Mode',

    // === Mode tabs ===
    'mode.play': 'Play',
    'mode.daily': '오늘의 도전',
    'mode.editor': 'Editor',

    // === Game area ===
    'game.minimap': '미니맵',
    'game.step0_hint': '방향키 / WASD 로 세르파를 움직여 녹색 G 에 도달.',

    // === Overlays ===
    'overlay.game_over.title': 'GAME OVER',
    'overlay.game_over.note': 'Q-table is preserved. Your serpas remember everything.',
    'overlay.game_over.new_run': 'New Run',
    'overlay.ending.title': 'ALL DUNGEONS CLEARED!',
    'overlay.ending.note': 'Q-tables preserved. Can you beat your record?',
    'overlay.ending.new_game_plus': 'New Game+',
    'overlay.briefing.back': 'Back',
    'overlay.briefing.deploy': 'Deploy',
    'overlay.map_choice.title': 'FIRST CLEAR!',
    'overlay.map_choice.sell': 'Sell Map',
    'overlay.map_choice.keep': 'Keep Map',

    // === Stats panel ===
    'stat.run': 'Run',
    'stat.gold': 'Gold',
    'stat.food': 'Food',
    'stat.hp': 'HP',
    'stat.steps': 'Steps',
    'stat.reward': 'Reward',
    'stat.clear_rate': 'Clear Rate',
    'stats_toggle.show_more': '더보기',
    'stats_toggle.show_less': '접기',

    // === Game UI ===
    'food_warning': 'No food! Your serpa is starving!',
    'sparkline.label': '학습 성공률',
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
    'char.qkun': 'Q군',
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
    'character.desc.default': '좌표를 외워서 학습합니다. 던전별 전문가.',

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

    // === Game mode toggles ===
    'game_mode.fog_of_war': '전장의 안개',
    'game_mode.sound': '소리',

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
    'footer.controls_hint': 'Arrow keys to move | R to reset | Reach the green goal!',

    // === Modifier band (T2B-2) ===
    'modifier_band.this_run': '이번 런:',

    // === Daily — buttons / messages ===
    'daily.btn.retry_record': '다시 도전 (기록 갱신)',
    'daily.start_msg': '오늘의 도전 시작 — 시드 #{seed}',
    'daily.victory_msg': '오늘의 도전 클리어! {steps} 스텝',
    'daily.victory.first_clear': '(오늘 첫 성공!)',
    'daily.victory.improvement': '(최고 기록 갱신, 이전 {prev})',
    'daily.compare.same': '어제와 동일',
    'daily.compare.better': '어제 {diff} 스텝',
    'daily.compare.worse': '어제 +{diff} 스텝',
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

    // === Game-over / death-limit ===
    'death_limit.toast': '누적 사망 {cur}/{max} — 다음 게임오버에서 캠페인 처음부터.',
    'game_over.death_limit_suffix': ' — 누적 사망 한도 도달 ({cur}/{max}). 다음 런으로.',

    // === Modifier in-game effects ===
    'modifier_effect.wind_gust': '돌풍! 행동이 묶였습니다.',

    // === Tutorial-ish triggers ===
    'tutorial.train_now': '이제 AI 에게 길을 외우게 시켜보세요.',

    // === Language toggle ===
    'lang.toggle': 'EN',
    'lang.toggle.aria_label': '언어 전환',
};
