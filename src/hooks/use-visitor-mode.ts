import { useState } from 'react';
import { resolveMode, randomBehaviorId } from '../lib/mode';
import type { BehaviorId } from '../behaviors/ids';

export interface VisitorMode {
  mode: BehaviorId;
  isTouch: boolean;
}

export function useVisitorMode(): VisitorMode {
  const [state] = useState<VisitorMode>(() => {
    const raw = new URLSearchParams(window.location.search).get('mode');
    const mode = resolveMode(raw, () => randomBehaviorId());
    const isTouch =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
        : false;
    return { mode, isTouch };
  });
  return state;
}
