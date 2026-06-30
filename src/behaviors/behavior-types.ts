// src/behaviors/behavior-types.ts
import type { FC } from 'react';
import type { BehaviorId } from './ids';

export interface BehaviorProps {
  onYes: () => void;
  isTouch: boolean;
}

export type BehaviorComponent = FC<BehaviorProps>;

export interface BehaviorEntry {
  id: BehaviorId;
  label: string;
  Component: BehaviorComponent;
}
