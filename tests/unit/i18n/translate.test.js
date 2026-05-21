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
