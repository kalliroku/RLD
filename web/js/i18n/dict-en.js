/**
 * RLD English dictionary.
 *
 * Tone (decided 2026-05-14): Crisp / Functional — indie roguelike convention.
 *   - "Train", "Hire", "Buy" — short imperatives
 *   - "Cleared in 12 steps" — direct
 *   - Avoid Adventurer-flavored ("Embark", "Conquered") and Neutral-literal
 *
 * Missing keys fall back to dict-ko.js (Korean shows through during draft).
 * Final user review pass required before 1.0 — flagged carefully:
 *   - D-4 정체성 문구는 의역 (literal translation 부자연스러움)
 *   - Character names: transliteration 유지 (Q-kun → "Q", 사르사 → "Sarsa") — D-4 캐릭터 정체성 보존
 *   - "세르파" → "Sherpa" (시그니처 약어 보존)
 *   - In-game 카피는 narrative 톤 (D-2026-05-19-1 §10 / STORY.md §RL 메타 흡수 룰):
 *     학명 (Q-table / episode / reinforcement) 회피, "exploration" / "memory" 등
 *     narrative 어휘로. 학명은 hover 툴팁 (B-105) 만 opt-in. landing.meta.* /
 *     document.title 같은 외부 SEO 영역은 별 룰 (RL 키워드 유지 가능).
 */

export const EN = {
    // === Document ===
    'document.title': 'RL Dungeon — Serpa Guild',

    // === Title screen ===
    'title.logo': 'RL DUNGEON',
    'title.tagline': 'Dumb Sherpas, Deep Dungeons',
    'title.new_game': 'Start',
    'title.continue': 'Continue',
    'title.dev_mode': 'Dev Mode',

    // === Opening V2 — tutorial-as-opening (narrative locked 2026-06-02) ===
    'opening.v2.p2': "The dungeon I followed my father into for fun was nothing like I'd imagined…",
    'opening.v2.p5_a': "We're almost out of food.",
    'opening.v2.p5_b': "You go up first. I'll be right behind you.",
    'opening.v2.p5_c': '…But—',
    'opening.v2.scroll': 'Father unfurls the return scroll.',
    'opening.v2.p7': 'Dad never came back.',
    'opening.v2.clear': 'Clear',
    'opening.v2.food': 'Food',
    'opening.v2.food_low': 'Food is running low',
    'opening.v2.warn': 'WARN',
    'opening.v2.guild': 'Serpa Guild',
    'opening.v2.skip': 'ESC to skip',
    'opening.v2.move': 'Use the arrow keys',
    'opening.v2.guide': 'That light is the way out. Follow me.',
    'opening.v2.speaker_dad': 'Dad',
    'opening.v2.guide_a': "The exit's this way.",
    'opening.v2.guide_b': "Almost out. Don't stop.",
    'opening.v2.guide_c': 'Getting lost is dangerous — follow the light.',
    'opening.v2.continue': 'Press any key',

    // === Guild hall ===
    'guild.title': 'RL Dungeon',
    'guild.run_format': 'Run #{n}',
    'guild.gold_format': '{n}G',
    'guild.food_format': '{n} Food',
    'guild.hp_format': 'HP {cur}/{max}',
    'guild.tab.quest': 'Quest',
    'guild.tab.party': 'Party',
    'guild.tab.shop': 'Shop',
    'guild.tab.map': 'Map',

    // === Dev Mode header ===
    'dev.back_to_game': 'Back to Game',
    'dev.title': 'RL DUNGEON',
    'dev.subtitle': 'Serpa Guild — Guildmaster\'s Log',

    // === Mode tabs ===
    'mode.play': 'Play',
    'mode.daily': 'Daily',
    'mode.editor': 'Editor',

    // === Opening card (W7.1 — first new game, shown once) ===
    'opening.heading': 'The Serpa Guild',
    'opening.p1': "The Serpa Guild lived in the shadow of the Adventurers' Guild.",
    'opening.p2': "Your father was the era's hero and the founder of the Serpa Guild. No one knows what he saw deep in the dungeon. He used the return item to send you out, and never came back himself.",
    'opening.p3': "Years passed. The guild barely survived. The Adventurers' Guild blocked new challengers.",
    'opening.p4': "Today they call you back to the dungeon — believing your father left something behind.",
    'opening.p5': "You hold one thing: his legacy. An item that revives fallen Sherpas.",
    'opening.p6': "Time to begin again.",
    'opening.start': 'Begin',

    // === Game area ===
    'game.minimap': 'Minimap',
    'game.step0_hint': 'Use the arrow keys to move your Sherpa to the green G.',
    'game.bump_toast': 'Bump! (-1)',
    'game.reset_log': 'Game Reset! Food: {food}. Reach the green G.',
    'game.clear_repeat': 'Clear! +{reward}G (Steps: {steps}){treasure}',
    'game.first_clear.map_sold': 'First Clear! Map sold for {earned}G!',
    'game.first_clear.map_kept': 'First Clear! Map kept! Exclusive farming: {reward}G x {runs} runs',
    'quest.cost_label': 'Cost: {cost}G | {size}',
    'quest.reward_first': 'First Clear: +{reward}G',
    'quest.reward_farming': 'Farming: +{reward}G',
    'celebration.first_clear': 'First Clear!',
    'game.paid_entry': 'Paid {cost}G to enter. Food: {food}. Good luck!',

    // === Overlays ===
    'overlay.game_over.title': 'GAME OVER',
    'overlay.game_over.note': 'The Sherpa\'s memory persists. The next attempt will reach further.',
    'overlay.game_over.new_run': 'New Run',
    'overlay.ending.title': 'ALL DUNGEONS CLEARED!',
    'overlay.ending.note': 'The Sherpa\'s memory persists. Can you beat your record?',
    'overlay.ending.new_game_plus': 'New Game+',
    'overlay.briefing.back': 'Back',
    'overlay.briefing.deploy': 'Deploy',
    // briefing panel labels (D-2026-05-15-16 untouched-area closure)
    'overlay.briefing.entry_cost': 'Entry Cost',
    'overlay.briefing.first_reward': 'First Clear Reward',
    'overlay.briefing.repeat_reward': 'Repeat Reward',
    'overlay.briefing.train_cost': 'Train Cost',
    'overlay.briefing.treasure': 'Treasure',
    'overlay.briefing.modifiers': 'Modifiers',
    'overlay.briefing.your_gold': 'Your Gold',
    'overlay.briefing.food': 'Food',
    'overlay.briefing.mod_slippery': '[Slippery]',
    'overlay.briefing.mod_hp_aware': '[HP-Aware]',
    'overlay.briefing.hints_title': 'Hints',
    'overlay.briefing.hint_locked': '???',  // narrative 미스터리 유지 (한/영 동일)
    'overlay.briefing.provisions_title': 'Quick Provisions',
    'overlay.briefing.food_buy': '+{amount} Food ({cost}G)',
    'overlay.map_choice.title': 'FIRST CLEAR!',
    'overlay.map_choice.sell': 'Sell Map',
    'overlay.map_choice.keep': 'Keep Map',
    'overlay.map_choice.sell_detail': 'Sell: +{price}G (instant)',
    'overlay.map_choice.keep_detail': 'Keep: {reward}G/run × {runs} runs (exclusive farm)',
    'overlay.map_choice.unlock_next': '{name} Unlocked!',
    'overlay.map_choice.chapter_join': 'Ch.{ch} "{name}": {members} joined!',

    // === Stats panel ===
    'stat.run': 'Run',
    'stat.gold': 'Gold',
    'stat.food': 'Food',
    'stat.hp': 'HP',
    'stat.steps': 'Steps',
    'stat.reward': 'Reward',
    'stat.clear_rate': 'Clear Rate',
    'stats_toggle.show_more': 'More',
    'stats_toggle.show_less': 'Less',

    // === Game UI ===
    'food_warning': 'No food! Your Sherpa is starving!',
    'sparkline.label': 'Success rate',
    'placeholder.silent_q.title': 'Silent Learning',
    'placeholder.silent_q.desc': 'Visualization muted — modifier active',

    // === Right column section headers ===
    'section.character': 'Character',
    'section.stats': 'Sherpa Status',
    'section.dungeon': 'Dungeon',
    'section.provisions': 'Provisions',
    'section.farming': 'Farming',
    'section.training': 'AI Training',
    'section.game_mode': 'Game Mode',
    'section.visualization': 'Visualization',
    'section.controls': 'Controls',
    'section.legend': 'Legend',

    // === Character names (D-4 정체성 — transliteration 보존) ===
    'char.qkun': 'Q',
    'char.scout': 'Scout',
    'char.sarsa': 'Sarsa',
    'char.monte': 'Monte',
    'char.tracer': 'Tracer',
    'char.dyna': 'Dyna',
    'char.gradi': 'Gradi',
    'char.critic': 'Critic',
    'char.qvkun': 'QV',
    'char.acla': 'Acla',
    'char.ensemble': 'Ensemble',
    'char.exsa': 'ExSA',
    'char.doubleq': 'DoubleQ',
    'char.treeback': 'TreeBack',
    'char.sweeper': 'Sweeper',

    // === Character desc default (B-105) ===
    'character.desc.default': 'Remembers the exact path once walked. Strong on repeated dungeons.',

    // === Dungeon controls ===
    'dungeon.reset': 'Reset (R)',

    // === Provisions ===
    'provisions.food_label': 'Food:',
    'provisions.buy_food': 'Buy',
    'provisions.cost_format': '({cost}G)',
    'provisions.items_label': 'Items:',
    'provisions.item.escape_rope': 'Escape Rope 100G',
    'provisions.item.defense_contract': 'Defense Contract 150G',
    'provisions.item.trap_nullify': 'Trap Nullify 200G',

    // === Training ===
    'training.speed_label': 'Speed:',
    'training.speed.instant': 'Instant',
    'training.mode_label': 'Mode:',
    'training.mode.until_success': 'Until Success',
    'training.mode.continuous': 'Continuous',
    'training.btn.start': 'Train',
    'training.btn.stop': 'Stop',
    'training.finish.converged': 'Training complete. Clear: {rate}% ({episode} runs)',
    'training.finish.max_episodes': 'Max runs reached ({max}). Clear: {rate}%',
    'training.finish.out_of_gold': 'Out of gold. {cost}G/run required. Clear: {rate}%',
    'training.finish.stopped': 'Stopped after {episode} runs. Clear: {rate}%',
    'training.start.instant': 'Instant training... [{name}]',
    'ngplus.entered': 'New Game+ {n}! Memories preserved. Gold: {gold}G',

    // === Game mode toggles ===
    'game_mode.fog_of_war': 'Fog of War',
    'game_mode.sound': 'Sound',
    'game_mode.music': 'BGM',

    // === Visualization toggles ===
    'visualization.q_values': 'Show Q-values',
    'visualization.policy': 'Show Policy',

    // === Controls hint ===
    'controls.move_keys': 'Move',

    // === Legend ===
    'legend.start': 'Start',
    'legend.goal': 'Goal (+100)',
    'legend.trap': 'Trap (-10 HP)',
    'legend.heal': 'Heal (+10 HP)',
    'legend.pit': 'Pit (instant death)',
    'legend.gold': 'Gold (+10)',
    'legend.monster': 'Monster (-30 HP)',
    'legend.wall': 'Wall',

    // === Daily mode panel (T2B-1) ===
    'daily.title': 'Daily Challenge',
    'daily.label.date': 'Date',
    'daily.label.seed': 'Seed',
    'daily.label.modifiers': 'Modifiers',
    'daily.label.pool': 'Available',
    'daily.desc': 'Same seed every day. Beat yesterday.',
    'daily.btn.start': 'Start',
    'daily.btn.retry': 'Retry',
    'daily.yesterday': 'Yesterday',
    'daily.today': 'Today',
    'daily.week': 'Last 7 days',

    // === Bottom tabs (mobile, B-202) ===
    'bottom_tab.character': 'Char',
    'bottom_tab.dungeon': 'Dungeon',
    'bottom_tab.training': 'Train',
    'bottom_tab.provisions': 'Items',
    'bottom_tab.stats': 'Stats',
    'bottom_tab.aria_label': 'Section navigation',

    // === Footer ===
    'footer.controls_hint': 'Arrow keys to move | R to reset | Reach the green goal!',

    // === Modifier band (T2B-2) ===
    'modifier_band.this_run': 'This run:',

    // === Daily — buttons / messages ===
    'daily.btn.retry_record': 'Retry (Best)',
    'daily.start_msg': 'Daily Challenge started — seed #{seed}',
    'daily.victory_msg': 'Daily cleared! {steps} steps',
    'daily.victory.first_clear': '(First clear today!)',
    'daily.victory.improvement': '(New best, was {prev})',
    'daily.compare.same': 'tied with yesterday',
    'daily.compare.better': '{diff} steps under yesterday',  // diff is positive (caller passes Math.abs)
    'daily.compare.worse': '{diff} steps over yesterday',

    'daily.fail_msg': 'Daily failed — {cause}',
    'daily.fail_toast': 'Daily failed: {cause}',

    // === Daily — yesterday/today record rows ===
    'daily.row.date': 'Date',
    'daily.row.result': 'Result',
    'daily.row.cleared': '✓ Cleared',
    'daily.row.failed': '✗ Failed',
    'daily.row.best_steps': 'Best steps',
    'daily.row.attempts': 'Attempts',
    'daily.row.attempts_unit': '{n}',
    'daily.row.deaths': 'Deaths',
    'daily.row.deaths_unit': '{n}',

    // === Hire (T2B-3) ===
    'hire.need_gold': '{name}: not enough gold! Need {cost}G (have {gold}G)',
    'hire.confirm': 'Hire {name} ({personality}) for {cost}G?',
    'hire.success': 'Hired {name}! -{cost}G',

    // === Game-over ===
    'game_over.starvation': 'Food depleted. Stranded in the dungeon.',

    // === Food warning (F2 threshold alert) ===
    'food.warn.threshold': '⚠️ Food low! Head back to the exit.',

    // === Escape rope (emergency item) ===
    'rope.escape': 'Emergency escape! Rope consumed.',
    'rope.escape_with_treasure': 'Emergency escape! Rope consumed. Treasure +{val}G!',

    // === Modifier in-game effects ===
    'modifier_effect.wind_gust': 'Wind gust! Action skipped.',

    // === Tutorial-ish triggers ===
    'tutorial.train_now': "Now try AI Training — teach your Sherpa to memorize the path.",

    // === Modifiers (12종, D-2026-05-14-14) ===
    // 환경 6
    'modifier.slippery.name': 'Slippery Floor',
    'modifier.slippery.desc': 'Movement deflects sideways 30% of the time.',
    'modifier.heavy_fog.name': 'Heavy Fog',
    'modifier.heavy_fog.desc': 'Vision range 5 → 3 tiles.',
    'modifier.dim_torch.name': 'Dim Torch',
    'modifier.dim_torch.desc': 'Vision range 5 → 2 tiles.',
    'modifier.poison_floor.name': 'Poison Floor',
    'modifier.poison_floor.desc': '-1 HP per empty tile stepped.',
    'modifier.acid_rain.name': 'Acid Rain',
    'modifier.acid_rain.desc': '-3 HP every 10 steps (time pressure).',
    'modifier.wind_gust.name': 'Wind Gust',
    'modifier.wind_gust.desc': '10% chance to skip your action.',
    // 제약 6
    'modifier.two_only.name': 'Only Two',
    'modifier.two_only.desc': 'Only 2 Sherpas available.',
    'modifier.hp_cap_50.name': 'HP Cap 50',
    'modifier.hp_cap_50.desc': 'Max HP capped at 50.',
    'modifier.mirror_input.name': 'Mirror Input',
    'modifier.mirror_input.desc': 'Manual play left/right inputs swapped.',
    'modifier.no_heal.name': 'No Heal',
    'modifier.no_heal.desc': 'Heal tiles do nothing.',
    'modifier.damage_boost.name': 'Critical Wound',
    'modifier.damage_boost.desc': 'Monster/trap damage × 1.5.',
    'modifier.silent_q.name': 'Silent Learning',
    'modifier.silent_q.desc': 'Q-value heatmap and sparkline hidden.',

    // === Tutorial steps (5개) ===
    'tutorial.welcome': "Welcome! Use arrow keys to move your Sherpa to the green G (goal).",
    'tutorial.first_dungeon': "First dungeon cleared! Move on, or use AI Training to teach your Sherpa the path.",
    'tutorial.ai_training': 'The Sherpa learns the dungeon through repeated exploration. Try different speeds — Instant is fastest. Each exploration costs gold.',
    'tutorial.economy': 'Dungeons now cost gold to enter. Sell maps for instant cash, or keep them for farming runs.',
    'tutorial.farming': 'Farming unlocked! Assign a trained Sherpa to a cleared dungeon to earn gold automatically.',
    'tutorial.dismiss': 'OK',

    // === Chapter names (7개) ===
    'chapter.1': 'First Steps',
    'chapter.2': 'Dangerous Path',
    'chapter.3': 'Wider World',
    'chapter.4': 'Instinct & Critique',
    'chapter.5': 'Power of Consensus',
    'chapter.6': 'Uncertain Ground',
    'chapter.7': 'The Abyss',

    // === Items (3종) ===
    'item.escape_rope.name': 'Emergency Rope',
    'item.escape_rope.desc': 'Instant return to start (death prevention)',
    'item.defense_contract.name': 'Defense Contract',
    'item.defense_contract.desc': 'Damage halved for 1 exploration',
    'item.trap_nullify.name': 'Trap Disarm Contract',
    'item.trap_nullify.desc': 'Traps nullified for 1 exploration',

    // === Character personalities (15종, hire.confirm 노출) ===
    'character.personality.qkun': 'Cheerful Fool',
    'character.personality.scout': 'Nearsighted Scout',
    'character.personality.sarsa': 'Coward',
    'character.personality.monte': 'Goes All the Way',
    'character.personality.tracer': 'Trail Tracker',
    'character.personality.dyna': 'Daydreamer',
    'character.personality.gradi': 'Cheap Gut-Feel',
    'character.personality.critic': 'Nitpicker',
    'character.personality.qvkun': 'Split Personality',
    'character.personality.acla': 'Capricious',
    'character.personality.ensemble': 'The Committee',
    'character.personality.exsa': 'Calculator',
    'character.personality.doubleq': 'Skeptic',
    'character.personality.treeback': 'Seer',
    'character.personality.sweeper': 'Efficient',

    // === Character descriptions (15종) ===
    'character.desc.qkun': 'Remembers the exact path once walked. Strong on repeated dungeons.',
    'character.desc.scout': 'Learns from surroundings. Brings experience to new dungeons.',
    'character.desc.sarsa': 'Learns from mistakes. Prefers the safe path.',
    'character.desc.monte': "Has to see it through to the end! A finisher who reflects after the run.",
    'character.desc.tracer': 'Leaves a trail while learning. Credits distant past choices.',
    'character.desc.dyna': 'Imagination master. Replays experience in their head.',
    'character.desc.gradi': 'Instinctive explorer. Probabilistic choice — tries diverse paths.',
    'character.desc.critic': 'Actor and critic combined. Stable and efficient.',
    'character.desc.qvkun': 'Learns Q and V together. Less overestimation, more stable.',
    'character.desc.acla': 'Learning automaton. Tweaks probabilities directly for fast policy shifts.',
    'character.desc.ensemble': 'Consensus of 5 algorithms. Picks the best via Boltzmann product.',
    'character.desc.exsa': 'Learns by expectation. Variance-free updates dominate Q and Sarsa alike.',
    'character.desc.doubleq': 'Two eyes, no bias. The overestimation killer.',
    'character.desc.treeback': 'Strategist that sees n steps ahead. Grows trees of expectation.',
    'character.desc.sweeper': 'Prioritizes what matters most. Dyna evolved.',

    // === Editor (D-3 dungeon-master mode — Act 2-onward content, system labels keep scientific terms) ===
    // Subtabs
    'editor.tab.stage': 'Stage',
    'editor.tab.dungeon': 'Dungeon',
    // Section headings
    'editor.head.grid_size': 'Grid Size',
    'editor.head.tile_palette': 'Tile Palette',
    'editor.head.tools': 'Tools',
    'editor.head.actions': 'Actions',
    'editor.head.stage_library': 'Stage Library',
    'editor.head.quick_test': 'Quick Test',
    'editor.head.shortcuts': 'Shortcuts',
    'editor.head.dungeon_composer': 'Dungeon Composer',
    'editor.head.floors': 'Floors',
    'editor.head.rules': 'Rules',
    // Buttons
    'editor.btn.apply': 'Apply',
    'editor.btn.undo': 'Undo',
    'editor.btn.redo': 'Redo',
    'editor.btn.clear': 'Clear',
    'editor.btn.validate': 'Validate',
    'editor.btn.save': 'Save',
    'editor.btn.load': 'Load',
    'editor.btn.delete': 'Delete',
    'editor.btn.play_stage': 'Play This Stage',
    'editor.btn.save_dungeon': 'Save Dungeon',
    'editor.btn.play_dungeon': 'Play This Dungeon',
    'editor.btn.add_floor': '+ Add Floor',
    'editor.btn.quick_test': 'Quick Test',
    'editor.btn.stop': 'Stop',
    // Tools
    'editor.tool.brush': 'Brush',
    'editor.tool.eraser': 'Eraser',
    'editor.tool.fill': 'Fill',
    // Placeholders
    'editor.placeholder.stage_name': 'Stage name...',
    'editor.placeholder.dungeon_name': 'Dungeon name...',
    // Select options
    'editor.option.select': '-- Select --',
    'editor.option.select_dungeon': '-- Select Dungeon --',
    // Quick test labels
    'editor.qt.character': 'Character:',
    'editor.qt.episodes': 'Episodes:',
    'editor.qt.show_policy': 'Show learned policy',
    // Shortcut hints (Undo/Redo reuse btn.*)
    'editor.short.select_tile': 'Select tile',
    'editor.short.erase': 'Erase',
    // Rules
    'editor.rule.hp_carry': 'HP Carry Over',
    'editor.rule.gold_on_clear': 'Gold on Clear Only',
    // Default name (editor.js onPlayDungeon fallback)
    'editor.default.custom_dungeon': 'Custom Dungeon',
    // Editor messages (showEditorMessage body — main.js call sites, textContent safe)
    'editor.msg.grid_resized': 'Grid resized to {w}×{h}',
    'editor.msg.grid_cleared': 'Grid cleared',
    'editor.msg.valid_ready': 'Valid! Ready to play.',
    'editor.msg.enter_stage_name': 'Enter a stage name',
    'editor.msg.enter_dungeon_name': 'Enter a dungeon name',
    'editor.msg.fix_errors_first': 'Fix errors first: {errors}',
    'editor.msg.saved': 'Saved "{name}"',
    'editor.msg.loaded': 'Loaded "{name}"',
    'editor.msg.deleted': 'Deleted',
    'editor.msg.add_floor': 'Add at least one floor',
    'editor.msg.floor_no_stage': 'Floor {floor} has no stage selected',
    'editor.msg.floor_variant_empty': 'Floor {floor}, variant {variant} is empty',
    'editor.msg.saved_dungeon': 'Saved dungeon "{name}"',
    'editor.msg.dungeon_not_found': 'Dungeon not found',
    'editor.msg.loaded_dungeon': 'Loaded dungeon "{name}"',
    'editor.msg.dungeon_deleted': 'Dungeon deleted',
    'editor.msg.resolve_dungeon_failed': 'Failed to resolve dungeon stages',
    'editor.msg.max_floors': 'Maximum 5 floors',
    'editor.msg.no_floors_yet': 'No floors yet. Click "+ Add Floor" to start.',  // sync with editor.btn.add_floor
    'editor.btn.remove_floor': 'Remove floor',
    'editor.btn.remove_variant': 'Remove variant',
    // Editor validation errors (editor.js errors array — { key, params? } objects, surfaced via main.js showEditorErrorsMessage with errors.map(e => t(e.key, e.params)).join(', ') re-evaluated on each toggle, W12)
    'editor.err.no_grid': 'No grid created',
    'editor.err.start_missing': 'START tile is missing',
    'editor.err.goal_missing': 'GOAL tile is missing',
    'editor.err.no_path': 'No path from START to GOAL',
    'editor.err.test_running': 'Test already running',
    'editor.err.qt_not_configured': 'Quick test not configured',

    // === Dungeon names (31 — preserves prior English names from main.js:1819, ko side carries D-2026-05-19-1 narrative)
    'dungeon.level_01_easy': 'Tutorial',
    'dungeon.level_02_trap': 'First Trap',
    'dungeon.level_03_maze': 'Maze',
    'dungeon.level_04_pit': 'Pit Danger',
    'dungeon.level_05_gold': 'Gold Rush',
    'dungeon.level_06_risk': 'Risk & Reward',
    'dungeon.level_07_gauntlet': 'Gauntlet',
    'dungeon.level_08_deadly': 'Deadly Maze',
    'dungeon.level_09_treasure': 'Treasure Hunt',
    'dungeon.level_10_final': 'Final',
    'dungeon.level_11_hp_test': 'HP Test',
    'dungeon.level_12_hp_gauntlet': 'HP Gauntlet',
    'dungeon.level_13_cliff': 'Cliff Walk',
    'dungeon.level_14_long_hall': 'Long Hall',
    'dungeon.level_15_multi_room': 'Multi Room',
    'dungeon.level_16_open_field': 'Open Field',
    'dungeon.level_17_two_paths': 'Two Paths',
    'dungeon.level_18_dead_end': 'Dead End Labyrinth',
    'dungeon.level_19_bridge': 'Narrow Bridge',
    'dungeon.level_24_paper_maze': 'Paper Maze',
    'dungeon.level_25_paper_hard': 'Paper Maze+',
    'dungeon.level_26_frozen_lake': 'Frozen Lake',
    'dungeon.level_27_ice_maze': 'Ice Maze',
    'dungeon.level_28_frozen_cliff': 'Frozen Cliff',
    'dungeon.level_29_big_maze': 'Big Maze (25×25)',
    'dungeon.level_30_generated_cave': 'Cave (50×50)',
    'dungeon.level_31_generated_rooms': 'Rooms (50×50)',
    'dungeon.level_20_sacrifice': 'Cliff Walking',
    'dungeon.level_21_desert': 'Desert Crossing',
    'dungeon.level_22_arena': 'Monster Arena',
    'dungeon.level_23_mirage': 'The Mirage',

    // === Dungeon hints (game-config.js DUNGEON_HINTS — D-15 Crisp tone, scientific terms absorbed into character idiom)
    'hint.level_01_easy.0': 'Cramped. Five paces end to end.',
    'hint.level_02_trap.0': 'The floor gives way. Step softly.',
    'hint.level_03_maze.0': "Seven paces of labyrinth. One wrong turn and you're lost.",
    'hint.level_04_pit.0': 'One misstep and it ends. The cliff yawns wide.',
    'hint.level_05_gold.0': 'Traps lurk within seven paces.',
    'hint.level_05_gold.1': 'An optimistic one will do.',
    'hint.level_06_risk.0': 'The reward is great. So is the danger.',
    'hint.level_06_risk.1': 'Step on the healing tiles wisely.',
    'hint.level_07_gauntlet.0': 'Traps await in succession.',
    'hint.level_07_gauntlet.1': 'Vitality management is key.',
    'hint.level_08_deadly.0': 'Maze, traps, and pits in one place.',
    'hint.level_08_deadly.1': 'Send a sturdy one.',
    'hint.level_09_treasure.0': 'Treasure lies hidden.',
    'hint.level_09_treasure.1': 'Walk in the shadows to stay safe.',
    'hint.level_10_final.0': 'The final trial. Everything converges.',
    'hint.level_10_final.1': 'The best of the Sherpas is needed.',
    'hint.level_11_hp_test.0': 'Vitality feels different here.',
    'hint.level_12_hp_gauntlet.0': 'Weight plus successive blows.',
    'hint.level_12_hp_gauntlet.1': 'A healer would help, if only...',
    'hint.level_13_cliff.0': 'A narrow path along the cliff. Every step matters.',
    'hint.level_14_long_hall.0': 'An endless hall. Conserve your steps.',
    'hint.level_15_multi_room.0': 'Many rooms intertwined.',
    'hint.level_16_open_field.0': 'An open space. Vision reaches far.',
    'hint.level_17_two_paths.0': 'Two paths. One safe, one trapped.',
    'hint.level_17_two_paths.1': 'A quick one fares better.',
    'hint.level_18_dead_end.0': 'Many dead ends.',
    'hint.level_18_dead_end.1': 'An imaginative one is suited.',
    'hint.level_19_bridge.0': 'A narrow bridge. No turning back.',
    'hint.level_24_paper_maze.0': 'Walls thin as paper.',
    'hint.level_25_paper_hard.0': 'The paper maze, deeper.',
    'hint.level_25_paper_hard.1': 'A consensus of several is needed.',  // absorbs ensemble
    'hint.level_26_frozen_lake.0': "Ice. Steps don't follow intent.",
    'hint.level_26_frozen_lake.1': 'One who trusts averages fares better.',  // absorbs Expected SARSA
    'hint.level_27_ice_maze.0': 'An icy maze. Slipping ends at the walls.',
    'hint.level_28_frozen_cliff.0': 'An icy cliff. Slipping means falling.',
    'hint.level_28_frozen_cliff.1': 'A two-eyed one is needed.',  // absorbs Double-Q
    'hint.level_29_big_maze.0': 'A vast labyrinth. End it within a thousand steps.',
    'hint.level_29_big_maze.1': 'One who maps the dungeon in mind is efficient.',  // absorbs Dyna-Q model-based
    'hint.level_30_generated_cave.0': 'The map differs each time.',
    'hint.level_30_generated_cave.1': 'One who sorts what matters first is needed.',  // absorbs Prioritized Sweeping
    'hint.level_31_generated_rooms.0': 'Room layouts change each time.',
    'hint.level_31_generated_rooms.1': 'One who sees several steps ahead is needed.',  // absorbs Tree Backup / n-step
    'hint.purchased': 'Hint acquired! -{cost}G',

    // === Language toggle ===
    'lang.toggle': '한국어',
    'lang.toggle.aria_label': 'Switch language',

    // === Landing page (marketing — web/index.html, game at web/play.html) ===
    'landing.meta.title': 'RL Dungeon — An algorithm-as-character seeded roguelike',
    'landing.meta.description': 'An algorithm-as-character seeded roguelike. Clear dungeons with a limited Sherpa pool under shifting modifiers each run.',

    'landing.hero.tagline': 'An algorithm-as-character seeded roguelike',
    'landing.hero.subtagline': 'Clear dungeons with a limited Sherpa pool under shifting modifiers each run.',
    'landing.hero.cta_play': 'Play in Browser',
    'landing.hero.cta_github': 'GitHub',

    'landing.concept.heading': 'Core Concepts',
    'landing.concept.seeded.title': 'Seeded Runs',
    'landing.concept.seeded.body': 'New modifiers each run (slippery floor / heavy fog / two only). The daily seed is shared by every player — the bedrock of a 10-minute challenge.',
    'landing.concept.algo.title': 'Algorithms as Characters',
    'landing.concept.algo.body': '15 RL algorithms appear as Sherpas with distinct personalities. Hover for the academic name; surface tags read “optimistic fool / coward / dreamer”.',
    'landing.concept.visual.title': 'Visual RL Flavor',
    'landing.concept.visual.body': 'Q-value heatmap + policy arrows + sparkline on by default — a visual signature where learning is plainly visible.',

    'landing.screenshots.heading': 'Screenshots',
    'landing.screenshot.training.alt': 'Q-heatmap visualization — learned values surface as cell colors and numbers.',
    'landing.screenshot.daily.alt': 'Daily challenge — seeded modifiers and dungeon in one frame.',
    'landing.screenshot.party.alt': 'Serpa guild — hire screen with one character per algorithm.',
    'landing.screenshot.quest.alt': 'Chapter progression — clearing dungeons unlocks the next chapter.',

    'landing.quickstart.heading': 'Quick Start',
    'landing.quickstart.move': 'Move with the arrow keys.',
    'landing.quickstart.death': 'HP 0 = death. Fallen Sherpas are revived by the legacy.',
    'landing.quickstart.modifier': 'Check the modifier band at run start → pick your character.',
    'landing.quickstart.qvalue': 'Q-value heatmap color = learned value at that tile (brighter is higher).',
    'landing.quickstart.daily': 'The Daily tab uses one shared seed for all players. Compare against your own previous run.',

    'landing.footnote.byproduct': 'RL education is a byproduct.',
    'landing.footer.built_with': 'HTML5 canvas. No backend (state lives in localStorage).',
    'landing.footer.license': 'MIT License',
    'landing.footer.source_label': 'Source',
};
