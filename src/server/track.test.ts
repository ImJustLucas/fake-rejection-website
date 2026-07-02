// src/server/track.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { incrStat } = vi.hoisted(() => ({ incrStat: vi.fn() }));
vi.mock('./entries', () => ({ incrStat }));

import { handleTrack, isTrackEvent } from './track';

describe('track', () => {
  beforeEach(() => {
    vi.stubEnv('DISCORD_WEBHOOK_URL', 'https://discord.test/wh');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    incrStat.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('isTrackEvent guards the union', () => {
    expect(isTrackEvent('visit')).toBe(true);
    expect(isTrackEvent('nope')).toBe(false);
  });

  it('rejects an unknown event without calling Discord', async () => {
    const r = await handleTrack({ event: 'nope', name: 'Lou' });
    expect(r.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends a visit message to Discord', async () => {
    const r = await handleTrack({ event: 'visit', name: 'Lou' });
    expect(r.ok).toBe(true);
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.content).toContain('Lou');
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });

  it('increments accepted stat when id + accepted event', async () => {
    await handleTrack({ event: 'accepted', name: 'Lou', id: 'FIXEDid1' });
    expect(incrStat).toHaveBeenCalledWith('FIXEDid1', 'accepted');
  });

  it('increments noted stat when id + note event', async () => {
    await handleTrack({ event: 'note', name: 'Lou', id: 'FIXEDid1', note: 'coucou' });
    expect(incrStat).toHaveBeenCalledWith('FIXEDid1', 'noted');
  });

  it('does not increment when no id', async () => {
    await handleTrack({ event: 'accepted', name: 'Lou' });
    expect(incrStat).not.toHaveBeenCalled();
  });
});
