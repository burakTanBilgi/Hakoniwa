import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { createTranslator } from './translate.js';
import en from './en.js';
import tr from './tr.js';

const DICTS = { en, tr };
const SUPPORTED = ['en', 'tr'];
const LANG_KEY = 'hakoniwa:lang';

/** Initial language: saved preference -> browser language -> English. */
export function loadLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch { /* ignore */ }
  try {
    if ((navigator.language || '').toLowerCase().startsWith('tr')) return 'tr';
  } catch { /* ignore */ }
  return 'en';
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(loadLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const setLang = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLangState(next);
  }, []);

  const t = useMemo(() => createTranslator(DICTS[lang] || en, en, lang), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Provider-less fallback: an English translator. Lets components render in
// isolation (existing unit tests) with no I18nProvider wrapper.
const FALLBACK_T = createTranslator(en, en, 'en');

/** Returns the active translator `t(key, params)`. Safe without a provider. */
export function useT() {
  const ctx = useContext(I18nContext);
  return ctx ? ctx.t : FALLBACK_T;
}

/** Returns `{ lang, setLang }`. Safe without a provider (no-op setLang). */
export function useLang() {
  const ctx = useContext(I18nContext);
  return ctx ? { lang: ctx.lang, setLang: ctx.setLang } : { lang: 'en', setLang: () => {} };
}
