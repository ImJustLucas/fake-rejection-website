// src/behaviors/ids.ts
export const BEHAVIOR_IDS = ['grow', 'flee', 'repel', 'gravity', 'guilt', 'sad'] as const;
export type BehaviorId = (typeof BEHAVIOR_IDS)[number];
