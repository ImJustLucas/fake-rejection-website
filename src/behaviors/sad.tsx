// src/behaviors/sad.tsx
import { useEffect, useRef, useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { computeSadness } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function Sad({ onYes }: BehaviorProps) {
  const noRef = useRef<HTMLButtonElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const [sadness, setSadness] = useState(0);

  useEffect(() => {
    const distTo = (el: HTMLElement | null, x: number, y: number) => {
      if (!el) return Infinity;
      const r = el.getBoundingClientRect();
      return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    };
    const handle = (x: number, y: number) => {
      setSadness(computeSadness(distTo(noRef.current, x, y), distTo(yesRef.current, x, y)));
    };
    const onMouse = (e: MouseEvent) => handle(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) handle(t.clientX, t.clientY);
    };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden={true}
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center text-6xl"
        style={{ background: `rgba(10, 5, 15, ${sadness * 0.6})`, transition: 'background .2s ease' }}
      >
        <span style={{ opacity: sadness }}>😢💧😭</span>
      </div>
      <div className="flex items-center justify-center gap-3 mt-6 relative z-10">
        <YesButton ref={yesRef} onClick={onYes} />
        <NoButton ref={noRef} />
      </div>
    </>
  );
}
