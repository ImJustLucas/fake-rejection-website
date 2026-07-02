// src/server/entries.ts
import { redis, entryKey, statsKey, INDEX_KEY } from './redis.js';
import { generateId } from './ids.js';

export interface Entry {
  name: string;
  phrase: string;
  mode: string;
  createdAt: number;
}
export interface EntryStats {
  visits: number;
  accepted: number;
  noted: number;
}
export interface EntryWithStats {
  id: string;
  entry: Entry;
  stats: EntryStats;
}

export async function createEntry(input: { name: string; phrase: string; mode: string }, now: number): Promise<string> {
  const id = generateId();
  const entry: Entry = { name: input.name, phrase: input.phrase, mode: input.mode, createdAt: now };
  await redis.set(entryKey(id), entry);
  await redis.sadd(INDEX_KEY, id);
  return id;
}

export async function getEntryAndCountVisit(id: string): Promise<Entry | null> {
  const entry = await redis.get<Entry>(entryKey(id));
  if (!entry) return null;
  await redis.hincrby(statsKey(id), 'visits', 1);
  return entry;
}

async function readStats(id: string): Promise<EntryStats> {
  const raw = (await redis.hgetall<Record<string, string | number>>(statsKey(id))) ?? {};
  return {
    visits: Number(raw.visits ?? 0),
    accepted: Number(raw.accepted ?? 0),
    noted: Number(raw.noted ?? 0),
  };
}

export async function listEntries(): Promise<EntryWithStats[]> {
  const ids = await redis.smembers(INDEX_KEY);
  const results = await Promise.all(
    ids.map(async (id): Promise<EntryWithStats | null> => {
      const entry = await redis.get<Entry>(entryKey(id));
      if (!entry) return null;
      return { id, entry, stats: await readStats(id) };
    }),
  );
  return results.filter((r): r is EntryWithStats => r !== null);
}

export async function deleteEntry(id: string): Promise<void> {
  await redis.del(entryKey(id));
  await redis.del(statsKey(id));
  await redis.srem(INDEX_KEY, id);
}

export async function incrStat(id: string, field: 'accepted' | 'noted'): Promise<void> {
  await redis.hincrby(statsKey(id), field, 1);
}
