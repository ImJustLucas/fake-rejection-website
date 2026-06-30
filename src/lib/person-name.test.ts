import { describe, it, expect } from 'vitest';
import { resolvePersonName } from './person-name';

describe('resolvePersonName', () => {
  it('uses the URL name and is not sneaky', () => {
    expect(resolvePersonName('Camille', null)).toEqual({ name: 'Camille', source: 'url', sneaky: false });
  });
  it('prefers URL over storage', () => {
    expect(resolvePersonName('Lea', 'Old')).toEqual({ name: 'Lea', source: 'url', sneaky: false });
  });
  it('falls back to storage and flags sneaky when URL is empty', () => {
    expect(resolvePersonName(null, 'Camille')).toEqual({ name: 'Camille', source: 'storage', sneaky: true });
  });
  it('treats a blank URL param as absent', () => {
    expect(resolvePersonName('   ', 'Camille')).toEqual({ name: 'Camille', source: 'storage', sneaky: true });
  });
  it('returns the "Toi" fallback when nothing is available', () => {
    expect(resolvePersonName(null, null)).toEqual({ name: 'Toi', source: 'fallback', sneaky: false });
  });
});
