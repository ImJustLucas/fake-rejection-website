// src/behaviors/flee.tsx
import { useRef, useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { randomPosition } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function Flee({ onYes }: BehaviorProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const jump = () => {
    const el = ref.current;
    // Measure the real button so it can never land partly off-screen.
    const size = el ? Math.max(el.offsetWidth, el.offsetHeight) : 90;
    setPos(randomPosition(window.innerWidth, window.innerHeight, size));
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
    <div className="flex items-center justify-between gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        ref={ref}
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
