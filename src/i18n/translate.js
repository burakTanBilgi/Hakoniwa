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
