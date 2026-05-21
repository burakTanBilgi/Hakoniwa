# Multi-language Support (English + Turkish) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hand-rolled English/Turkish i18n to Hakoniwa — a dependency-free i18n module, a language switcher, and translation of all ~250 UI-chrome strings.

**Architecture:** A self-contained `src/i18n/` module: a pure resolver, two flat dictionaries, and a React context. Language state mirrors the theme system — owned by a provider, persisted to `localStorage`, reflected on `<html lang>`. Components read strings via a `useT()` hook that works *without* a provider (English fallback), so existing isolated component tests are unaffected.

**Tech Stack:** React 18, Vite 5, Vitest + happy-dom + React Testing Library. No new dependencies — `Intl.PluralRules` / `toLocaleDateString` provide locale correctness.

**Spec:** `docs/multi-language-support-design.md`

---

## Context for the implementer

- **No TypeScript.** Plain JS + JSDoc. No new dependencies.
- **Tests** live under `tests/unit/**/*.test.{js,jsx}` (mirroring `src/`), run by `npm test`. Setup (`tests/setup.js`) gives each test a fresh in-memory `localStorage`. `159` baseline tests must stay green throughout. (Run `npm test` once before starting to confirm the baseline count on your machine.)
- **The theme system is the precedent.** `src/ui/App.jsx` owns `theme`, persists it to `localStorage['hakoniwa:theme']`, and sets `data-theme` on `<html>`. The i18n provider does the same with `lang`.
- **`src/puzzle/` is a portable drop-in module** — it must not import anything from outside itself. **Never edit files under `src/puzzle/`.** Where puzzle data carries English labels (`effects-catalog.js`), the *UI* translates them by id (see Task 11).
- **`src/ui/components/docs/**` and `src/ui/pages/DocsPage.jsx` are OUT OF SCOPE** — the Docs tutorial prose stays English (spec §1). Do not migrate them.
- Two phases: **Part 1 (Tasks 1–6)** builds the i18n infrastructure with full TDD. **Part 2 (Tasks 7–12)** is the mechanical string migration. **Task 13** is the Turkish review + final verification.

## File structure

**New files:**

| File | Responsibility |
|------|----------------|
| `src/i18n/translate.js` | Pure resolver: key lookup, `{token}` interpolation, plural selection. |
| `src/i18n/en.js` | English dictionary (canonical — flat object, dotted keys). |
| `src/i18n/tr.js` | Turkish dictionary (mirrors `en.js` keys). |
| `src/i18n/I18nProvider.jsx` | React context, `loadLang()`, `useT()`, `useLang()`. |
| `src/i18n/index.js` | Public barrel. |
| `tests/unit/i18n/translate.test.js` | Resolver unit tests. |
| `tests/unit/i18n/dictionaries.test.js` | `en`/`tr` key-parity + placeholder-parity tests. |
| `tests/unit/i18n/I18nProvider.test.jsx` | Provider + hooks tests. |
| `tests/unit/ui/utils/formatTime.test.js` | `formatTime` tests (new signature). |
| `tests/unit/ui/components/PageNav.test.jsx` | Language-switcher tests. |

**Modified:** `src/main.jsx`, `src/ui/utils/formatTime.js`, `src/ui/components/PageNav.jsx` + `PageNav.css`, and string extraction across `src/ui/` (pages + components, excluding `docs/**` + `DocsPage.jsx`) and `src/embeds/`.

---

# Part 1 — Foundation

## Task 1: Pure resolver — `translate.js`

**Files:**
- Create: `src/i18n/translate.js`
- Test: `tests/unit/i18n/translate.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/i18n/translate.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { interpolate, resolve, createTranslator } from '../../../src/i18n/translate.js';

describe('interpolate', () => {
  it('replaces {token} placeholders', () => {
    expect(interpolate('{n} items', { n: 3 })).toBe('3 items');
  });
  it('leaves unknown placeholders untouched', () => {
    expect(interpolate('{a} {b}', { a: 'x' })).toBe('x {b}');
  });
  it('returns the template unchanged when no params', () => {
    expect(interpolate('plain', undefined)).toBe('plain');
  });
});

describe('resolve', () => {
  it('looks up a key in the active dictionary', () => {
    expect(resolve({ hi: 'Selam' }, {}, 'tr', 'hi')).toBe('Selam');
  });
  it('falls back to English when the key is missing from the active dict', () => {
    expect(resolve({ hi: 'Selam' }, { hi: 'Hi', bye: 'Bye' }, 'tr', 'bye')).toBe('Bye');
  });
  it('returns the key itself when missing everywhere', () => {
    expect(resolve({}, {}, 'en', 'nope.key')).toBe('nope.key');
  });
  it('interpolates params', () => {
    expect(resolve({ msg: 'Hi {who}' }, {}, 'en', 'msg', { who: 'Ada' })).toBe('Hi Ada');
  });
  it('selects the English plural form by count', () => {
    const d = { 'x.one': '{n} item', 'x.other': '{n} items' };
    expect(resolve(d, d, 'en', 'x', { n: 1 })).toBe('1 item');
    expect(resolve(d, d, 'en', 'x', { n: 5 })).toBe('5 items');
  });
  it('falls back to the .other plural form when a category is absent', () => {
    const d = { 'x.other': '{n} öğe' };
    expect(resolve(d, d, 'tr', 'x', { n: 1 })).toBe('1 öğe');
  });
});

describe('createTranslator', () => {
  it('returns a t() bound to dict, fallback, and locale', () => {
    const t = createTranslator({ hi: 'Selam' }, { hi: 'Hi', bye: 'Bye' }, 'tr');
    expect(t('hi')).toBe('Selam');
    expect(t('bye')).toBe('Bye');
    expect(t('missing')).toBe('missing');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- translate`
Expected: FAIL — `Failed to resolve import "../../../src/i18n/translate.js"`.

- [ ] **Step 3: Write the implementation**

Create `src/i18n/translate.js`:

```js
// Pure i18n string resolver — no React, no globals. Dictionary lookup,
// {token} interpolation, and plural selection via the browser-native
// Intl.PluralRules.

/** Replace {token} placeholders in `template` with values from `params`. */
export function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

/**
 * Resolve `key` against `dict`, falling back to `fallback`, then to the key
 * itself. When `params` carries a numeric `n` (or `count`), a plural variant
 * `key.<category>` is preferred, with `key.other` then the bare `key` as
 * graceful fallbacks.
 */
export function resolve(dict, fallback, locale, key, params) {
  let lookup = key;

  const count =
    params && typeof params.n === 'number' ? params.n
    : params && typeof params.count === 'number' ? params.count
    : undefined;

  if (count !== undefined) {
    const category = new Intl.PluralRules(locale).select(count);
    for (const candidate of [`${key}.${category}`, `${key}.other`]) {
      if (candidate in dict || candidate in fallback) { lookup = candidate; break; }
    }
  }

  const template =
    lookup in dict ? dict[lookup]
    : lookup in fallback ? fallback[lookup]
    : undefined;

  if (template === undefined) {
    if (import.meta.env && import.meta.env.DEV) {
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  }
  return interpolate(template, params);
}

/** Build a `t(key, params)` function bound to a locale's dictionaries. */
export function createTranslator(dict, fallback, locale) {
  return (key, params) => resolve(dict, fallback, locale, key, params);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- translate`
Expected: PASS — all `translate` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/translate.js tests/unit/i18n/translate.test.js
git commit -m "feat(i18n): pure string resolver"
```

---

## Task 2: Dictionaries — `en.js` / `tr.js` + key-parity test

**Files:**
- Create: `src/i18n/en.js`, `src/i18n/tr.js`
- Test: `tests/unit/i18n/dictionaries.test.js`

The dictionaries start with only the `time.*` keys (needed by Task 5). Every later task **adds keys to BOTH files** — the parity test enforces it.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/i18n/dictionaries.test.js`:

```js
import { describe, it, expect } from 'vitest';
import en from '../../../src/i18n/en.js';
import tr from '../../../src/i18n/tr.js';

describe('dictionaries', () => {
  it('tr.js has exactly the same keys as en.js', () => {
    const missingInTr = Object.keys(en).filter((k) => !(k in tr));
    const extraInTr = Object.keys(tr).filter((k) => !(k in en));
    expect(missingInTr, 'keys missing from tr.js').toEqual([]);
    expect(extraInTr, 'keys in tr.js not in en.js').toEqual([]);
  });

  it('every value is a non-empty string', () => {
    for (const dict of [en, tr]) {
      for (const [k, v] of Object.entries(dict)) {
        expect(typeof v, k).toBe('string');
        expect(v.length, k).toBeGreaterThan(0);
      }
    }
  });

  it('interpolation placeholders match between en and tr', () => {
    const tokens = (s) => (s.match(/\{\w+\}/g) || []).sort();
    for (const k of Object.keys(en)) {
      if (k in tr) expect(tokens(tr[k]), `placeholders for ${k}`).toEqual(tokens(en[k]));
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- dictionaries`
Expected: FAIL — cannot resolve `src/i18n/en.js`.

- [ ] **Step 3: Create the dictionaries**

Create `src/i18n/en.js`:

```js
// English UI strings — the canonical dictionary. Every key used anywhere in
// the app MUST exist here; tr.js may lag (missing keys fall back here).
// Keys are dotted namespaces: nav.* preview.* effects.* time.* etc.
export default {
  'time.justNow': 'just now',
  'time.minutesAgo': '{n}m ago',
  'time.hoursAgo': '{n}h ago',
};
```

Create `src/i18n/tr.js`:

```js
// Turkish UI strings. Keys mirror en.js exactly (enforced by
// tests/unit/i18n/dictionaries.test.js). Missing keys fall back to English.
export default {
  'time.justNow': 'az önce',
  'time.minutesAgo': '{n} dk önce',
  'time.hoursAgo': '{n} sa önce',
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- dictionaries`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/en.js src/i18n/tr.js tests/unit/i18n/dictionaries.test.js
git commit -m "feat(i18n): en/tr dictionaries + key-parity test"
```

---

## Task 3: Provider & hooks — `I18nProvider.jsx` + `index.js`

**Files:**
- Create: `src/i18n/I18nProvider.jsx`, `src/i18n/index.js`
- Test: `tests/unit/i18n/I18nProvider.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/i18n/I18nProvider.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useT, useLang } from '../../../src/i18n/index.js';
import tr from '../../../src/i18n/tr.js';

function Probe() {
  const t = useT();
  const { lang, setLang } = useLang();
  return (
    <div>
      <span data-testid="val">{t('time.justNow')}</span>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => setLang('tr')}>switch</button>
    </div>
  );
}

describe('I18nProvider', () => {
  it('reads the saved language from localStorage', () => {
    localStorage.setItem('hakoniwa:lang', 'tr');
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('lang')).toHaveTextContent('tr');
    expect(screen.getByTestId('val')).toHaveTextContent(tr['time.justNow']);
  });

  it('defaults to English when nothing is saved', () => {
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('val')).toHaveTextContent('just now');
  });

  it('switches language, re-renders consumers, and persists', async () => {
    const user = userEvent.setup();
    render(<I18nProvider><Probe /></I18nProvider>);
    await user.click(screen.getByText('switch'));
    expect(screen.getByTestId('lang')).toHaveTextContent('tr');
    expect(screen.getByTestId('val')).toHaveTextContent(tr['time.justNow']);
    expect(localStorage.getItem('hakoniwa:lang')).toBe('tr');
  });

  it('useT works without a provider, defaulting to English', () => {
    render(<Probe />);
    expect(screen.getByTestId('val')).toHaveTextContent('just now');
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
  });
});
```

Note: the "defaults to English" test assumes happy-dom's `navigator.language` does not start with `tr` (it is `en-US`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- I18nProvider`
Expected: FAIL — cannot resolve `src/i18n/index.js`.

- [ ] **Step 3: Create the provider**

Create `src/i18n/I18nProvider.jsx`:

```jsx
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
```

Create `src/i18n/index.js`:

```js
export { I18nProvider, useT, useLang, loadLang } from './I18nProvider.jsx';
export { createTranslator, resolve, interpolate } from './translate.js';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- I18nProvider`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/I18nProvider.jsx src/i18n/index.js tests/unit/i18n/I18nProvider.test.jsx
git commit -m "feat(i18n): I18nProvider + useT/useLang hooks"
```

---

## Task 4: Mount the provider in `main.jsx`

**Files:**
- Modify: `src/main.jsx`

No unit test — `main.jsx` is the composition root (coverage-excluded). Verification is the full suite + build.

- [ ] **Step 1: Wrap `<App>` in `<I18nProvider>`**

Replace the whole body of `src/main.jsx` with:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './ui/App.jsx';
import { AuthProvider } from './auth/AuthProvider.jsx';
import { I18nProvider } from './i18n/index.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Verify the suite and build**

Run: `npm test`
Expected: PASS — same count as the baseline plus the Task 1–3 tests.

Run: `npm run build`
Expected: builds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.jsx
git commit -m "feat(i18n): mount I18nProvider at the app root"
```

---

## Task 5: Localize `formatTime`

**Files:**
- Modify: `src/ui/utils/formatTime.js`
- Modify: `src/ui/pages/ProjectsPage.jsx`, `src/ui/pages/PreviewPage.jsx` (call sites)
- Test: `tests/unit/ui/utils/formatTime.test.js`

`formatTime` changes signature, so its callers must be updated in the **same commit** to keep the app working.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/ui/utils/formatTime.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { formatTime } from '../../../../src/ui/utils/formatTime.js';
import { createTranslator } from '../../../../src/i18n/translate.js';
import en from '../../../../src/i18n/en.js';
import tr from '../../../../src/i18n/tr.js';

const tEn = createTranslator(en, en, 'en');
const tTr = createTranslator(tr, en, 'tr');

describe('formatTime', () => {
  it('returns "just now" under a minute', () => {
    expect(formatTime(Date.now() - 5_000, tEn, 'en')).toBe('just now');
  });
  it('returns minutes under an hour', () => {
    expect(formatTime(Date.now() - 5 * 60_000, tEn, 'en')).toBe('5m ago');
  });
  it('returns hours under a day', () => {
    expect(formatTime(Date.now() - 3 * 3_600_000, tEn, 'en')).toBe('3h ago');
  });
  it('uses the active translator for relative strings', () => {
    expect(formatTime(Date.now() - 5_000, tTr, 'tr')).toBe(tr['time.justNow']);
  });
  it('formats older timestamps as a locale date', () => {
    const old = Date.now() - 10 * 86_400_000;
    expect(formatTime(old, tEn, 'en')).toBe(new Date(old).toLocaleDateString('en'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- formatTime`
Expected: FAIL — `formatTime` ignores the extra args / relative strings are still hardcoded English (the `tTr` test fails).

- [ ] **Step 3: Update `formatTime.js`**

Replace `src/ui/utils/formatTime.js` with:

```js
// Render a millisecond timestamp as a short relative-time string.
// `t` is the i18n translator (from useT()); `locale` drives date formatting.
export function formatTime(ts, t, locale = 'en') {
  const d = new Date(ts);
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return t('time.justNow');
  if (diff < 3600) return t('time.minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('time.hoursAgo', { n: Math.floor(diff / 3600) });
  return d.toLocaleDateString(locale);
}
```

- [ ] **Step 4: Update the two call sites**

In **`src/ui/pages/ProjectsPage.jsx`** and **`src/ui/pages/PreviewPage.jsx`**:
1. Add the import: `import { useT, useLang } from '../../i18n/index.js';`
2. Inside the component body, near the top: `const t = useT();` and `const { lang } = useLang();`
3. Change every `formatTime(X)` call to `formatTime(X, t, lang)`.

(These files get fully migrated in Task 7 — this step only fixes the `formatTime` signature.)

- [ ] **Step 5: Run tests and build**

Run: `npm test`
Expected: PASS — `formatTime` tests green, full suite green.

Run: `npm run build`
Expected: builds cleanly.

- [ ] **Step 6: Commit**

```bash
git add src/ui/utils/formatTime.js src/ui/pages/ProjectsPage.jsx src/ui/pages/PreviewPage.jsx tests/unit/ui/utils/formatTime.test.js
git commit -m "refactor(i18n): localize formatTime"
```

---

## Task 6: Language switcher + `nav.*` strings (the worked migration example)

**Files:**
- Modify: `src/ui/components/PageNav.jsx`, `src/ui/components/PageNav.css`
- Modify: `src/i18n/en.js`, `src/i18n/tr.js`
- Test: `tests/unit/ui/components/PageNav.test.jsx`

This task demonstrates the full migration pattern used by Part 2.

- [ ] **Step 1: Add the `nav.*` keys to both dictionaries**

Append to `src/i18n/en.js` (before the closing `}`):

```js
  'nav.landing': 'Landing',
  'nav.docs': 'Docs',
  'nav.projects': 'Projects',
  'nav.preview': 'Preview',
  'nav.grid': 'Grid',
  'nav.edit': 'Edit',
  'nav.pages': 'Pages',
  'nav.toggleTheme': 'Toggle theme',
  'nav.themeToLight': 'Switch to light theme',
  'nav.themeToDark': 'Switch to dark theme',
```

Append to `src/i18n/tr.js`:

```js
  'nav.landing': 'Giriş',
  'nav.docs': 'Belgeler',
  'nav.projects': 'Projeler',
  'nav.preview': 'Önizleme',
  'nav.grid': 'Izgara',
  'nav.edit': 'Düzenle',
  'nav.pages': 'Sayfalar',
  'nav.toggleTheme': 'Temayı değiştir',
  'nav.themeToLight': 'Açık temaya geç',
  'nav.themeToDark': 'Koyu temaya geç',
```

- [ ] **Step 2: Write the failing test**

Create `tests/unit/ui/components/PageNav.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PageNav from '../../../../src/ui/components/PageNav.jsx';
import { I18nProvider } from '../../../../src/i18n/index.js';
import tr from '../../../../src/i18n/tr.js';

const noop = () => {};

function renderNav(lang) {
  if (lang) localStorage.setItem('hakoniwa:lang', lang);
  return render(
    <I18nProvider>
      <PageNav page="grid" onNav={noop} theme="dark" onToggleTheme={noop} />
    </I18nProvider>,
  );
}

describe('PageNav language switcher', () => {
  it('shows EN and English tab labels by default', () => {
    renderNav('en');
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Docs' })).toBeInTheDocument();
  });

  it('shows TR and Turkish tab labels when the language is Turkish', () => {
    renderNav('tr');
    expect(screen.getByText('TR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr['nav.docs'] })).toBeInTheDocument();
  });

  it('toggles the language when the switcher is clicked', async () => {
    const user = userEvent.setup();
    renderNav('en');
    await user.click(screen.getByText('EN'));
    expect(screen.getByText('TR')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- PageNav`
Expected: FAIL — there is no `EN` element yet.

- [ ] **Step 4: Rewrite `PageNav.jsx`**

Replace `src/ui/components/PageNav.jsx` with:

```jsx
import WaveDivider from './meta/WaveDivider.jsx';
import Tooltip from './Tooltip.jsx';
import SyncPill from './SyncPill.jsx';
import UserMenu from '../../auth/UserMenu.jsx';
import { useT, useLang } from '../../i18n/index.js';

// Page ids double as the leaf of their i18n key: t('nav.' + id).
const PAGES = [
  { id: 'landing',  icon: '⌂' },
  { id: 'docs',     icon: '?' },
  { id: 'projects', icon: '⚏' },
  { id: 'preview',  icon: '◇' },
  { id: 'grid',     icon: '⊞' },
  { id: 'edit',     icon: '✎' },
];

export default function PageNav({ page, onNav, projectName, theme, onToggleTheme, syncStatus = 'offline' }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const isDark = theme === 'dark';
  const switchLabel = lang === 'en' ? 'Switch to Türkçe' : "İngilizce'ye geç";
  return (
    <>
    <header className="page-nav">
      <div className="page-nav__brand">
        <span className="page-nav__mark" aria-hidden>箱</span>
        <span className="page-nav__title">Hakoniwa</span>
        {projectName && (
          <>
            <span className="page-nav__sep" aria-hidden>·</span>
            <span className="page-nav__project">{projectName}</span>
          </>
        )}
        <SyncPill status={syncStatus} />
      </div>

      <Tooltip label={switchLabel}>
        <button
          type="button"
          className="page-nav__lang"
          onClick={() => setLang(lang === 'en' ? 'tr' : 'en')}
          aria-label={switchLabel}
        >
          {lang === 'en' ? 'EN' : 'TR'}
        </button>
      </Tooltip>

      <Tooltip label={isDark ? t('nav.themeToLight') : t('nav.themeToDark')}>
        <button
          type="button"
          className="page-nav__theme"
          onClick={onToggleTheme}
          aria-label={t('nav.toggleTheme')}
        >
          <span aria-hidden>{isDark ? '☾' : '☀'}</span>
        </button>
      </Tooltip>

      <UserMenu />

      <nav className="page-nav__tabs" aria-label={t('nav.pages')}>
        {PAGES.map((p) => {
          const label = t('nav.' + p.id);
          return (
            <button
              key={p.id}
              type="button"
              className={`page-nav__tab ${page === p.id ? 'page-nav__tab--active' : ''}`}
              onClick={() => onNav(p.id)}
              aria-label={label}
              aria-current={page === p.id ? 'page' : undefined}
              title={label}
            >
              <span className="page-nav__icon" aria-hidden>{p.icon}</span>
              <span className="page-nav__tab-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </header>
    <WaveDivider
      className="page-nav-wave"
      height={12}
      amplitude={4}
      strokeWidth={1.25}
      fillTop="var(--page-nav-bg)"
    />
    </>
  );
}
```

(If the working tree's `<WaveDivider>` line differs, keep whatever is already there — only the `nav` and switcher changes matter.)

- [ ] **Step 5: Style the switcher button**

In `src/ui/components/PageNav.css`, add this block right after the `.page-nav__theme` rules:

```css
/* Language switcher — same chrome as the theme toggle, text not icon. */
.page-nav__lang {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--bg-elev);
  border: 1px solid var(--stroke-idle);
  color: var(--text-muted);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  cursor: pointer;
  transition: color 200ms ease, border-color 200ms ease, background 200ms ease;
  font-family: inherit;
}
.page-nav__lang:hover {
  color: var(--primary-2);
  border-color: var(--primary-2);
  background: var(--primary-tint);
}
.page-nav__lang:focus-visible {
  outline: 2px solid var(--primary-2);
  outline-offset: 2px;
}
```

Then add `.page-nav__lang` to the two responsive rules that resize `.page-nav__theme`: in the `@media (max-width: 520px)` block change `.page-nav__theme { ... }` to `.page-nav__theme, .page-nav__lang { ... }`, and do the same in the `@media (pointer: coarse)` block.

- [ ] **Step 6: Run tests and build**

Run: `npm test`
Expected: PASS — `PageNav` tests green, full suite green.

Run: `npm run build`
Expected: builds cleanly.

- [ ] **Step 7: Commit**

```bash
git add src/ui/components/PageNav.jsx src/ui/components/PageNav.css src/i18n/en.js src/i18n/tr.js tests/unit/ui/components/PageNav.test.jsx
git commit -m "feat(i18n): language switcher + nav strings"
```

---

# Part 2 — String migration

## Migration Procedure

Every task in Part 2 applies this procedure to a list of files. **No new tests are written** — the safety net is that the existing suite (which queries by visible *English* text) stays green, plus the key-parity test.

For each file:

1. **Read the file.** Identify every user-facing English string literal: button text, headings, labels, placeholders, `title` / `aria-label` / `alt` attributes, Tooltip `label`s, hint/help text, and `alert`/`confirm` messages.
   **Do NOT touch:** user data (project names, cell content), CSS class names, `data-*` values, console logs, test ids, code comments, or the brand name "Hakoniwa".
2. **Pick a key** `<namespace>.<descriptiveName>` (camelCase leaf). If the *exact* same English string already has a key, reuse it (DRY — e.g. `common.cancel`, `common.delete`).
3. **Add the key to `src/i18n/en.js`** with the **character-identical** English string. This is critical — identical English values keep the existing tests green.
4. **Add the same key to `src/i18n/tr.js`** with the Turkish translation.
5. **In the component:** add `import { useT } from '<path>';` (table below), add `const t = useT();` in the component body, and replace each literal with `t('<key>')` — or `t('<key>', { n })` for interpolated values.
6. For a string with a dynamic count that pluralizes in English, create `<key>.one` + `<key>.other` and call `t('<key>', { n })`.
7. After each file, run `npm test` — everything must stay green.
8. Commit once the task's whole file list is done.

**Import path to `useT` / `useLang` by file location:**

| File location | Import path |
|---------------|-------------|
| `src/ui/App.jsx` | `../i18n/index.js` |
| `src/ui/pages/*` | `../../i18n/index.js` |
| `src/ui/components/*` | `../../i18n/index.js` |
| `src/ui/components/{inspector,edit-ui,edges,interactions,meta}/*` | `../../../i18n/index.js` |
| `src/embeds/*` | `../i18n/index.js` |

**Naming examples:**
- `<button>Open the app</button>` -> `landing.openApp` -> `t('landing.openApp')`
- `aria-label="Close"` -> `common.close` -> `aria-label={t('common.close')}`
- `` `${n} traits` `` -> `doxa.traitCount.one` = `'{n} trait'`, `.other` = `'{n} traits'` -> `t('doxa.traitCount', { n })`

---

## Task 7: Pages & app shell

**Namespaces:** `app`, `landing`, `projects`, `preview`, `common`, `errors`

**Files:**
- `src/ui/App.jsx` — "Loading…", "Skip to main content".
- `src/ui/pages/LandingPage.jsx` — hero copy, feature-card titles/bodies, CTA buttons ("Open the app", "Read the docs", "Continue to docs ↓").
- `src/ui/pages/ProjectsPage.jsx` — "Your Projects", "↑ Import JSON", "New project", "Untitled", the `confirm()` delete prompt, the `alert()` import-error message.
- `src/ui/pages/PreviewPage.jsx` — "↓ Export ▾", "JSON", "Single-file React", "Module bundle (ZIP)", "Edit grid", "Edit pieces", rename field, hints.

- [ ] **Step 1:** Apply the Migration Procedure to `src/ui/App.jsx` (namespace `app`/`common`).
- [ ] **Step 2:** Apply it to `src/ui/pages/LandingPage.jsx` (namespace `landing`).
- [ ] **Step 3:** Apply it to `src/ui/pages/ProjectsPage.jsx` (namespace `projects`). For the error path use `errors.importFailed` = `'Could not import: {detail}'` and call `alert(t('errors.importFailed', { detail: err.message }))` — `err.message` stays raw (spec §5). For the delete prompt use `projects.confirmDelete` = `'Delete "{name}"?'`.
- [ ] **Step 4:** Apply it to `src/ui/pages/PreviewPage.jsx` (namespace `preview`).
- [ ] **Step 5:** Run `npm test` — full suite green. Run `npm run build`.
- [ ] **Step 6:** Commit: `git add -A && git commit -m "i18n: localize pages & app shell"`

---

## Task 8: Grid page

**Namespace:** `grid` (reuse `common.*` where strings repeat)

**Files:** `src/ui/pages/GridEditorPage.jsx`, `src/ui/components/GridCanvas.jsx`, `src/ui/components/BackgroundsPanel.jsx`, `src/ui/components/ImportDialog.jsx`, `src/ui/components/AccordionCard.jsx` (only if it renders literal text — accordion *titles* are passed in by callers, so translate them at the call site).

Strings include accordion titles ("Selection", "Color", "Backgrounds", "Dimensions", "Import", "Tips"), "Merge", "Unmerge", paste/CSV hints, background upload/paste labels, fit-option labels.

- [ ] **Step 1–N:** Apply the Migration Procedure to each file above.
- [ ] **Final step:** `npm test` green, `npm run build` clean, commit: `git commit -am "i18n: localize Grid page"`

---

## Task 9: Edit page & edit-UI shells

**Namespaces:** `edit`, `editUi`

**Files:** `src/ui/pages/EditPage.jsx`, and every `*.jsx` in `src/ui/components/edit-ui/` (`CanvasEditUi`, `LayersEditUi`, `FlatEditUi`, `WorkflowEditUi`, `EditModePicker`, and any others present).

Strings include the four mode names + blurbs ("Canvas"/"Layers"/"Flat"/"Workflow"), the Workflow task tabs ("Connect"/"Paint"/"Animate"), hover/click FX-toggle labels, "Esc clears selection", panning/zoom hints.

- [ ] **Step 1–N:** Apply the Migration Procedure to each file.
- [ ] **Final step:** `npm test` green (`EditModePicker`, `FlatEditUi`, `WorkflowEditUi` tests must stay green — English values unchanged), `npm run build` clean, commit: `git commit -am "i18n: localize Edit page & edit-UI shells"`

---

## Task 10: Inspector

**Namespace:** `inspector`

**Files:** every `*.jsx` in `src/ui/components/inspector/` — `Inspector`, `CascadeStrip`, `SourcePill`, `PieceInspector`, `EdgeInspector`, `EdgeTierEditor`, `CellTierEditor`, `ProjectDefaultsCard`, `InspectorSubcard`, `InspectorTabs`. (`cascade-source.js` is pure logic — only migrate it if it returns display strings; `tierLabel` likely does — translate its output at the call site, leaving the pure helper returning a stable id/key.)

Strings include tier labels ("Default"/"Inner"/"Outer"/"Piece"/"Edge"), cascade pill states, "(from X)" source badges, Content/Body/Edges tab labels, "Shape & stroke", "Animations", "MIXED", "Reset to theme", per-property hints.

- [ ] **Step 1–N:** Apply the Migration Procedure to each file. Keep `CascadeStrip` and `PieceInspector` tests green (English values unchanged).
- [ ] **Final step:** `npm test` green, `npm run build` clean, commit: `git commit -am "i18n: localize Inspector"`

---

## Task 11: Effects, edges & interactions

**Namespace:** `effects`

**Files:** `src/ui/components/interactions/EffectsPicker.jsx`, `src/ui/components/edges/StyleControls.jsx`, `src/ui/components/edges/constants.js` (if it holds display strings), and the effect/trigger/scope label render sites in `CascadeStrip.jsx` / `EdgeTierEditor.jsx` / `WorkflowEditUi.jsx` if not already covered.

**Critical — do NOT edit `src/puzzle/effects-catalog.js`.** It is part of the portable puzzle module. It exposes English `label` strings for effects, triggers (`TRIGGER_LABELS`), and config fields. The UI must translate them **by id** instead of reading `.label`:

- For each id in `CELL_EFFECTS` and `EDGE_EFFECTS` (in `effects-catalog.js`), add a key `effects.<id>` to the dictionaries — English value = the catalog's current `label`. Render with `t('effects.' + effectId)` instead of `effect.label`.
- For each id in `TRIGGERS` (`hover`, `click`, `idle`, `always`), add `effects.trigger.<id>` (English = the `TRIGGER_LABELS` value). Render with `t('effects.trigger.' + triggerId)` instead of `TRIGGER_LABELS[triggerId]`.
- For each distinct config-field `label` in the catalog (`Distance`, `Amount`, `Frequency`, `Amplitude`, …), add `effects.config.<camelCaseLabel>` and translate at the slider render site.

- [ ] **Step 1:** Read `src/puzzle/effects-catalog.js`; enumerate every effect id, trigger id, and config-field label.
- [ ] **Step 2:** Add all `effects.*` keys to `en.js` (values = the catalog's current labels) and `tr.js` (Turkish).
- [ ] **Step 3:** Update the render sites listed above to translate by id.
- [ ] **Step 4:** `npm test` green (`EffectsPicker`, `StyleControls`, `CascadeStrip`, `WorkflowEditUi` tests stay green), `npm run build` clean.
- [ ] **Step 5:** Commit: `git commit -am "i18n: localize effects & edge controls"`

---

## Task 12: Auth, sync & embeds

**Namespaces:** `auth`, `sync`, `doxa`

**Files:** `src/auth/LoginScreen.jsx`, `src/auth/UserMenu.jsx`, `src/ui/components/SyncPill.jsx`, `src/embeds/DoxaEmbed.jsx`, `src/embeds/DoxaEmbedPicker.jsx`, `src/embeds/DoxaSingleChart.jsx`, `src/embeds/DoxaComparison.jsx`, `src/embeds/EmbedFrame.jsx`.

Strings include "Sign in to sync projects", "Continue with Google", "Email", "Password", "Create account", "Sign in"; sync states ("Local"/"Syncing…"/"Synced"/"Sync error"); Doxa errors ("Sign-in required", "Chart not found", "Need at least 2 charts to compare", "Need at least 2 traits"), "{n} traits", "{n} charts overlaid", "← Back to projects", "Comparison".

`auth` import path from `src/auth/*` is `../i18n/index.js`.

- [ ] **Step 1–N:** Apply the Migration Procedure to each file. For `DoxaEmbedPicker.jsx`, also give its local `formatTime` a `locale` parameter and pass `useLang().lang` (mirrors Task 5). For "{n} traits" / "{n} charts overlaid" use `.one`/`.other` plural keys.
- [ ] **Final step:** `npm test` green, `npm run build` clean, commit: `git commit -am "i18n: localize auth, sync & embeds"`

---

## Task 13: Turkish review & final verification

**Files:** `src/i18n/tr.js` (review), whole app (verification).

- [ ] **Step 1:** Re-read `src/i18n/tr.js` end to end. Fix any awkward or wrong Turkish. Confirm every `{n}` placeholder is present and positioned naturally. **This file should also be reviewed by the user (a native Turkish speaker) — flag it for them.**
- [ ] **Step 2:** Run `npm test` — full suite green, including `dictionaries.test.js` (key + placeholder parity).
- [ ] **Step 3:** Run `npm run build` — clean.
- [ ] **Step 4:** Run `npm run dev`. In the browser: toggle the language switcher (`EN` ⇄ `TR`). Walk every page (Landing, Projects, Preview, Grid, Edit) in **both** languages. Confirm no English leaks in Turkish mode (except the Docs tutorial, which is intentionally English), no layout breaks from longer Turkish strings, and `<html lang>` updates (DevTools → Elements).
- [ ] **Step 5:** Reload the page — the chosen language must persist (localStorage).
- [ ] **Step 6:** Commit any Turkish fixes: `git commit -am "i18n: Turkish review pass"`

---

## Self-review (completed by the plan author)

- **Spec coverage:** §3.1 module → T1–T3; §3.2 dictionaries → T2 + every migration task; §3.3 resolver → T1; §3.4 provider/hooks → T3; §3.5 mounting → T4; §3.6 switcher → T6; §4 formatTime/locale dates → T5 + T12; §5 boundaries (grid errors, embeds, puzzle untouched, export README untouched) → T7 (errors), T11 (puzzle rule), T12 (embeds); §6 migration → T6–T12; §8 tests → T1/T2/T3/T5/T6. All covered.
- **Placeholders:** none — foundation tasks carry full code; migration tasks carry a complete shared procedure.
- **Type consistency:** `resolve(dict, fallback, locale, key, params)`, `createTranslator(dict, fallback, locale)`, `useT()→t`, `useLang()→{lang,setLang}`, `formatTime(ts, t, locale)` — consistent across all tasks.
