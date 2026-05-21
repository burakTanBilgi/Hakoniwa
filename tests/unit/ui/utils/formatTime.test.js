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
