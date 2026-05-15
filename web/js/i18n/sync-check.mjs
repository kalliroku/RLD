/**
 * RLD i18n sync assertion (W1 — M5 → 1.0 게이트).
 *
 * 객체 사전 (MODIFIERS / CHARACTERS / CHAPTER_CONFIG / ITEMS) 의 ID 가 dict-ko 와 dict-en
 * 양쪽에 모두 i18n 키로 박혔는지 확인. 누락 시 build-time assertion 실패.
 *
 * 사유 (D-2026-05-15-15 / D-2026-05-15-16):
 *   객체에 한국어 필드 (name / desc / personality) 가 legacy fallback 으로 *남아있음* —
 *   호출처에서 t() 를 쓰지만, 신규 모디파이어/캐릭터 추가 시 객체 + dict-ko + dict-en 셋 다
 *   동시 갱신을 잊으면 사일런트 mojibake (영문 모드에서 한국어 노출 / 키 자체 노출) 발생.
 *
 * 실행:
 *   node web/js/i18n/sync-check.mjs
 *
 * 종료 코드:
 *   0 = 모든 ID 양 사전 박힘 (출시 게이트 통과)
 *   1 = 누락 있음 (목록 stderr 출력)
 *
 * 1.0 출시 직전 1회 자동화 가능 (pre-commit hook / CI step).
 */

import { MODIFIERS } from '../game/modifiers.js';
import { CHARACTERS } from '../game/game-config.js';
import { CHAPTER_CONFIG, ITEMS } from '../game/run-state.js';
import { STEPS as TUTORIAL_STEPS } from '../game/tutorial.js';
import { KO } from './dict-ko.js';
import { EN } from './dict-en.js';

const DICTS = { ko: KO, en: EN };
const errors = [];

function check(lang, key, ctx) {
    if (!(key in DICTS[lang])) {
        errors.push(`[${lang}] missing key: ${key}  (${ctx})`);
    }
}

// 1. modifiers — modifier.{id}.name / .desc
for (const id of Object.keys(MODIFIERS)) {
    for (const lang of ['ko', 'en']) {
        check(lang, `modifier.${id}.name`, `MODIFIERS[${id}]`);
        check(lang, `modifier.${id}.desc`, `MODIFIERS[${id}]`);
    }
}

// 2. characters — character.desc.{id} / character.personality.{id}
//    (이름은 D-2026-05-15-15 transliteration: dict 외 처리)
for (const id of Object.keys(CHARACTERS)) {
    for (const lang of ['ko', 'en']) {
        check(lang, `character.desc.${id}`, `CHARACTERS[${id}]`);
        check(lang, `character.personality.${id}`, `CHARACTERS[${id}]`);
    }
}

// 3. items — item.{id}.name / .desc
for (const id of Object.keys(ITEMS)) {
    for (const lang of ['ko', 'en']) {
        check(lang, `item.${id}.name`, `ITEMS[${id}]`);
        check(lang, `item.${id}.desc`, `ITEMS[${id}]`);
    }
}

// 4. chapters — chapter.{n} (1..7)
for (const { chapter } of CHAPTER_CONFIG) {
    for (const lang of ['ko', 'en']) {
        check(lang, `chapter.${chapter}`, `CHAPTER_CONFIG[${chapter}]`);
    }
}

// 5. tutorial — tutorial.{id} for each STEPS entry (W4: W1 사각지대 마감)
//    tutorial.dismiss 같은 고정 키는 parity check (#6) 가 잡음.
for (const { id } of TUTORIAL_STEPS) {
    for (const lang of ['ko', 'en']) {
        check(lang, `tutorial.${id}`, `TUTORIAL_STEPS[${id}]`);
    }
}

// 6. 양사전 키 수 동기 (전체 parity — 신규 키 추가 시 한쪽만 누락 방지)
const koKeys = new Set(Object.keys(KO));
const enKeys = new Set(Object.keys(EN));
for (const k of koKeys) {
    if (!enKeys.has(k)) errors.push(`[en] missing key: ${k}  (ko-only)`);
}
for (const k of enKeys) {
    if (!koKeys.has(k)) errors.push(`[ko] missing key: ${k}  (en-only)`);
}

// 보고
const summary = {
    modifiers: Object.keys(MODIFIERS).length,
    characters: Object.keys(CHARACTERS).length,
    items: Object.keys(ITEMS).length,
    chapters: CHAPTER_CONFIG.length,
    tutorial: TUTORIAL_STEPS.length,
    ko_keys: koKeys.size,
    en_keys: enKeys.size,
    errors: errors.length,
};

if (errors.length === 0) {
    console.log('✓ i18n sync OK');
    console.log(`  modifiers: ${summary.modifiers} / characters: ${summary.characters} / items: ${summary.items} / chapters: ${summary.chapters} / tutorial: ${summary.tutorial}`);
    console.log(`  ko keys: ${summary.ko_keys} / en keys: ${summary.en_keys} (parity ${summary.ko_keys === summary.en_keys ? '✓' : '✗'})`);
    process.exit(0);
} else {
    console.error('✗ i18n sync FAILED');
    for (const e of errors) console.error('  ' + e);
    console.error(`\n  total: ${errors.length} missing key(s)`);
    console.error(`  summary:`, summary);
    process.exit(1);
}
