// src/lib/confetti.ts
import confetti from 'canvas-confetti';

/** Pink confetti burst — used on Oui and on note submit. */
export function firePinkConfetti(): void {
  try {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff2d78', '#ff7eb0', '#ffd9e8', '#ffffff'],
    });
  } catch {
    /* no-op if canvas is unavailable */
  }
}
