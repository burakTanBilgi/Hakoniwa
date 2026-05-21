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
