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
    'title.new_game': 'New Game',
    'title.continue': 'Continue',
    'title.dev_mode': 'Dev Mode',

    // === Guild hall ===
    'guild.title': 'RL Dungeon',
    'guild.run_format': 'Run #{n}',
    'guild.gold_format': '{n}G',
    'guild.food_format': '{n} Food',
    'guild.hp_format': 'HP {cur}/{max}',
    'guild.deaths_format': 'Deaths {cur}/{max}',
    'guild.tab.quest': 'Quest',
    'guild.tab.party': 'Party',
    'guild.tab.shop': 'Shop',
    'guild.tab.map': 'Map',

    // === Dev Mode header ===
    'dev.back_to_game': 'Back to Game',
    'dev.title': 'RL Dungeon',
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
    'game.step0_hint': 'Use arrow keys / WASD to move your Sherpa to the green G.',

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
    'overlay.briefing.provisions_title': 'Quick Provisions',
    'overlay.briefing.food_buy': '+{amount} Food ({cost}G)',
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
    'character.desc.default': 'Memorizes coordinates. Dungeon specialist.',

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

    // === Game mode toggles ===
    'game_mode.fog_of_war': 'Fog of War',
    'game_mode.sound': 'Sound',

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

    // === Game-over / death-limit ===
    'death_limit.toast': 'Deaths {cur}/{max} — next death resets the campaign.',
    'game_over.death_limit_suffix': ' — Death limit reached ({cur}/{max}). Next run.',
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
    'character.desc.qkun': 'Memorizes coordinates. Dungeon specialist.',
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
    'landing.quickstart.move': 'Move with arrow keys or WASD.',
    'landing.quickstart.death': 'HP 0 = death. 4 cumulative deaths restart the campaign.',
    'landing.quickstart.modifier': 'Check the modifier band at run start → pick your character.',
    'landing.quickstart.qvalue': 'Q-value heatmap color = learned value at that tile (brighter is higher).',
    'landing.quickstart.daily': 'The Daily tab uses one shared seed for all players. Compare against your own previous run.',

    'landing.footnote.byproduct': 'RL education is a byproduct.',
    'landing.footer.built_with': 'HTML5 canvas. No backend (state lives in localStorage).',
    'landing.footer.license': 'MIT License',
    'landing.footer.source_label': 'Source',
};
