import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notifyVisit, notifyReturn, notifySneaky, notifyAccepted, notifyNote } from './discord';

describe('discord webhooks', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DISCORD_WEBHOOK_URL', 'https://discord.test/webhook');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts a visit message with the right content', async () => {
    await notifyVisit('Camille');
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://discord.test/webhook');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.content).toContain('Camille');
    expect(body.content).toContain('👀');
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });

  it('includes the sanitized note text', async () => {
    await notifyNote('Camille', '@everyone insta: @lea');
    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.content).toContain('💌');
    expect(body.content).not.toContain('@everyone'); // @ neutralized
  });

  it('does not throw when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(notifyAccepted('Camille')).resolves.toBeUndefined();
  });

  it('skips the request entirely when the webhook URL is unset', async () => {
    vi.stubEnv('VITE_DISCORD_WEBHOOK_URL', '');
    await notifyReturn('Camille');
    await notifySneaky('Camille');
    expect(fetch).not.toHaveBeenCalled();
  });
});
