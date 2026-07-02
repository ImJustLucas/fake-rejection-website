// src/server/track.ts
import { buildMessage, type TrackEvent } from './messages';
import { sendDiscord } from './discord-server';
import { incrStat } from './entries';

const EVENTS: readonly TrackEvent[] = ['visit', 'return', 'sneaky', 'accepted', 'note'];

export function isTrackEvent(x: unknown): x is TrackEvent {
  return typeof x === 'string' && (EVENTS as readonly string[]).includes(x);
}

export async function handleTrack(input: {
  event: unknown;
  name: unknown;
  id?: unknown;
  note?: unknown;
}): Promise<{ ok: boolean }> {
  if (!isTrackEvent(input.event)) return { ok: false };
  const name = typeof input.name === 'string' ? input.name : 'Toi';
  const note = typeof input.note === 'string' ? input.note : '';
  const id = typeof input.id === 'string' ? input.id : '';

  await sendDiscord(buildMessage(input.event, name, note));

  if (id && input.event === 'accepted') await incrStat(id, 'accepted');
  if (id && input.event === 'note') await incrStat(id, 'noted');

  return { ok: true };
}
