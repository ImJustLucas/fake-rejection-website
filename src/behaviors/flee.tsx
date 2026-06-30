// src/behaviors/flee.tsx
import { useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { randomPosition } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function Flee({ onYes }: BehaviorProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const jump = () => {
    setPos(randomPosition(window.innerWidth, window.innerHeight, 90));
  };

  const noStyle = pos
    ? {
        position: 'fixed' as const,
        left: pos.x,
        top: pos.y,
        transition: 'left .15s ease, top .15s ease',
        zIndex: 50,
      }
    : undefined;

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        style={noStyle}
        onMouseEnter={jump}
        onTouchStart={(e) => {
          e.preventDefault(); // block the tap so it can't be clicked
          jump();
        }}
      />
    </div>
  );
}
