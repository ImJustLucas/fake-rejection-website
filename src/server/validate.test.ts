// src/server/validate.test.ts
import { describe, it, expect } from 'vitest';
import { validateCreateInput } from './validate';

describe('validateCreateInput', () => {
  it('accepts a valid input and trims', () => {
    const r = validateCreateInput({ name: '  Lou ', phrase: '{prenom} ?', mode: 'flee' });
    expect(r).toEqual({ ok: true, value: { name: 'Lou', phrase: '{prenom} ?', mode: 'flee' } });
  });
  it('defaults mode to random when missing', () => {
    const r = validateCreateInput({ name: 'Lou', phrase: '' });
    expect(r.ok && r.value.mode).toBe('random');
  });
  it('allows an empty phrase', () => {
    const r = validateCreateInput({ name: 'Lou', phrase: '' });
    expect(r.ok).toBe(true);
  });
  it('rejects a missing name', () => {
    expect(validateCreateInput({ name: '  ', phrase: 'x' })).toEqual({ ok: false, error: 'name' });
  });
  it('rejects an over-long name', () => {
    expect(validateCreateInput({ name: 'a'.repeat(41), phrase: '' }).ok).toBe(false);
  });
  it('rejects an over-long phrase', () => {
    expect(validateCreateInput({ name: 'Lou', phrase: 'a'.repeat(201) })).toEqual({ ok: false, error: 'phrase' });
  });
  it('rejects an unknown mode', () => {
    expect(validateCreateInput({ name: 'Lou', phrase: '', mode: 'nope' })).toEqual({ ok: false, error: 'mode' });
  });
  it('rejects a non-object body', () => {
    expect(validateCreateInput(null).ok).toBe(false);
  });
});
