import { describe, it, expect } from 'vitest';
import { decideVisitEvent, RETURN_WINDOW_MS } from './visit-tracking';

describe('decideVisitEvent', () => {
  it('returns a "visit" event on first ever load', () => {
    const d = decideVisitEvent({ visited: false, returns: [], now: 1000 });
    expect(d.event).toBe('visit');
    expect(d.nextVisited).toBe(true);
    expect(d.nextReturns).toEqual([]);
  });

  it('returns a "return" event and records the timestamp when already visited', () => {
    const d = decideVisitEvent({ visited: true, returns: [], now: 5000 });
    expect(d.event).toBe('return');
    expect(d.nextReturns).toEqual([5000]);
  });

  it('drops timestamps older than the 30-minute window', () => {
    const now = 10_000_000;
    const old = now - RETURN_WINDOW_MS - 1;
    const d = decideVisitEvent({ visited: true, returns: [old], now });
    expect(d.nextReturns).toEqual([now]); // old pruned, new added
  });

  it('suppresses the event after 10 returns inside the window', () => {
    const now = 1_000_000;
    const returns = Array.from({ length: 10 }, (_, i) => now - i * 1000); // 10 recent
    const d = decideVisitEvent({ visited: true, returns, now });
    expect(d.event).toBeNull();
    expect(d.nextReturns).toHaveLength(10); // unchanged count, no new push
  });
});
