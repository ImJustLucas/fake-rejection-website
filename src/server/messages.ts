// src/server/messages.ts
import { sanitizeName, sanitizeText } from '../lib/sanitize';

export type TrackEvent = 'visit' | 'return' | 'sneaky' | 'accepted' | 'note';

export function buildMessage(event: TrackEvent, name: string, note = ''): string {
  const n = sanitizeName(name);
  switch (event) {
    case 'visit':
      return `👀 ${n} vient d'arriver sur le site.`;
    case 'return':
      return `🔁 ${n} est revenue.`;
    case 'sneaky':
      return `🕵️ ${n} a tenté d'enlever son prénom de l'URL, elle est maligne.`;
    case 'accepted':
      return `✅ ${n} a accepté le date !`;
    case 'note':
      return `💌 ${n} a laissé un mot : "${sanitizeText(note, 500)}"`;
  }
}
