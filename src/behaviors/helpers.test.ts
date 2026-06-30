import { describe, it, expect } from 'vitest';
import {
  growScales,
  GUILT_TEXTS,
  nextGuiltIndex,
  randomPosition,
  repelOffset,
  computeSadness,
} from './helpers';

describe('growScales', () => {
  it('is neutral at zero refusals', () => {
    expect(growScales(0)).toEqual({ yes: 1, no: 1 });
  });
  it('grows yes and shrinks no with each refusal', () => {
    const s = growScales(3);
    expect(s.yes).toBeGreaterThan(1);
    expect(s.no).toBeLessThan(1);
  });
  it('never shrinks no below the floor', () => {
    expect(growScales(100).no).toBeGreaterThanOrEqual(0.15);
  });
});

describe('nextGuiltIndex', () => {
  it('advances toward the last index and clamps there', () => {
    expect(nextGuiltIndex(0)).toBe(1);
    expect(nextGuiltIndex(GUILT_TEXTS.length - 1)).toBe(GUILT_TEXTS.length - 1);
  });
});

describe('randomPosition', () => {
  it('stays within the viewport minus the button size', () => {
    const p = randomPosition(1000, 800, 80, () => 0.5);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(1000 - 80);
    expect(p.y).toBeLessThanOrEqual(800 - 80);
  });
});

describe('repelOffset', () => {
  it('returns no push when the pointer is far', () => {
    expect(repelOffset({ x: 0, y: 0 }, { x: 500, y: 500 })).toEqual({ dx: 0, dy: 0 });
  });
  it('pushes away from a close pointer', () => {
    const o = repelOffset({ x: 100, y: 100 }, { x: 90, y: 100 });
    expect(o.dx).toBeGreaterThan(0); // button is to the right of pointer → pushed further right
  });
});

describe('computeSadness', () => {
  it('is high near the No button', () => {
    expect(computeSadness(0, 1000)).toBeGreaterThan(0.8);
  });
  it('is reduced near the Yes button', () => {
    expect(computeSadness(0, 0)).toBeLessThan(computeSadness(0, 1000));
  });
  it('is clamped between 0 and 1', () => {
    const v = computeSadness(0, 1000);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});
