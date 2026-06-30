// src/lib/visit-tracking.ts

export const VISITED_KEY = 'date.visited';
export const RETURNS_KEY = 'date.returns';
export const RETURN_WINDOW_MS = 30 * 60 * 1000;
export const RETURN_MAX = 10;

export type VisitEvent = 'visit' | 'return' | null;

export interface VisitDecision {
  event: VisitEvent;
  nextVisited: boolean;
  nextReturns: number[];
}

export function decideVisitEvent(args: { visited: boolean; returns: number[]; now: number }): VisitDecision {
  const { visited, returns, now } = args;

  if (!visited) {
    return { event: 'visit', nextVisited: true, nextReturns: returns };
  }

  const recent = returns.filter((t) => now - t < RETURN_WINDOW_MS);
  if (recent.length < RETURN_MAX) {
    return { event: 'return', nextVisited: true, nextReturns: [...recent, now] };
  }
  return { event: null, nextVisited: true, nextReturns: recent };
}
