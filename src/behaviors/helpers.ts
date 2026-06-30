// src/behaviors/helpers.ts

export function growScales(noCount: number): { yes: number; no: number } {
  return {
    yes: 1 + noCount * 0.4,
    no: Math.max(0.15, 1 - noCount * 0.18),
  };
}

export const GUILT_TEXTS = ['Non', "T'es sûre ?", 'Réfléchis bien…', 'Tu me brises le cœur 💔', 'Aïe.'];

export function nextGuiltIndex(i: number, len: number = GUILT_TEXTS.length): number {
  return Math.min(i + 1, len - 1);
}

export function randomPosition(
  vw: number,
  vh: number,
  size: number,
  rand: () => number = Math.random,
): { x: number; y: number } {
  const margin = 8;
  const maxX = Math.max(margin, vw - size - margin);
  const maxY = Math.max(margin, vh - size - margin);
  return {
    x: margin + rand() * (maxX - margin),
    y: margin + rand() * (maxY - margin),
  };
}

export function repelOffset(
  btn: { x: number; y: number },
  ptr: { x: number; y: number },
  radius = 120,
  strength = 1.4,
): { dx: number; dy: number } {
  const dx = btn.x - ptr.x;
  const dy = btn.y - ptr.y;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist > radius) return { dx: 0, dy: 0 };
  const push = (radius - dist) * strength;
  return { dx: (dx / dist) * push, dy: (dy / dist) * push };
}

export function computeSadness(distToNo: number, distToYes: number, maxDist = 300): number {
  const near = Math.max(0, 1 - distToNo / maxDist);
  const relief = Math.max(0, 1 - distToYes / maxDist);
  return Math.max(0, Math.min(1, near - relief * 0.7));
}
