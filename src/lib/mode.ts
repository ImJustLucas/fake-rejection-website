// src/lib/mode.ts
import { BEHAVIOR_IDS, type BehaviorId } from '../behaviors/ids';

export function resolveMode(rawMode: string | null, pick: () => BehaviorId): BehaviorId {
  if (rawMode && (BEHAVIOR_IDS as readonly string[]).includes(rawMode)) {
    return rawMode as BehaviorId;
  }
  return pick();
}

export function randomBehaviorId(rand: number = Math.random()): BehaviorId {
  const index = Math.min(BEHAVIOR_IDS.length - 1, Math.floor(rand * BEHAVIOR_IDS.length));
  return BEHAVIOR_IDS[index];
}
