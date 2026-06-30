// src/behaviors/repel.tsx
import { useEffect, useRef, useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { repelOffset } from './helpers';
import type { BehaviorProps } from './behavior-types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function Repel({ onYes }: BehaviorProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });

  useEffect(() => {
    const handle = (x: number, y: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const { dx, dy } = repelOffset(center, { x, y });
      if (!dx && !dy) return;
      setOffset((o) => {
        // untransformed center = current (transformed) center - current offset
        const baseX = center.x - o.dx;
        const baseY = center.y - o.dy;
        const margin = 8;
        const halfW = r.width / 2;
        const halfH = r.height / 2;
        return {
          dx: clamp(o.dx + dx, margin + halfW - baseX, window.innerWidth - margin - halfW - baseX),
          dy: clamp(o.dy + dy, margin + halfH - baseY, window.innerHeight - margin - halfH - baseY),
        };
      });
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
    <div className="flex items-center justify-center gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        ref={ref}
        style={{ transform: `translate(${offset.dx}px, ${offset.dy}px)`, transition: 'transform .12s ease-out' }}
      />
    </div>
  );
}
