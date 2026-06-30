// src/behaviors/gravity.tsx
import { useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import type { BehaviorProps } from './behavior-types';

export default function Gravity({ onYes }: BehaviorProps) {
  const [fallen, setFallen] = useState(false);
  const drop = () => setFallen(true);

  const noStyle = fallen
    ? {
        position: 'fixed' as const,
        left: '50%',
        top: window.innerHeight - 70,
        transform: 'translateX(-50%)',
        transition: 'top .8s cubic-bezier(.5, 1.8, .6, 1)', // overshoot ≈ bounce
        zIndex: 50,
      }
    : undefined;

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        style={noStyle}
        onMouseEnter={drop}
        onTouchStart={(e) => {
          e.preventDefault();
          drop();
        }}
      />
    </div>
  );
}
