// src/behaviors/gravity.tsx
import { useRef, useState, type CSSProperties } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import type { BehaviorProps } from './behavior-types';

export default function Gravity({ onYes }: BehaviorProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const fallen = useRef(false);
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);

  const drop = () => {
    if (fallen.current) return;
    const el = ref.current;
    if (!el) return;
    fallen.current = true;
    const r = el.getBoundingClientRect();
    // phase 1: pin at current position (fixed), no transition yet
    setStyle({ position: 'fixed', left: r.left, top: r.top, margin: 0, zIndex: 50 });
    // phase 2: next frame, animate top down to the bottom with a bounce
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStyle({
          position: 'fixed',
          left: r.left,
          top: window.innerHeight - 70,
          margin: 0,
          transition: 'top .8s cubic-bezier(.5, 1.8, .6, 1)',
          zIndex: 50,
        });
      });
    });
  };

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        ref={ref}
        style={style}
        onMouseEnter={drop}
        onTouchStart={(e) => {
          e.preventDefault();
          drop();
        }}
      />
    </div>
  );
}
