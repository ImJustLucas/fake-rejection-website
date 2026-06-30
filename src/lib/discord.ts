// src/lib/discord.ts
import { sanitizeName, sanitizeText } from './sanitize';

async function send(content: string): Promise<void> {
  const url = import.meta.env.VITE_DISCORD_WEBHOOK_URL ?? '';
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    });
  } catch {
    /* fire-and-forget: never interrupt the experience */
  }
}

export const notifyVisit = (name: string): Promise<void> =>
  send(`👀 ${sanitizeName(name)} vient d'arriver sur le site.`);

export const notifyReturn = (name: string): Promise<void> =>
  send(`🔁 ${sanitizeName(name)} est revenue.`);

export const notifySneaky = (name: string): Promise<void> =>
  send(`🕵️ ${sanitizeName(name)} a tenté d'enlever son prénom de l'URL, elle est maligne.`);

export const notifyAccepted = (name: string): Promise<void> =>
  send(`✅ ${sanitizeName(name)} a accepté le date !`);

export const notifyNote = (name: string, note: string): Promise<void> =>
  send(`💌 ${sanitizeName(name)} a laissé un mot : "${sanitizeText(note, 500)}"`);
