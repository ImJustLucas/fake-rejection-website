import { describe, it, expect } from 'vitest';
import { BEHAVIORS } from './index';
import { BEHAVIOR_IDS } from './ids';

describe('behavior registry', () => {
  it('registers exactly one entry per behavior id', () => {
    for (const id of BEHAVIOR_IDS) {
      expect(BEHAVIORS[id]).toBeDefined();
      expect(BEHAVIORS[id].id).toBe(id);
      expect(typeof BEHAVIORS[id].Component).toBe('function');
    }
    expect(Object.keys(BEHAVIORS)).toHaveLength(BEHAVIOR_IDS.length);
  });
});
