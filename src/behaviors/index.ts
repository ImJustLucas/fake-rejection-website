// src/behaviors/index.ts
import type { BehaviorEntry } from './behavior-types';
import { BEHAVIOR_IDS, type BehaviorId } from './ids';
import GrowShrink from './grow-shrink';
import Flee from './flee';
import Repel from './repel';
import Gravity from './gravity';
import Guilt from './guilt';
import Sad from './sad';

export const BEHAVIORS: Record<BehaviorId, BehaviorEntry> = {
  grow: { id: 'grow', label: 'Grow/Shrink', Component: GrowShrink },
  flee: { id: 'flee', label: 'Fuyard', Component: Flee },
  repel: { id: 'repel', label: 'Aimant inversé', Component: Repel },
  gravity: { id: 'gravity', label: 'Gravité', Component: Gravity },
  guilt: { id: 'guilt', label: 'Culpabilisateur', Component: Guilt },
  sad: { id: 'sad', label: 'Ambiance triste', Component: Sad },
};

export { BEHAVIOR_IDS };
