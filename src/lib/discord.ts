// src/lib/discord.ts
type TrackEvent = 'visit' | 'return' | 'sneaky' | 'accepted' | 'note';

async function track(event: TrackEvent, name: string, opts: { id?: string; note?: string } = {}): Promise<void> {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, name, id: opts.id, note: opts.note }),
    });
  } catch {
    /* fire-and-forget: never interrupt the experience */
  }
}

export const notifyVisit = (name: string, id?: string): Promise<void> => track('visit', name, { id });
export const notifyReturn = (name: string, id?: string): Promise<void> => track('return', name, { id });
export const notifySneaky = (name: string, id?: string): Promise<void> => track('sneaky', name, { id });
export const notifyAccepted = (name: string, id?: string): Promise<void> => track('accepted', name, { id });
export const notifyNote = (name: string, note: string, id?: string): Promise<void> => track('note', name, { id, note });
