// src/server/ids.test.ts
import { describe, it, expect } from 'vitest';
import { generateId, isValidId } from './ids';

describe('ids', () => {
  it('generates an 8-char base62 id', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9A-Za-z]{8}$/);
  });
  it('generates distinct ids', () => {
    expect(generateId()).not.toBe(generateId());
  });
  it('validates id format', () => {
    expect(isValidId('abcDEF12')).toBe(true);
    expect(isValidId('short')).toBe(false);
    expect(isValidId('has space')).toBe(false);
    expect(isValidId('toolongtoolong')).toBe(false);
  });
});
