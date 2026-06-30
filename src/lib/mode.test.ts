import { describe, it, expect } from 'vitest';
import { resolveMode, randomBehaviorId } from './mode';

describe('resolveMode', () => {
  it('uses a valid ?mode= value', () => {
    expect(resolveMode('flee', () => 'grow')).toBe('flee');
  });
  it('ignores an unknown ?mode= and uses the picker', () => {
    expect(resolveMode('banana', () => 'sad')).toBe('sad');
  });
  it('uses the picker when ?mode= is absent', () => {
    expect(resolveMode(null, () => 'repel')).toBe('repel');
  });
});

describe('randomBehaviorId', () => {
  it('maps rand=0 to the first id', () => {
    expect(randomBehaviorId(0)).toBe('grow');
  });
  it('maps rand close to 1 to the last id', () => {
    expect(randomBehaviorId(0.999)).toBe('sad');
  });
});
