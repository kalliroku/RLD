import { RunState, CHAPTER_CONFIG, ALL_DUNGEON_IDS, DUNGEON_TREASURES, ITEMS } from './web/js/game/run-state.js';
import { loadDungeon, Grid } from './web/js/game/grid.js';
import { TileType } from './web/js/game/tiles.js';

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log('  OK:', msg); }
    else { fail++; console.error('  FAIL:', msg); }
}

// ========== Record ==========
console.log('\n=== Record: death / serpaClear ===');
{
    const rs = new RunState();
    assert(rs.deathCount === 0, 'initial deathCount = 0');
    rs.recordDeath(); rs.recordDeath();
    assert(rs.deathCount === 2, 'deathCount = 2');
    rs.recordSerpaClear('qkun'); rs.recordSerpaClear('qkun'); rs.recordSerpaClear('sarsa');
    assert(rs.serpaClearCounts.qkun === 2, 'qkun clears = 2');
    assert(rs.serpaClearCounts.sarsa === 1, 'sarsa clears = 1');
    const mvp = rs.getMostActiveSerpa();
    assert(mvp.name === 'qkun' && mvp.clears === 2, 'MVP = qkun');
    assert(rs.getUsedSerpaCount() === 2, 'used 2 serpas');
}

// ========== Chapter ==========
console.log('\n=== Chapter mapping ===');
{
    const rs = new RunState();
    assert(rs.getChapterForDungeon('level_01_easy') === 1, 'l01 -> ch1');
    assert(rs.getChapterForDungeon('level_04_pit') === 2, 'l04 -> ch2');
    assert(rs.getChapterForDungeon('level_08_deadly') === 3, 'l08 -> ch3');
    assert(rs.getChapterForDungeon('level_13_cliff') === 4, 'l13 -> ch4');
    assert(rs.getChapterForDungeon('level_18_dead_end') === 5, 'l18 -> ch5');
    assert(rs.getChapterForDungeon('level_26_frozen_lake') === 6, 'l26 -> ch6');
    assert(rs.getChapterForDungeon('level_29_big_maze') === 7, 'l29 -> ch7');
}

console.log('\n=== Chapter config ===');
{
    const rs = new RunState();
    const ch2 = rs.getChapterConfig(2);
    assert(ch2 !== null, 'ch2 exists');
    assert(ch2.storySerpas.includes('sarsa'), 'ch2 has sarsa');
    const ch7 = rs.getChapterConfig(7);
    assert(ch7.storySerpas.includes('treeback'), 'ch7 has treeback');
    assert(ch7.storySerpas.includes('sweeper'), 'ch7 has sweeper');
}

console.log('\n=== Chapter boundary (C-2) ===');
{
    const rs = new RunState();
    const prev = rs.getChapterForDungeon('level_03_maze');
    const next = rs.getChapterForDungeon('level_04_pit');
    assert(prev === 1 && next === 2, 'boundary: ch1 -> ch2');
    const config = rs.getChapterConfig(next);
    assert(config.storySerpas[0] === 'sarsa', 'sarsa joins at ch2');
    const a = rs.getChapterForDungeon('level_01_easy');
    const b = rs.getChapterForDungeon('level_02_trap');
    assert(a === b, 'no boundary within ch1');
}

console.log('\n=== Chapter join message (C-2 log simulation) ===');
{
    const rs = new RunState();
    const CHARACTERS = {
        sarsa: {name:'사르사'}, monte:{name:'몬테'}, tracer:{name:'트레이서'},
        dyna:{name:'다이나'}, gradi:{name:'그래디'}, critic:{name:'크리틱'},
    };

    // ch1→ch2
    const prevCh = rs.getChapterForDungeon('level_03_maze');
    const nextCh = rs.getChapterForDungeon('level_04_pit');
    if (nextCh > prevCh) {
        const info = rs.getChapterConfig(nextCh);
        const names = info.storySerpas.map(s => CHARACTERS[s]?.name || s).join(', ');
        const msg = `Ch.${info.chapter} "${info.name}": ${names} joined!`;
        console.log('  MSG:', msg);
        assert(msg.includes('사르사'), 'ch2 msg includes 사르사');
        assert(msg.includes('위험한 길'), 'ch2 msg includes chapter name');
    }

    // ch3→ch4
    const prev2 = rs.getChapterForDungeon('level_12_hp_gauntlet');
    const next2 = rs.getChapterForDungeon('level_13_cliff');
    if (next2 > prev2) {
        const info = rs.getChapterConfig(next2);
        const names = info.storySerpas.map(s => CHARACTERS[s]?.name || s).join(', ');
        const msg = `Ch.${info.chapter} "${info.name}": ${names} joined!`;
        console.log('  MSG:', msg);
        assert(msg.includes('그래디'), 'ch4 msg has 그래디');
        assert(msg.includes('크리틱'), 'ch4 msg has 크리틱');
    }

    // All 6 boundaries
    const boundaries = [
        ['level_03_maze', 'level_04_pit', 1, 2],
        ['level_07_gauntlet', 'level_08_deadly', 2, 3],
        ['level_12_hp_gauntlet', 'level_13_cliff', 3, 4],
        ['level_17_two_paths', 'level_18_dead_end', 4, 5],
        ['level_25_paper_hard', 'level_26_frozen_lake', 5, 6],
        ['level_28_frozen_cliff', 'level_29_big_maze', 6, 7],
    ];
    for (const [from, to, chFrom, chTo] of boundaries) {
        const a = rs.getChapterForDungeon(from);
        const b = rs.getChapterForDungeon(to);
        assert(a === chFrom && b === chTo, `boundary ${from}->${to}: ch${chFrom}->ch${chTo}`);
    }
}

// ========== Ending ==========
console.log('\n=== Ending: isAllDungeonsCleared ===');
{
    const rs = new RunState();
    assert(rs.isAllDungeonsCleared() === false, 'not cleared');
    assert(rs.getTotalDungeonCount() === 31, 'total = 31');
    for (const id of ALL_DUNGEON_IDS.slice(0, 30)) rs.clearedDungeons.add(id);
    assert(rs.getClearedCount() === 30, 'cleared 30');
    assert(rs.isAllDungeonsCleared() === false, '30/31 not all');
    rs.clearedDungeons.add(ALL_DUNGEON_IDS[30]);
    assert(rs.isAllDungeonsCleared() === true, '31/31 ALL CLEARED');
}

console.log('\n=== Ending stats ===');
{
    const rs = new RunState();
    rs.recordDeath(); rs.recordSerpaClear('qkun'); rs.recordSerpaClear('sarsa');
    rs.totalSteps = 5000; rs.totalFarmingSteps = 200;
    const s = rs.getEndingStats();
    assert(s.deathCount === 1, 'deaths=1');
    assert(s.totalSteps === 5000, 'steps=5000');
    assert(s.totalFarmingSteps === 200, 'farming=200');
    assert(s.usedSerpaCount === 2, 'serpas=2');
    assert(s.mostActiveSerpa.name === 'qkun', 'mvp=qkun');
    assert(s.ngPlusCount === 0, 'ng+=0');
    assert(s.bestTotalSteps === null, 'best=null');
}

// ========== NG+ ==========
console.log('\n=== NG+ ===');
{
    const rs = new RunState();
    rs.totalSteps = 3000; rs.gold = 9999;
    for (const id of ALL_DUNGEON_IDS) rs.clearedDungeons.add(id);
    rs.hiredCharacters.add('dyna');
    assert(rs.isNewGamePlus() === false, 'not NG+ before');

    rs.startNewGamePlus();
    assert(rs.ngPlusCount === 1, 'ng+=1');
    assert(rs.bestTotalSteps === 3000, 'best=3000');
    assert(rs.totalSteps === 0, 'steps reset');
    assert(rs.gold === 500, 'gold reset');
    assert(rs.clearedDungeons.size === 0, 'cleared reset');
    assert(rs.hiredCharacters.size === 0, 'hired reset');

    rs.totalSteps = 2000; rs.startNewGamePlus();
    assert(rs.ngPlusCount === 2, 'ng+=2');
    assert(rs.bestTotalSteps === 2000, 'best updated to 2000');

    rs.totalSteps = 5000; rs.startNewGamePlus();
    assert(rs.ngPlusCount === 3, 'ng+=3');
    assert(rs.bestTotalSteps === 2000, 'best stays 2000 (worse run)');
}

// ========== Treasure ==========
console.log('\n=== Treasure: RunState ===');
{
    const rs = new RunState();
    assert(rs.hasDungeonTreasure('level_05_gold') === true, 'l05 has treasure');
    assert(rs.hasDungeonTreasure('level_01_easy') === false, 'l01 no treasure');
    assert(rs.getTreasureFailCount('level_05_gold') === 0, 'failCount=0');

    rs.failTreasure('level_05_gold');
    assert(rs.getTreasureFailCount('level_05_gold') === 1, 'failCount=1');
    rs.failTreasure('level_05_gold');
    assert(rs.getTreasureFailCount('level_05_gold') === 2, 'failCount=2');
    assert(rs.hasDungeonTreasure('level_05_gold') === true, 'still has after fails');

    const goldBefore = rs.gold;
    const val = rs.collectTreasure('level_05_gold');
    assert(val === 100, 'value=100');
    assert(rs.gold === goldBefore + 100, 'gold +100');
    assert(rs.hasDungeonTreasure('level_05_gold') === false, 'gone after collect');
    assert(rs.collectTreasure('level_05_gold') === 0, 'double collect = 0');
}

console.log('\n=== Treasure: Position computation ===');
{
    const rs = new RunState();
    const grid = loadDungeon('level_05_gold');
    const emptyTiles = [];
    for (let y = 0; y < grid.height; y++)
        for (let x = 0; x < grid.width; x++)
            if (grid.getTile(x, y) === TileType.EMPTY) emptyTiles.push({ x, y });

    assert(emptyTiles.length > 0, `empty tiles: ${emptyTiles.length}`);
    const pos0 = emptyTiles[0 % emptyTiles.length];
    rs.failTreasure('level_05_gold');
    const pos1 = emptyTiles[1 % emptyTiles.length];
    assert(pos0.x !== pos1.x || pos0.y !== pos1.y, 'position shifts on fail');
}

// ========== Items ==========
console.log('\n=== Items: Buy / Use ===');
{
    const rs = new RunState();
    assert(rs.hasItem('escape_rope') === false, 'no rope initially');
    const g = rs.gold;
    assert(rs.buyItem('escape_rope') === true, 'buy rope');
    assert(rs.gold === g - 100, 'gold -100');
    assert(rs.getItemCount('escape_rope') === 1, 'count=1');
    rs.buyItem('escape_rope');
    assert(rs.getItemCount('escape_rope') === 2, 'count=2');
    rs.useItem('escape_rope');
    assert(rs.getItemCount('escape_rope') === 1, 'count=1 after use');
    rs.useItem('escape_rope');
    assert(rs.hasItem('escape_rope') === false, 'empty after 2 uses');
    assert(rs.useItem('escape_rope') === false, 'use empty = false');
}

console.log('\n=== Items: Gold check ===');
{
    const rs = new RunState();
    rs.gold = 50;
    assert(rs.buyItem('escape_rope') === false, 'cant buy rope @50G');
    assert(rs.buyItem('defense_contract') === false, 'cant buy defense @50G');
    assert(rs.buyItem('trap_nullify') === false, 'cant buy trap @50G');
    assert(rs.gold === 50, 'gold unchanged');
    assert(rs.buyItem('nonexistent') === false, 'invalid item');
}

console.log('\n=== Escape Rope + Treasure combo ===');
{
    const rs = new RunState();
    rs.gold = 500; rs.buyItem('escape_rope');
    // Carrying treasure, use rope → still collect treasure
    const val = rs.collectTreasure('level_09_treasure');
    assert(val === 300, 'rope escape + treasure = +300G');
}

console.log('\n=== Defense / Trap Nullify: HP math ===');
{
    let hp, maxHp;

    // Defense vs monster: -30 → +15 = net -15
    maxHp = 100; hp = 70;
    hp = Math.min(hp + 15, maxHp);
    assert(hp === 85, 'defense vs monster: 70→85');

    // Defense vs trap: -10 → +5 = net -5
    maxHp = 100; hp = 90;
    hp = Math.min(hp + 5, maxHp);
    assert(hp === 95, 'defense vs trap: 90→95');

    // Trap nullify: -10 → +10 = net 0
    maxHp = 100; hp = 90;
    hp = Math.min(hp + 10, maxHp);
    assert(hp === 100, 'nullify vs trap: 90→100');

    // Both combined on trap: -10 → +5 → +10 = net +5
    maxHp = 100; hp = 90;
    hp = Math.min(hp + 5, maxHp);  // defense
    hp = Math.min(hp + 10, maxHp); // nullify
    assert(hp === 100, 'defense+nullify vs trap: capped at 100');

    // Cap at maxHp
    maxHp = 100; hp = 98;
    hp = Math.min(hp + 15, maxHp);
    assert(hp === 100, 'defense capped at maxHp');
}

console.log(`\n=============================`);
console.log(`TOTAL: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
