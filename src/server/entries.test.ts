// src/server/entries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const redis = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn(),
  del: vi.fn(),
  hincrby: vi.fn(),
  hgetall: vi.fn(),
}));
vi.mock('./redis', () => ({
  redis,
  entryKey: (id: string) => `entry:${id}`,
  statsKey: (id: string) => `stats:${id}`,
  INDEX_KEY: 'entries',
}));
vi.mock('./ids', () => ({ generateId: () => 'FIXEDid1', isValidId: () => true }));

import { createEntry, getEntryAndCountVisit, listEntries, deleteEntry, incrStat } from './entries';

beforeEach(() => vi.clearAllMocks());

describe('entries', () => {
  it('createEntry writes entry + index and returns the id', async () => {
    const id = await createEntry({ name: 'Lou', phrase: 'p', mode: 'flee' }, 1000);
    expect(id).toBe('FIXEDid1');
    expect(redis.set).toHaveBeenCalledWith('entry:FIXEDid1', { name: 'Lou', phrase: 'p', mode: 'flee', createdAt: 1000 });
    expect(redis.sadd).toHaveBeenCalledWith('entries', 'FIXEDid1');
  });

  it('getEntryAndCountVisit returns the entry and increments visits', async () => {
    redis.get.mockResolvedValue({ name: 'Lou', phrase: 'p', mode: 'flee', createdAt: 1 });
    const entry = await getEntryAndCountVisit('FIXEDid1');
    expect(entry?.name).toBe('Lou');
    expect(redis.hincrby).toHaveBeenCalledWith('stats:FIXEDid1', 'visits', 1);
  });

  it('getEntryAndCountVisit returns null and does NOT increment for unknown id', async () => {
    redis.get.mockResolvedValue(null);
    const entry = await getEntryAndCountVisit('FIXEDid1');
    expect(entry).toBeNull();
    expect(redis.hincrby).not.toHaveBeenCalled();
  });

  it('listEntries joins entries with their stats', async () => {
    redis.smembers.mockResolvedValue(['FIXEDid1']);
    redis.get.mockResolvedValue({ name: 'Lou', phrase: 'p', mode: 'flee', createdAt: 1 });
    redis.hgetall.mockResolvedValue({ visits: 3, accepted: 1, noted: 0 });
    const list = await listEntries();
    expect(list).toEqual([
      { id: 'FIXEDid1', entry: { name: 'Lou', phrase: 'p', mode: 'flee', createdAt: 1 }, stats: { visits: 3, accepted: 1, noted: 0 } },
    ]);
  });

  it('deleteEntry removes entry, stats and index membership', async () => {
    await deleteEntry('FIXEDid1');
    expect(redis.del).toHaveBeenCalledWith('entry:FIXEDid1');
    expect(redis.del).toHaveBeenCalledWith('stats:FIXEDid1');
    expect(redis.srem).toHaveBeenCalledWith('entries', 'FIXEDid1');
  });

  it('incrStat increments the given field', async () => {
    await incrStat('FIXEDid1', 'accepted');
    expect(redis.hincrby).toHaveBeenCalledWith('stats:FIXEDid1', 'accepted', 1);
  });
});
