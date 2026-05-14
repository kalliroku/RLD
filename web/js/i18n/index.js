/**
 * RLD i18n loader.
 *
 * 패턴 (D-2026-05-14-15 M5 폴리시):
 *   - HTML 정적: <... data-i18n="key"> / data-i18n-title / data-i18n-placeholder
 *   - JS 동적:   t('key', { steps: 12 })   //  "{steps}" 보간
 *
 * 누락 키는 fallback 한국어 → 그것도 없으면 key 자체 반환 (dev surface).
 * localStorage rld_lang 박제. private mode 가드.
 */

import { KO } from './dict-ko.js';
import { EN } from './dict-en.js';

const DICTS = { ko: KO, en: EN };
const FALLBACK_LANG = 'ko';
const STORAGE_KEY = 'rld_lang';

let currentLang = FALLBACK_LANG;
const listeners = new Set();

export function getLang() {
    return currentLang;
}

export function onLangChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function t(key, params) {
    const dict = DICTS[currentLang] || DICTS[FALLBACK_LANG];
    let val = dict[key];
    if (val == null && currentLang !== FALLBACK_LANG) {
        val = DICTS[FALLBACK_LANG][key];
    }
    if (val == null) return key;
    if (params && typeof val === 'string') {
        return val.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? params[k] : m));
    }
    return val;
}

export function applyTranslations(root) {
    root = root || document;
    if (!root.querySelectorAll) return;
    for (const el of root.querySelectorAll('[data-i18n]')) {
        const key = el.dataset.i18n;
        if (key) el.textContent = t(key);
    }
    for (const el of root.querySelectorAll('[data-i18n-title]')) {
        const key = el.dataset.i18nTitle;
        if (key) el.title = t(key);
    }
    for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
        const key = el.dataset.i18nPlaceholder;
        if (key) el.placeholder = t(key);
    }
    for (const el of root.querySelectorAll('[data-i18n-aria-label]')) {
        const key = el.dataset.i18nAriaLabel;
        if (key) el.setAttribute('aria-label', t(key));
    }
}

export function setLang(lang) {
    if (!(lang in DICTS)) return;
    if (currentLang === lang) return;
    currentLang = lang;
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch {
        /* private mode — silent */
    }
    if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
        applyTranslations(document);
    }
    for (const fn of listeners) {
        try { fn(lang); } catch {}
    }
}

export function initI18n() {
    let stored = null;
    try {
        stored = localStorage.getItem(STORAGE_KEY);
    } catch {
        /* private mode — silent */
    }
    currentLang = stored && stored in DICTS ? stored : FALLBACK_LANG;
    if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLang;
        applyTranslations(document);
    }
}

export { DICTS };
