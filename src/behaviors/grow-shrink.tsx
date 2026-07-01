// src/behaviors/grow-shrink.tsx
import { useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { growScales } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function GrowShrink({ onYes }: BehaviorProps) {
  const [count, setCount] = useState(0);
  const { yes, no } = growScales(count);
  return (
    <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
      <YesButton onClick={onYes} style={{ transform: `scale(${yes})`, transformOrigin: 'center' }} />
      <NoButton
        style={{ transform: `scale(${no})` }}
        onClick={() => setCount((c) => c + 1)}
        onTouchStart={(e) => {
          e.preventDefault();
          setCount((c) => c + 1);
        }}
      />
    </div>
  );
}
