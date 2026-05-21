# Multi-language Support — Design Spec

**Date:** 2026-05-21
**Status:** Approved design — pending implementation plan
**Approach:** Hand-rolled minimal i18n (no new dependencies)

## 1. Goal & scope

Add multi-language support to Hakoniwa for **English + Turkish** (both
left-to-right — no RTL/bidirectional work).

The first release translates **all UI chrome** — buttons, menus, labels,
tooltips, placeholders, `aria-label`s, hints, and error messages
(~250 distinct strings). The architecture supports adding more content
and more languages later with no rework.

**Out of scope for this release (stays English):**

- The interactive Docs tutorial prose (`src/ui/components/docs/*Section.jsx`,
  ~2,000 words). Its strings simply aren't extracted yet — addable later
  through the same mechanism.
- Export README templates in `src/grid/export.js` — a developer artifact
  shipped *inside* downloaded bundles, where English is the lingua franca.
- The `src/puzzle/` module — a portable drop-in with zero user-facing
  text. Not touched.
- User data — project names, cell content, image alt text. Never
  translated; the data/chrome boundary is already clean.

## 2. Constraints

- **No new runtime dependencies.** CLAUDE.md states the ZIP encoder, CSV
  parser, and theme system are all hand-rolled to keep deps slim. 250
  static strings, no RTL, and a single real plural case do not justify a
  library.
- **No TypeScript** — plain JS + JSDoc.
- **Mirror the theme system** — the established precedent for a
  cross-cutting, persisted, hand-rolled feature (`App.jsx` owns state →
  `localStorage` → attribute on `<html>`).

## 3. Architecture

### 3.1 Module — `src/i18n/`

Self-contained, in the style of `src/puzzle/`:

```
src/i18n/
  en.js              — English dictionary (canonical; drives fallback)
  tr.js              — Turkish dictionary
  translate.js       — pure: key resolution, interpolation, plural select
  I18nProvider.jsx   — React context + provider + useT()/useLang() hooks
  index.js           — public barrel
```

### 3.2 Dictionaries — `en.js` / `tr.js`

Flat objects. Keys are dotted namespaces grouped by area:

```js
// en.js
export default {
  'nav.docs': 'Docs',
  'preview.exportJson': 'JSON',
  'effects.puzzle': 'Puzzle',
  'time.justNow': 'just now',
  'time.minutesAgo': '{n}m ago',
  'doxa.traitCount.one': '{n} trait',
  'doxa.traitCount.other': '{n} traits',
  // ...
};
```

Namespaces: `nav`, `landing`, `projects`, `preview`, `grid`, `edit`,
`inspector`, `effects`, `auth`, `sync`, `errors`, `common`, `time`,
`doxa`.

English is **canonical**: every key used anywhere must exist in `en.js`.
`tr.js` may lag — missing keys fall back to English.

### 3.3 Pure resolver — `translate.js`

A pure function `resolve(dict, fallback, locale, key, params)`:

- **Plural** — when `params.n` (or `params.count`) is a number and
  `${key}.one` / `${key}.other` variants exist, the variant is chosen via
  `new Intl.PluralRules(locale).select(n)`. Otherwise the bare `key` is
  used. (English: one/other. Turkish: other only — handled natively.)
- **Interpolation** — `{token}` is replaced with `params.token`.
- **Fallback chain** — `dict[key]` → `fallback[key]` → `key` itself, with
  a `console.warn` in dev (`import.meta.env.DEV`).

`Intl.PluralRules` and `Intl.DateTimeFormat`/`toLocaleDateString` are
browser-native — standards-based correctness with zero dependencies.

### 3.4 Provider & hooks — `I18nProvider.jsx`

- Owns `lang` state. `loadLang()`: `localStorage['hakoniwa:lang']` →
  else `navigator.language` starts with `tr` → `'tr'` → else `'en'`.
- Effect: sets `document.documentElement.lang = lang` and persists to
  `localStorage`. Directly mirrors `App.jsx`'s theme effect.
- Context value: `{ lang, setLang, t }`, where `t(key, params)` closes
  over the active dictionary, the English fallback, and `lang`.
- `useT()` → returns `t`. **Works without a provider:** if no context is
  mounted it returns a `t` bound to the English dictionary. Components
  rendered in isolation (existing unit tests) therefore need no wrapping.
- `useLang()` → returns `{ lang, setLang }`.
- `t` is memoized per `lang` so consumers re-render only on a language
  change.

### 3.5 Mounting

`src/main.jsx` wraps `<App>`:

```jsx
<I18nProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</I18nProvider>
```

It sits above `LoginScreen` and the pre-auth bootstrap placeholder, so
every screen is covered.

### 3.6 Language switcher

In `PageNav`, beside the theme toggle — a compact toggle button:

- Shows the current language code: `EN` / `TR`.
- Tooltip + `aria-label`: "Switch to Türkçe" (when EN) /
  "İngilizce'ye geç" (when TR).
- Calls `useLang().setLang` directly — no new props threaded through
  `App`.
- Styled like `.page-nav__theme` (32×32, same hover/focus treatment).

A dropdown is deferred until a 3rd language is added (YAGNI).

## 4. Locale-sensitive details

- `formatTime(ts)` → `formatTime(ts, t, locale)`. Returns
  `t('time.justNow')`, `t('time.minutesAgo', {n})`,
  `t('time.hoursAgo', {n})`, or `new Date(ts).toLocaleDateString(locale)`.
  Both callers (`ProjectsPage`, `PreviewPage`) already obtain `useT()` +
  `useLang()`.
- `DoxaEmbedPicker`'s local `formatTime` likewise takes `locale`.
- All date rendering uses `toLocaleDateString(locale)`.

## 5. Boundaries for non-UI layers

- `src/grid/` thrown errors (`file-io.js` validation messages) are
  translated **at the call site**: the catching component renders
  `t('errors.<code>', { detail })`; an unrecognized message falls
  through raw.
- `src/embeds/` UI strings (DoxaEmbed error frames, DoxaEmbedPicker
  labels) are in scope and translated. `src/embeds/` may import from
  `src/i18n/` — it is not the portable puzzle module.
- `src/grid/export.js` README templates stay English (see §1).

## 6. String migration

~250 strings — mechanical, batched by namespace area. Per batch: extract
literals into `en.js`, replace with the `t()` call, mirror keys into
`tr.js` with Turkish copy. Batch order: nav → landing → projects →
preview → grid → edit/inspector/effects → auth/sync →
errors/common/time/doxa.

## 7. Bundle

Both dictionaries are bundled (~3–5 KB gzip each) — instant switching,
no async flash. Lazy-loading `tr.js` is a future option if a later Docs
translation inflates the dictionaries.

## 8. Testing

- **New** — dictionary key-parity test: `en.js` and `tr.js` expose
  identical key sets (none missing, none extra). This is the safety net
  that replaces string-extraction tooling.
- **New** — `translate.js` unit tests: interpolation, the fallback chain
  (`dict` → `fallback` → `key`), and plural selection for English
  (one/other) and Turkish (other only).
- **Existing 161** — unaffected: the test-env default locale is English
  (happy-dom `navigator.language` is `en-US`, no `localStorage`), and
  `useT()` works provider-less.

## 9. File-level change summary

**New:**
`src/i18n/{en.js, tr.js, translate.js, I18nProvider.jsx, index.js}`,
`src/i18n/translate.test.js`, `src/i18n/dictionaries.test.js`.

**Modified:**
`src/main.jsx` (wrap in provider), `src/ui/components/PageNav.jsx` +
`PageNav.css` (switcher), `src/ui/utils/formatTime.js` (signature), and
string extraction across `src/ui/` (pages + components, including
`App.jsx`'s "Loading…" / skip-link copy) plus `src/embeds/` and the
error call-sites in `src/ui/pages/ProjectsPage.jsx`.

**Untouched:**
`src/puzzle/`, `src/grid/export.js`, the Docs tutorial sections.
