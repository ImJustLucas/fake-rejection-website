// src/lib/discord.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notifyVisit, notifyAccepted, notifyNote } from './discord';

describe('discord client → /api/track', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true })));
  afterEach(() => vi.unstubAllGlobals());

  it('posts a typed visit event to /api/track', async () => {
    await notifyVisit('Lou', 'abcDEF12');
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/api/track');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ event: 'visit', name: 'Lou', id: 'abcDEF12' });
  });

  it('posts note with the note text', async () => {
    await notifyNote('Lou', 'insta: @x', 'abcDEF12');
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body).toMatchObject({ event: 'note', name: 'Lou', note: 'insta: @x', id: 'abcDEF12' });
  });

  it('never throws on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(notifyAccepted('Lou')).resolves.toBeUndefined();
  });
});
