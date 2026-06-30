import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeName } from './sanitize';

describe('sanitizeText', () => {
  it('strips backticks and control chars', () => {
    expect(sanitizeText('a`b\nc')).toBe('a b c');
  });
  it('neutralizes @ to prevent mentions', () => {
    expect(sanitizeText('@everyone')).toBe('@​everyone');
  });
  it('truncates to max length', () => {
    expect(sanitizeText('abcdef', 3)).toBe('abc');
  });
  it('trims surrounding whitespace', () => {
    expect(sanitizeText('  hi  ')).toBe('hi');
  });
});

describe('sanitizeName', () => {
  it('cleans and limits a name', () => {
    expect(sanitizeName('  Camille ')).toBe('Camille');
  });
  it('falls back to "Toi" when empty after cleaning', () => {
    expect(sanitizeName('```')).toBe('Toi');
  });
});
