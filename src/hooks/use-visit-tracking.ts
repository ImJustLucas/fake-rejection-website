import { useEffect, useRef } from 'react';
import { decideVisitEvent, VISITED_KEY, RETURNS_KEY } from '../lib/visit-tracking';
import { notifyVisit, notifyReturn, notifySneaky } from '../lib/discord';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function parseReturns(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

/** Fires the arrival webhooks exactly once on mount. */
export function useVisitTracking(name: string, sneaky: boolean, id?: string): void {
  const fired = useRef(false);
  const args = useRef({ name, sneaky, id });
  useEffect(() => {
    if (fired.current) return; // refs persist across StrictMode's simulated remount → fires once
    fired.current = true;

    const { name, sneaky, id } = args.current;
    const visited = safeGet(VISITED_KEY) === '1';
    const returns = parseReturns(safeGet(RETURNS_KEY));
    const decision = decideVisitEvent({ visited, returns, now: Date.now() });

    safeSet(VISITED_KEY, '1');
    safeSet(RETURNS_KEY, JSON.stringify(decision.nextReturns));

    if (decision.event === 'visit') notifyVisit(name, id);
    else if (decision.event === 'return') notifyReturn(name, id);

    if (sneaky) notifySneaky(name, id);
  }, []);
}
