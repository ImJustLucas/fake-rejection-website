# Serverless Links (id + admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a serverless layer so links can be short `?id=x7k2` (name + phrase stored in Upstash Redis), with a password-protected admin dashboard to create/list/delete links + per-link stats, and Discord webhooks relayed server-side (hidden URL) — while existing `?name=` links keep working.

**Architecture:** Same repo/deploy. Vercel serverless functions in `/api/*.ts` (thin `(req,res)` handlers) delegate to `src/server/*` modules (all logic lives here — type-checked and unit-tested with Redis + fetch mocked). Frontend adds `?id=` resolution, a `{prenom}` phrase, an admin page, and swaps `discord.ts` transport to `POST /api/track`.

**Tech Stack:** existing React 18 + Vite 5 + TS + Tailwind + Vitest; adds `@upstash/redis`, `nanoid` (deps), `@vercel/node`, `@types/node` (dev). Local dev of `/api` uses `vercel dev`.

**Reused existing modules:** `src/lib/sanitize.ts` (`sanitizeName`, `sanitizeText`), `src/behaviors/ids.ts` (`BEHAVIOR_IDS`, `BehaviorId`), `src/lib/mode.ts` (`randomBehaviorId`).

---

## File Structure

```
api/                         # Vercel serverless funcs — THIN handlers only
├─ create.ts   entry.ts   track.ts   list.ts   delete.ts   health.ts
src/server/                  # all server logic (typechecked + unit-tested)
├─ redis.ts          # Redis.fromEnv() client + key helpers
├─ ids.ts            # generateId (nanoid) + isValidId
├─ validate.ts       # validateCreateInput (limits, mode)
├─ messages.ts       # buildMessage(event, name, note?)  (reuses sanitize)
├─ discord-server.ts # sendDiscord(content)  (DISCORD_WEBHOOK_URL)
├─ entries.ts        # createEntry / getEntryAndCountVisit / listEntries / deleteEntry / incrStat
├─ track.ts          # handleTrack + isTrackEvent
└─ admin.ts          # isAuthorized (constant-time)
src/lib/
└─ phrase.ts         # renderPhrase(phrase, name)  ({prenom} token)
src/hooks/
├─ use-entry.ts      # fetch /api/entry for ?id
└─ use-visit-tracking.ts   # MODIFIED: thread id
src/lib/discord.ts   # MODIFIED: POST /api/track instead of Discord
src/components/
├─ question-card.tsx # MODIFIED: render phrase
└─ admin/
   ├─ admin-page.tsx # password gate + orchestration
   ├─ link-form.tsx  # create form
   └─ link-list.tsx  # list + stats + delete
src/app.tsx          # MODIFIED: resolve source (id > name > cache > fallback), admin route
```

Tests are colocated as `*.test.ts(x)`.

---

## Task 1: Dependencies, `/api` bootstrap, and local dev

**Files:**
- Modify: `package.json`, `tsconfig.json`, `.env.example`
- Create: `api/health.ts`

- [ ] **Step 1: Install deps**

Run:
```bash
npm install @upstash/redis nanoid
npm install -D @vercel/node @types/node
```
Expected: installs cleanly, updates `package-lock.json`.

- [ ] **Step 2: Make `tsconfig.json` type-check the `api/` folder too**

In `tsconfig.json`, change the `include` and add node types. Replace the `"include"` line and the `"types"` line so they read:
```jsonc
    "types": ["vitest/globals", "@testing-library/jest-dom", "node"],
```
```jsonc
  "include": ["src", "api"],
```
(Everything else in the file stays the same.)

- [ ] **Step 3: Create `api/health.ts`** (proves `/api` works under `vercel dev`)

```ts
// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true });
}
```

- [ ] **Step 4: Document env vars in `.env.example`** (replace file contents)

```bash
# Server-side (used by /api functions — NOT exposed to the browser):
DISCORD_WEBHOOK_URL=
ADMIN_SECRET=
# Auto-injected by the Vercel Upstash integration (fill for local dev):
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 5: Verify type-check + tests still pass**

Run: `npx tsc -b` → clean. Run: `npm test` → all existing tests pass.

- [ ] **Step 6: (manual) verify `/api` locally**

Run: `npx vercel dev` (link the project if prompted), then in another shell `curl localhost:3000/api/health` → `{"ok":true}`. Stop the server. (This is a manual check; don't block automation on it.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add upstash/nanoid/vercel deps and /api bootstrap"
```

---

## Task 2: `src/server/ids.ts` — id generation + validation (TDD)

**Files:** Create `src/server/ids.ts`, `src/server/ids.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/server/ids.test.ts
import { describe, it, expect } from 'vitest';
import { generateId, isValidId } from './ids';

describe('ids', () => {
  it('generates an 8-char base62 id', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9A-Za-z]{8}$/);
  });
  it('generates distinct ids', () => {
    expect(generateId()).not.toBe(generateId());
  });
  it('validates id format', () => {
    expect(isValidId('abcDEF12')).toBe(true);
    expect(isValidId('short')).toBe(false);
    expect(isValidId('has space')).toBe(false);
    expect(isValidId('toolongtoolong')).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/server/ids.test.ts`

- [ ] **Step 3: Implement `src/server/ids.ts`**

```ts
// src/server/ids.ts
import { customAlphabet } from 'nanoid';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nano = customAlphabet(ALPHABET, 8);

export function generateId(): string {
  return nano();
}

export function isValidId(id: string): boolean {
  return /^[0-9A-Za-z]{8}$/.test(id);
}
```

- [ ] **Step 4: Run → PASS.** `npx vitest run src/server/ids.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/server/ids.ts src/server/ids.test.ts
git commit -m "feat(server): id generation and validation"
```

---

## Task 3: `src/server/validate.ts` — create-input validation (TDD)

**Files:** Create `src/server/validate.ts`, `src/server/validate.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/server/validate.test.ts
import { describe, it, expect } from 'vitest';
import { validateCreateInput } from './validate';

describe('validateCreateInput', () => {
  it('accepts a valid input and trims', () => {
    const r = validateCreateInput({ name: '  Lou ', phrase: '{prenom} ?', mode: 'flee' });
    expect(r).toEqual({ ok: true, value: { name: 'Lou', phrase: '{prenom} ?', mode: 'flee' } });
  });
  it('defaults mode to random when missing', () => {
    const r = validateCreateInput({ name: 'Lou', phrase: '' });
    expect(r.ok && r.value.mode).toBe('random');
  });
  it('allows an empty phrase', () => {
    const r = validateCreateInput({ name: 'Lou', phrase: '' });
    expect(r.ok).toBe(true);
  });
  it('rejects a missing name', () => {
    expect(validateCreateInput({ name: '  ', phrase: 'x' })).toEqual({ ok: false, error: 'name' });
  });
  it('rejects an over-long name', () => {
    expect(validateCreateInput({ name: 'a'.repeat(41), phrase: '' }).ok).toBe(false);
  });
  it('rejects an over-long phrase', () => {
    expect(validateCreateInput({ name: 'Lou', phrase: 'a'.repeat(201) })).toEqual({ ok: false, error: 'phrase' });
  });
  it('rejects an unknown mode', () => {
    expect(validateCreateInput({ name: 'Lou', phrase: '', mode: 'nope' })).toEqual({ ok: false, error: 'mode' });
  });
  it('rejects a non-object body', () => {
    expect(validateCreateInput(null).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `src/server/validate.ts`**

```ts
// src/server/validate.ts
import { BEHAVIOR_IDS } from '../behaviors/ids';

export const MODES = ['random', ...BEHAVIOR_IDS] as const;
export type Mode = (typeof MODES)[number];

export interface CreateInput {
  name: string;
  phrase: string;
  mode: Mode;
}

type Result = { ok: true; value: CreateInput } | { ok: false; error: string };

export function validateCreateInput(body: unknown): Result {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body' };
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const phrase = typeof b.phrase === 'string' ? b.phrase.trim() : '';
  const mode = typeof b.mode === 'string' ? b.mode : 'random';

  if (!name || name.length > 40) return { ok: false, error: 'name' };
  if (phrase.length > 200) return { ok: false, error: 'phrase' };
  if (!(MODES as readonly string[]).includes(mode)) return { ok: false, error: 'mode' };

  return { ok: true, value: { name, phrase, mode: mode as Mode } };
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/server/validate.ts src/server/validate.test.ts
git commit -m "feat(server): create-input validation"
```

---

## Task 4: `src/server/messages.ts` — event → Discord message (TDD)

**Files:** Create `src/server/messages.ts`, `src/server/messages.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/server/messages.test.ts
import { describe, it, expect } from 'vitest';
import { buildMessage } from './messages';

describe('buildMessage', () => {
  it('builds each event with the right emoji and name', () => {
    expect(buildMessage('visit', 'Lou')).toContain('👀');
    expect(buildMessage('return', 'Lou')).toContain('🔁');
    expect(buildMessage('sneaky', 'Lou')).toContain('🕵️');
    expect(buildMessage('accepted', 'Lou')).toContain('✅');
    expect(buildMessage('visit', 'Lou')).toContain('Lou');
  });
  it('includes the sanitized note (mentions neutralized)', () => {
    const msg = buildMessage('note', 'Lou', '@everyone insta');
    expect(msg).toContain('💌');
    expect(msg).not.toContain('@everyone');
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `src/server/messages.ts`**

```ts
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
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/server/messages.ts src/server/messages.test.ts
git commit -m "feat(server): event-to-message builder"
```

---

## Task 5: `src/server/admin.ts` — constant-time auth (TDD)

**Files:** Create `src/server/admin.ts`, `src/server/admin.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/server/admin.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAuthorized } from './admin';

describe('isAuthorized', () => {
  beforeEach(() => vi.stubEnv('ADMIN_SECRET', 's3cret'));
  afterEach(() => vi.unstubAllEnvs());

  it('accepts the correct secret', () => {
    expect(isAuthorized('s3cret')).toBe(true);
  });
  it('rejects a wrong secret', () => {
    expect(isAuthorized('nope')).toBe(false);
  });
  it('rejects a wrong-length secret', () => {
    expect(isAuthorized('s3cre')).toBe(false);
  });
  it('rejects undefined', () => {
    expect(isAuthorized(undefined)).toBe(false);
  });
  it('rejects everything when ADMIN_SECRET is unset', () => {
    vi.stubEnv('ADMIN_SECRET', '');
    expect(isAuthorized('anything')).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `src/server/admin.ts`**

```ts
// src/server/admin.ts
import { timingSafeEqual } from 'node:crypto';

export function isAuthorized(provided: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET ?? '';
  if (!secret || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/server/admin.ts src/server/admin.test.ts
git commit -m "feat(server): constant-time admin auth"
```

---

## Task 6: `src/server/redis.ts` — client + key helpers

**Files:** Create `src/server/redis.ts` (no test — thin wrapper; exercised via mocks in Task 7/8)

- [ ] **Step 1: Implement**

```ts
// src/server/redis.ts
import { Redis } from '@upstash/redis';

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from the environment.
export const redis = Redis.fromEnv();

export const entryKey = (id: string): string => `entry:${id}`;
export const statsKey = (id: string): string => `stats:${id}`;
export const INDEX_KEY = 'entries';
```

- [ ] **Step 2: Type-check.** `npx tsc -b` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/server/redis.ts
git commit -m "feat(server): upstash redis client and key helpers"
```

---

## Task 7: `src/server/entries.ts` — CRUD + stats (TDD, mocked Redis)

**Files:** Create `src/server/entries.ts`, `src/server/entries.test.ts`

- [ ] **Step 1: Failing test** (mock `./redis` and `./ids`)

```ts
// src/server/entries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const redis = {
  set: vi.fn(),
  get: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn(),
  del: vi.fn(),
  hincrby: vi.fn(),
  hgetall: vi.fn(),
};
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
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `src/server/entries.ts`**

```ts
// src/server/entries.ts
import { redis, entryKey, statsKey, INDEX_KEY } from './redis';
import { generateId } from './ids';

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
  const raw = (await redis.hgetall<Record<string, number>>(statsKey(id))) ?? {};
  return {
    visits: Number(raw.visits ?? 0),
    accepted: Number(raw.accepted ?? 0),
    noted: Number(raw.noted ?? 0),
  };
}

export async function listEntries(): Promise<EntryWithStats[]> {
  const ids = await redis.smembers(INDEX_KEY);
  const out: EntryWithStats[] = [];
  for (const id of ids) {
    const entry = await redis.get<Entry>(entryKey(id));
    if (entry) out.push({ id, entry, stats: await readStats(id) });
  }
  return out;
}

export async function deleteEntry(id: string): Promise<void> {
  await redis.del(entryKey(id));
  await redis.del(statsKey(id));
  await redis.srem(INDEX_KEY, id);
}

export async function incrStat(id: string, field: 'accepted' | 'noted'): Promise<void> {
  await redis.hincrby(statsKey(id), field, 1);
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/server/entries.ts src/server/entries.test.ts
git commit -m "feat(server): redis-backed entries CRUD and stats"
```

---

## Task 8: `discord-server.ts` + `track.ts` — relay + typed events (TDD)

**Files:** Create `src/server/discord-server.ts`, `src/server/track.ts`, `src/server/track.test.ts`

- [ ] **Step 1: Implement `src/server/discord-server.ts`** (no separate test; covered via track.test with mocked fetch)

```ts
// src/server/discord-server.ts
export async function sendDiscord(content: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL ?? '';
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    });
  } catch {
    /* fire-and-forget */
  }
}
```

- [ ] **Step 2: Failing test for track**

```ts
// src/server/track.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const incrStat = vi.fn();
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

  it('does not increment when no id', async () => {
    await handleTrack({ event: 'accepted', name: 'Lou' });
    expect(incrStat).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run → FAIL.**

- [ ] **Step 4: Implement `src/server/track.ts`**

```ts
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
```

- [ ] **Step 5: Run → PASS.** Then `npx tsc -b` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/server/discord-server.ts src/server/track.ts src/server/track.test.ts
git commit -m "feat(server): discord relay and typed track handler"
```

---

## Task 9: `/api` handlers (thin) + handler tests

**Files:** Create `api/create.ts`, `api/entry.ts`, `api/track.ts`, `api/list.ts`, `api/delete.ts`, and `api/handlers.test.ts`

- [ ] **Step 1: Implement the five handlers**

```ts
// api/create.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorized } from '../src/server/admin';
import { validateCreateInput } from '../src/server/validate';
import { createEntry } from '../src/server/entries';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!isAuthorized(req.headers['x-admin-secret'] as string | undefined)) return res.status(401).json({ error: 'unauthorized' });
  const parsed = validateCreateInput(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const id = await createEntry(parsed.value, Date.now());
  return res.status(200).json({ id });
}
```

```ts
// api/entry.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEntryAndCountVisit } from '../src/server/entries';
import { isValidId } from '../src/server/ids';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!isValidId(id)) return res.status(400).json({ error: 'id' });
  const entry = await getEntryAndCountVisit(id);
  if (!entry) return res.status(404).json({ error: 'notfound' });
  return res.status(200).json({ name: entry.name, phrase: entry.phrase, mode: entry.mode });
}
```

```ts
// api/track.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleTrack } from '../src/server/track';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const result = await handleTrack(req.body ?? {});
  return res.status(result.ok ? 200 : 400).json(result);
}
```

```ts
// api/list.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorized } from '../src/server/admin';
import { listEntries } from '../src/server/entries';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req.headers['x-admin-secret'] as string | undefined)) return res.status(401).json({ error: 'unauthorized' });
  return res.status(200).json({ entries: await listEntries() });
}
```

```ts
// api/delete.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorized } from '../src/server/admin';
import { deleteEntry } from '../src/server/entries';
import { isValidId } from '../src/server/ids';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!isAuthorized(req.headers['x-admin-secret'] as string | undefined)) return res.status(401).json({ error: 'unauthorized' });
  const id = typeof (req.body as { id?: unknown })?.id === 'string' ? (req.body as { id: string }).id : '';
  if (!isValidId(id)) return res.status(400).json({ error: 'id' });
  await deleteEntry(id);
  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 2: Write handler tests** (mock the `src/server` modules; a fake `res`)

```ts
// api/handlers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/server/admin', () => ({ isAuthorized: (s?: string) => s === 'good' }));
vi.mock('../src/server/entries', () => ({
  createEntry: vi.fn().mockResolvedValue('FIXEDid1'),
  getEntryAndCountVisit: vi.fn(),
  listEntries: vi.fn().mockResolvedValue([]),
  deleteEntry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/server/track', () => ({ handleTrack: vi.fn().mockResolvedValue({ ok: true }) }));

import create from './create';
import entry from './entry';
import list from './list';
import { getEntryAndCountVisit } from '../src/server/entries';

function mockRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

beforeEach(() => vi.clearAllMocks());

describe('api handlers', () => {
  it('create rejects without the admin secret (401)', async () => {
    const res = mockRes();
    await create({ method: 'POST', headers: {}, body: { name: 'Lou', phrase: '' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('create returns an id with the admin secret', async () => {
    const res = mockRes();
    await create({ method: 'POST', headers: { 'x-admin-secret': 'good' }, body: { name: 'Lou', phrase: '' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 'FIXEDid1' });
  });

  it('entry returns 404 for an unknown id', async () => {
    (getEntryAndCountVisit as any).mockResolvedValue(null);
    const res = mockRes();
    await entry({ query: { id: 'abcDEF12' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('entry returns 400 for a malformed id', async () => {
    const res = mockRes();
    await entry({ query: { id: 'bad' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('list rejects without the admin secret (401)', async () => {
    const res = mockRes();
    await list({ headers: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

- [ ] **Step 3: Run → PASS.** `npx vitest run api/handlers.test.ts`. Then `npm test` (full) + `npx tsc -b`.

- [ ] **Step 4: Commit**

```bash
git add api/create.ts api/entry.ts api/track.ts api/list.ts api/delete.ts api/handlers.test.ts
git commit -m "feat(api): thin serverless handlers for links + track"
```

---

## Task 10: `src/lib/phrase.ts` — `{prenom}` rendering (TDD)

**Files:** Create `src/lib/phrase.ts`, `src/lib/phrase.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/phrase.test.ts
import { describe, it, expect } from 'vitest';
import { renderPhrase } from './phrase';

describe('renderPhrase', () => {
  it('replaces the {prenom} token', () => {
    expect(renderPhrase('{prenom}, un date ?', 'Lou')).toBe('Lou, un date ?');
  });
  it('replaces every occurrence', () => {
    expect(renderPhrase('{prenom} & {prenom}', 'Lou')).toBe('Lou & Lou');
  });
  it('returns the default question when the phrase is empty', () => {
    expect(renderPhrase('', 'Lou')).toBe('Lou, veux-tu venir en date avec moi ?');
  });
  it('returns the phrase as-is when there is no token', () => {
    expect(renderPhrase('On se voit ?', 'Lou')).toBe('On se voit ?');
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `src/lib/phrase.ts`**

```ts
// src/lib/phrase.ts
export function renderPhrase(phrase: string, name: string): string {
  const p = phrase.trim();
  if (!p) return `${name}, veux-tu venir en date avec moi ?`;
  return p.replace(/\{prenom\}/g, name);
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/phrase.ts src/lib/phrase.test.ts
git commit -m "feat: phrase rendering with {prenom} token"
```

---

## Task 11: `src/hooks/use-entry.ts` — fetch `/api/entry` (TDD)

**Files:** Create `src/hooks/use-entry.ts`, `src/hooks/use-entry.test.tsx`

- [ ] **Step 1: Failing test** (mock global fetch; render a harness)

```tsx
// src/hooks/use-entry.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useEntry, type EntryState } from './use-entry';

function Harness({ id }: { id: string | null }) {
  const state: EntryState = useEntry(id);
  return <div data-testid="s">{state.status === 'ok' ? state.data.name : state.status}</div>;
}

describe('useEntry', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is idle when there is no id', () => {
    render(<Harness id={null} />);
    expect(screen.getByTestId('s').textContent).toBe('idle');
  });

  it('resolves ok with the entry data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ name: 'Lou', phrase: 'p', mode: 'flee' }) }));
    render(<Harness id="abcDEF12" />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('Lou'));
  });

  it('maps 404 to notfound', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    render(<Harness id="abcDEF12" />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('notfound'));
  });

  it('maps a network failure to error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<Harness id="abcDEF12" />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('error'));
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `src/hooks/use-entry.ts`**

```ts
// src/hooks/use-entry.ts
import { useEffect, useState } from 'react';

export interface RemoteEntry {
  name: string;
  phrase: string;
  mode: string;
}
export type EntryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: RemoteEntry }
  | { status: 'notfound' }
  | { status: 'error' };

export function useEntry(id: string | null): EntryState {
  const [state, setState] = useState<EntryState>(id ? { status: 'loading' } : { status: 'idle' });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ status: 'loading' });
    fetch(`/api/entry?id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) return setState({ status: 'notfound' });
        if (!r.ok) return setState({ status: 'error' });
        setState({ status: 'ok', data: (await r.json()) as RemoteEntry });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-entry.ts src/hooks/use-entry.test.tsx
git commit -m "feat: use-entry hook fetching /api/entry"
```

---

## Task 12: Swap `discord.ts` transport to `/api/track` (TDD)

**Files:** Modify `src/lib/discord.ts`, `src/lib/discord.test.ts`

- [ ] **Step 1: Replace `src/lib/discord.test.ts`** with the new transport test

```ts
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
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Replace `src/lib/discord.ts`**

```ts
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
```

- [ ] **Step 4: Run → PASS.** `npx vitest run src/lib/discord.test.ts`. (The visit-tracking hook test still passes — it spies on these functions.) Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discord.ts src/lib/discord.test.ts
git commit -m "refactor: discord client posts typed events to /api/track"
```

---

## Task 13: Thread `id` through visit-tracking (TDD)

**Files:** Modify `src/hooks/use-visit-tracking.ts`, `src/hooks/use-visit-tracking.test.tsx`

- [ ] **Step 1: Update the test** — add an `id` arg and assert it is forwarded. Replace the two existing render calls' component and add an assertion. Change the `Harness` and add a case:

```tsx
// in src/hooks/use-visit-tracking.test.tsx
function Harness({ name, sneaky, id }: { name: string; sneaky: boolean; id?: string }) {
  useVisitTracking(name, sneaky, id);
  return null;
}

it('forwards the id to the webhook calls', () => {
  render(<Harness name="Lou" sneaky={false} id="abcDEF12" />);
  expect(discord.notifyVisit).toHaveBeenCalledWith('Lou', 'abcDEF12');
});
```
(Keep the existing tests; update their `Harness` usage — they can omit `id`.)

- [ ] **Step 2: Run → FAIL** (signature mismatch / arg not forwarded).

- [ ] **Step 3: Update `src/hooks/use-visit-tracking.ts`** — add the `id` param and forward it. Change the signature and the notify calls:

```ts
export function useVisitTracking(name: string, sneaky: boolean, id?: string): void {
  const fired = useRef(false);
  const args = useRef({ name, sneaky, id });
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const { name, sneaky, id } = args.current;
    const visited = safeGet(VISITED_KEY) === '1';
    const returns = parseReturns(safeGet(RETURNS_KEY));
    const decision = decideVisitEvent({ visited, returns, now: Date.now() });

    safeSet(VISITED_KEY, '1');
    safeSet(RETURNS_KEY, JSON.stringify(decision.nextReturns));

    if (decision.event === 'visit') notifyVisit(name, id);
    else if (decision.event === 'return') notifyReturn(name, id);

    if (sneaky) notifySneaky(name, id);
  }, []);
}
```
(Keep the existing helper functions and imports.)

- [ ] **Step 4: Run → PASS.** `npx vitest run src/hooks/use-visit-tracking.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-visit-tracking.ts src/hooks/use-visit-tracking.test.tsx
git commit -m "feat: thread link id through visit tracking"
```

---

## Task 14: Source resolution hook — id › name › cache › fallback (TDD)

Combines `?id=` (via useEntry), the existing `usePersonName` (name/cache/sneaky), `?q=` phrase, and `?mode=`/stored mode into a single resolved target, plus a `loading` state while an id is being fetched. Caches the id.

**Files:** Create `src/hooks/use-target.ts`, `src/hooks/use-target.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
// src/hooks/use-target.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useTarget } from './use-target';

function Harness() {
  const t = useTarget();
  return <div data-testid="s">{t.status === 'ready' ? `${t.name}|${t.phrase}|${t.mode}|${t.id ?? ''}|${t.sneaky}` : t.status}</div>;
}

const ID_KEY = 'date.id';

describe('useTarget', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('resolves from ?id and caches the id', async () => {
    window.history.replaceState({}, '', '/?id=abcDEF12');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ name: 'Lou', phrase: '{prenom} ?', mode: 'flee' }) }));
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('Lou|{prenom} ?|flee|abcDEF12|false'));
    expect(localStorage.getItem(ID_KEY)).toBe('abcDEF12');
  });

  it('falls back to ?name when there is no id', () => {
    window.history.replaceState({}, '', '/?name=Camille&mode=grow');
    render(<Harness />);
    expect(screen.getByTestId('s').textContent).toBe('Camille||grow||false');
  });

  it('flags sneaky and refetches when id is removed but cached', async () => {
    localStorage.setItem(ID_KEY, 'abcDEF12');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ name: 'Lou', phrase: '', mode: 'random' }) }));
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('Lou||random|abcDEF12|true'));
  });

  it('falls back to "Toi" when id is unknown (404) and no name', async () => {
    window.history.replaceState({}, '', '/?id=abcDEF12');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('Toi||random||false'));
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `src/hooks/use-target.ts`**

```ts
// src/hooks/use-target.ts
import { useMemo } from 'react';
import { useEntry } from './use-entry';

const ID_KEY = 'date.id';

export type Target =
  | { status: 'loading' }
  | { status: 'ready'; name: string; phrase: string; mode: string; id?: string; sneaky: boolean };

function safeGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string): void {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
}

export function useTarget(): Target {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlId = params.get('id');
  const urlName = params.get('name');
  const urlPhrase = params.get('q') ?? '';
  const urlMode = params.get('mode') ?? 'random';

  const cachedId = useMemo(() => safeGet(ID_KEY), []);
  // Fetch by url id, or by cached id when url has neither id nor name (the "sneaky" case).
  const idToFetch = urlId ?? (!urlName && cachedId ? cachedId : null);
  const sneaky = !urlId && !urlName && !!cachedId;

  const entry = useEntry(idToFetch);

  return useMemo<Target>(() => {
    // id path
    if (idToFetch) {
      if (entry.status === 'loading' || entry.status === 'idle') return { status: 'loading' };
      if (entry.status === 'ok') {
        if (urlId) safeSet(ID_KEY, urlId); // cache a freshly-visited id
        return { status: 'ready', name: entry.data.name, phrase: entry.data.phrase, mode: entry.data.mode, id: idToFetch, sneaky };
      }
      // notfound / error → fall through to name/fallback below
    }
    // name path (backward compatible)
    if (urlName && urlName.trim()) {
      return { status: 'ready', name: urlName.trim(), phrase: urlPhrase, mode: urlMode, sneaky: false };
    }
    // fallback
    return { status: 'ready', name: 'Toi', phrase: '', mode: 'random', sneaky: false };
  }, [idToFetch, entry, urlId, urlName, urlPhrase, urlMode, sneaky]);
}
```

- [ ] **Step 4: Run → PASS.** `npx vitest run src/hooks/use-target.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-target.ts src/hooks/use-target.test.tsx
git commit -m "feat: unified target resolution (id > name > cache > fallback)"
```

---

## Task 15: Wire `App` + `QuestionCard` to the resolved target (TDD)

**Files:** Modify `src/app.tsx`, `src/components/question-card.tsx`, `src/app.test.tsx`

- [ ] **Step 1: Update `src/components/question-card.tsx`** to render a resolved phrase and take a concrete `mode: BehaviorId`

```tsx
// src/components/question-card.tsx
import { BEHAVIORS } from '../behaviors';
import type { BehaviorId } from '../behaviors/ids';
import { renderPhrase } from '../lib/phrase';

interface QuestionCardProps {
  name: string;
  phrase: string;
  mode: BehaviorId;
  isTouch: boolean;
  onYes: () => void;
}

export function QuestionCard({ name, phrase, mode, isTouch, onYes }: QuestionCardProps) {
  const Behavior = BEHAVIORS[mode].Component;
  return (
    <div className="meme-card max-w-sm md:max-w-lg md:p-10 w-full mx-auto relative z-10">
      <div className="text-4xl md:text-6xl">💖</div>
      <h1 className="text-2xl md:text-4xl font-extrabold text-[#2b061e] mt-2 leading-tight">
        {renderPhrase(phrase, name)}
      </h1>
      <Behavior onYes={onYes} isTouch={isTouch} />
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app.tsx`** to use `useTarget`, resolve the concrete behavior, thread `id`, and show a light loading state

```tsx
// src/app.tsx
import { useState } from 'react';
import { useTarget } from './hooks/use-target';
import { useVisitTracking } from './hooks/use-visit-tracking';
import { QuestionCard } from './components/question-card';
import { ThankYouCard } from './components/thank-you-card';
import { notifyAccepted, notifyNote } from './lib/discord';
import { firePinkConfetti } from './lib/confetti';
import { resolveMode, randomBehaviorId } from './lib/mode';

type Phase = 'asking' | 'accepted';

export default function App() {
  const target = useTarget();
  const [phase, setPhase] = useState<Phase>('asking');

  // Hooks must be called unconditionally; derive safe values while loading.
  const name = target.status === 'ready' ? target.name : 'Toi';
  const id = target.status === 'ready' ? target.id : undefined;
  const sneaky = target.status === 'ready' ? target.sneaky : false;
  const rawMode = target.status === 'ready' ? target.mode : 'random';
  const isTouch =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
      : false;

  useVisitTracking(target.status === 'ready' ? name : 'Toi', sneaky, id);

  const handleYes = () => {
    notifyAccepted(name, id);
    firePinkConfetti();
    setPhase('accepted');
  };
  const handleNote = (note: string) => {
    if (note) notifyNote(name, note, id);
    firePinkConfetti();
  };

  const mode = resolveMode(rawMode === 'random' ? null : rawMode, () => randomBehaviorId());
  const phrase = target.status === 'ready' ? target.phrase : '';

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-[#ffd9e8] to-[#ff7eb0]">
      {target.status === 'loading' ? (
        <div className="meme-card max-w-sm w-full mx-auto text-4xl">💌</div>
      ) : phase === 'asking' ? (
        <QuestionCard name={name} phrase={phrase} mode={mode} isTouch={isTouch} onYes={handleYes} />
      ) : (
        <ThankYouCard name={name} onSend={handleNote} />
      )}
    </main>
  );
}
```
Note: `useVisitTracking`'s internal `fired` ref guard means it effectively fires once; while `target` is loading it fires with `Toi`, so guard against that by only counting a real visit once resolved. To keep it simple and correct, gate the tracking: pass a stable flag. Replace the `useVisitTracking(...)` line with a ref-gated effect:

```tsx
import { useEffect, useRef } from 'react';
// ...
const tracked = useRef(false);
useEffect(() => {
  if (target.status !== 'ready' || tracked.current) return;
  tracked.current = true;
  // one-shot: import the tracking primitives directly
}, [target.status]);
```
Simplest robust approach: change `useVisitTracking` to accept a `ready: boolean` and no-op until ready. Update its signature to `useVisitTracking(name, sneaky, id, ready)` and early-return in the effect when `!ready`. Update Task 13's hook + test accordingly if implementing this task reveals the need. **Decision for this task:** add a 4th `ready` param to `useVisitTracking` (default `true`), and in `App` pass `target.status === 'ready'`. The effect becomes:

```ts
export function useVisitTracking(name: string, sneaky: boolean, id?: string, ready = true): void {
  const fired = useRef(false);
  const args = useRef({ name, sneaky, id });
  args.current = { name, sneaky, id };
  useEffect(() => {
    if (!ready || fired.current) return;
    fired.current = true;
    const { name, sneaky, id } = args.current;
    // ...unchanged body...
  }, [ready]);
}
```

- [ ] **Step 3: Update `src/app.test.tsx`** — the happy-path test uses `?name=` (no id), so `useTarget` resolves synchronously to the name path. Adjust the expected question text (now via `renderPhrase`, default question) and keep the flow. Replace the file:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './app';
import * as discord from './lib/discord';
import * as confettiLib from './lib/confetti';

describe('App happy path (name link)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/?name=Camille&mode=grow');
    vi.spyOn(discord, 'notifyVisit').mockResolvedValue();
    vi.spyOn(discord, 'notifyAccepted').mockResolvedValue();
    vi.spyOn(discord, 'notifyNote').mockResolvedValue();
    vi.spyOn(confettiLib, 'firePinkConfetti').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the personalized question, accepts, and sends a note', () => {
    render(<App />);
    expect(screen.getByText(/Camille, veux-tu venir en date/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Oui/ }));
    expect(discord.notifyAccepted).toHaveBeenCalledWith('Camille', undefined);
    expect(confettiLib.firePinkConfetti).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/petit mot/), { target: { value: '@camille_insta' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer/ }));
    expect(discord.notifyNote).toHaveBeenCalledWith('Camille', '@camille_insta', undefined);
    expect(screen.getByText(/C'est noté/)).toBeInTheDocument();
    expect(confettiLib.firePinkConfetti).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 4: Run → PASS.** `npm test` (full suite) + `npx tsc -b` (clean).

- [ ] **Step 5: Commit**

```bash
git add src/app.tsx src/components/question-card.tsx src/app.test.tsx src/hooks/use-visit-tracking.ts
git commit -m "feat: drive App from resolved target (id/name), render phrase"
```

---

## Task 16: Admin dashboard (password + form + list/stats/delete)

**Files:** Create `src/components/admin/admin-page.tsx`, `src/components/admin/link-form.tsx`, `src/components/admin/link-list.tsx`, `src/components/admin/admin-page.test.tsx`; Modify `src/app.tsx`

- [ ] **Step 1: Create `src/components/admin/link-form.tsx`**

```tsx
// src/components/admin/link-form.tsx
import { useState } from 'react';
import { BEHAVIOR_IDS } from '../../behaviors/ids';

interface Props {
  onCreate: (input: { name: string; phrase: string; mode: string }) => Promise<string | null>;
}

export function LinkForm({ onCreate }: Props) {
  const [name, setName] = useState('');
  const [phrase, setPhrase] = useState('');
  const [mode, setMode] = useState('random');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const id = await onCreate({ name: name.trim(), phrase: phrase.trim(), mode });
    if (!id) return setError('Échec (mot de passe ? champ ?)');
    setLink(`${window.location.origin}/?id=${id}`);
  };

  return (
    <div className="meme-card max-w-lg w-full mx-auto text-left">
      <h2 className="text-xl font-extrabold text-[#2b061e]">Nouveau lien</h2>
      <input className="w-full mt-3 rounded-xl px-3 py-2" style={{ border: '2px solid #2b061e' }}
        aria-label="Prénom" placeholder="Prénom" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea className="w-full mt-3 rounded-xl px-3 py-2" style={{ border: '2px solid #2b061e' }}
        aria-label="Phrase" placeholder="Phrase (utilise {prenom})" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
      <select className="w-full mt-3 rounded-xl px-3 py-2" style={{ border: '2px solid #2b061e' }}
        aria-label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="random">aléatoire</option>
        {BEHAVIOR_IDS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <button type="button" className="yes-btn mt-4 w-full" onClick={submit}>Générer</button>
      {error && <p className="mt-2 text-red-700">{error}</p>}
      {link && (
        <div className="mt-3">
          <code className="break-all">{link}</code>
          <button type="button" className="no-btn ml-2" onClick={() => navigator.clipboard?.writeText(link)}>📋 Copier</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/admin/link-list.tsx`**

```tsx
// src/components/admin/link-list.tsx
export interface AdminEntry {
  id: string;
  entry: { name: string; phrase: string; mode: string };
  stats: { visits: number; accepted: number; noted: number };
}

interface Props {
  entries: AdminEntry[];
  onDelete: (id: string) => void;
}

export function LinkList({ entries, onDelete }: Props) {
  if (entries.length === 0) return <p className="mt-4 text-[#2b061e]">Aucun lien pour l'instant.</p>;
  return (
    <ul className="mt-4 space-y-2 text-left">
      {entries.map((e) => (
        <li key={e.id} className="meme-card max-w-lg w-full mx-auto">
          <div className="font-bold text-[#2b061e]">{e.entry.name} · <code>/?id={e.id}</code></div>
          <div className="text-sm">{e.entry.phrase || '(phrase par défaut)'} — mode {e.entry.mode}</div>
          <div className="text-sm mt-1">👁 {e.stats.visits} · ✅ {e.stats.accepted} · 💌 {e.stats.noted}</div>
          <button type="button" className="no-btn mt-2" onClick={() => onDelete(e.id)}>🗑 Supprimer</button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Create `src/components/admin/admin-page.tsx`** (password gate + data fetching)

```tsx
// src/components/admin/admin-page.tsx
import { useEffect, useState } from 'react';
import { LinkForm } from './link-form';
import { LinkList, type AdminEntry } from './link-list';

const SECRET_KEY = 'date.admin.secret';

export function AdminPage() {
  const [secret, setSecret] = useState<string>(() => {
    try { return localStorage.getItem(SECRET_KEY) ?? ''; } catch { return ''; }
  });
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<AdminEntry[]>([]);

  const headers = { 'Content-Type': 'application/json', 'x-admin-secret': secret };

  const refresh = async () => {
    if (!secret) return;
    try {
      const r = await fetch('/api/list', { headers });
      if (r.ok) setEntries((await r.json()).entries as AdminEntry[]);
    } catch { /* ignore */ }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [secret]);

  const create = async (body: { name: string; phrase: string; mode: string }): Promise<string | null> => {
    try {
      const r = await fetch('/api/create', { method: 'POST', headers, body: JSON.stringify(body) });
      if (!r.ok) return null;
      const { id } = await r.json();
      void refresh();
      return id as string;
    } catch { return null; }
  };

  const remove = async (id: string) => {
    try {
      await fetch('/api/delete', { method: 'POST', headers, body: JSON.stringify({ id }) });
      void refresh();
    } catch { /* ignore */ }
  };

  if (!secret) {
    return (
      <div className="meme-card max-w-sm w-full mx-auto">
        <h2 className="text-xl font-extrabold text-[#2b061e]">Admin</h2>
        <input className="w-full mt-3 rounded-xl px-3 py-2" style={{ border: '2px solid #2b061e' }}
          type="password" aria-label="Mot de passe" placeholder="Mot de passe" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="button" className="yes-btn mt-3 w-full" onClick={() => {
          try { localStorage.setItem(SECRET_KEY, input); } catch { /* ignore */ }
          setSecret(input);
        }}>Entrer</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto py-8">
      <LinkForm onCreate={create} />
      <LinkList entries={entries} onDelete={remove} />
    </div>
  );
}
```

- [ ] **Step 4: Route to admin in `src/app.tsx`** — at the top of `App`, before the target logic, short-circuit when `?admin` is present:

```tsx
// add import
import { AdminPage } from './components/admin/admin-page';
// inside App(), first line of the function body:
const isAdmin = useMemo(() => new URLSearchParams(window.location.search).has('admin'), []);
// and early in the return (wrap the existing <main>):
if (isAdmin) {
  return (
    <main className="min-h-screen w-full flex items-start justify-center p-4 bg-gradient-to-b from-[#ffd9e8] to-[#ff7eb0]">
      <AdminPage />
    </main>
  );
}
```
(Import `useMemo` alongside the existing React imports. Keep the rest of `App` unchanged.)

- [ ] **Step 5: Write `src/components/admin/admin-page.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPage } from './admin-page';

describe('AdminPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('shows the password gate first, then the form after entering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ entries: [] }) }));
    render(<AdminPage />);
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'good' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrer/ }));
    await waitFor(() => expect(screen.getByLabelText('Prénom')).toBeInTheDocument());
  });

  it('creates a link and shows the copyable URL', async () => {
    localStorage.setItem('date.admin.secret', 'good');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [] }) })    // initial list
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'abcDEF12' }) }) // create
      .mockResolvedValue({ ok: true, json: async () => ({ entries: [] }) }));      // refresh
    render(<AdminPage />);
    await waitFor(() => screen.getByLabelText('Prénom'));
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Lou' } });
    fireEvent.click(screen.getByRole('button', { name: /Générer/ }));
    await waitFor(() => expect(screen.getByText(/\/\?id=abcDEF12/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 6: Run → PASS.** `npx vitest run src/components/admin/admin-page.test.tsx`, then `npm test` + `npx tsc -b`.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin src/app.tsx
git commit -m "feat: admin dashboard (create/list/stats/delete) behind ?admin"
```

---

## Task 17: Env migration, docs, deploy, and full gate

**Files:** Modify `README.md`, `.env.local` (local only), remove `src/vite-env.d.ts`'s webhook var

- [ ] **Step 1: Remove the old client webhook typing** — in `src/vite-env.d.ts`, delete the `VITE_DISCORD_WEBHOOK_URL` line from `ImportMetaEnv` (it's no longer used by the client). Leave the rest.

- [ ] **Step 2: Update `.env.local`** (local dev; already gitignored) to the server-side vars:

```bash
DISCORD_WEBHOOK_URL=<your webhook url>
ADMIN_SECRET=<choose a password>
UPSTASH_REDIS_REST_URL=<from Upstash>
UPSTASH_REDIS_REST_TOKEN=<from Upstash>
```

- [ ] **Step 3: Confirm no client code references `VITE_DISCORD_WEBHOOK_URL`**

Run: `grep -rn "VITE_DISCORD_WEBHOOK_URL" src` → expect no matches.

- [ ] **Step 4: Update `README.md`** — add a short "Liens courts (?id) & admin" section documenting: `?id=` links via `?admin` dashboard, the 4 server env vars, that `vercel dev` is needed locally for `/api`, and that the webhook is now server-side. (Write a concise section; keep the existing content and the consent statement.)

- [ ] **Step 5: Full gate**

Run: `npm test` (all pass) · `npx tsc -b` (clean) · `npm run build` (succeeds).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: migrate webhook to server env + document serverless links"
```

- [ ] **Step 7: (manual) Deploy checklist** — on Vercel: add the **Upstash Redis** integration to the project (auto-injects `UPSTASH_REDIS_REST_*`); set `DISCORD_WEBHOOK_URL` and `ADMIN_SECRET` env vars; **remove** the old `VITE_DISCORD_WEBHOOK_URL`; deploy. Then verify: open `/?admin`, create a link, open it (card shows the phrase, Discord pings, visit counter increments), and confirm an existing `/?name=` link still works.

---

## Self-Review (by plan author)

**Spec coverage:**
- §4 architecture / flow → Tasks 9, 11, 14, 15. Resolution order (id › name › cache › fallback) → Task 14.
- §5 data model (entry/stats/index, HINCRBY, limits) → Tasks 6, 7; limits → Task 3.
- §6 endpoints (create/entry/track/list/delete, admin guard, typed track) → Tasks 5, 8, 9.
- §7 frontend (use-entry, resolution, phrase {prenom}, discord→/api/track, admin) → Tasks 10–16.
- §8 sneaky mechanic + fallbacks (404, redis down, name fallback) → Task 14 (sneaky/404/name), Task 11 (error state), Task 15 (loading).
- §9 security (hidden webhook, constant-time secret, typed track, unguessable id, server validation/sanitize) → Tasks 1, 3, 5, 8, and reuse of `sanitize` in Task 4.
- §10 env vars & deploy (VITE_→server, Upstash, vercel dev) → Tasks 1, 17.
- §11 tests → every logic module has TDD; handlers + hooks + admin have tests; §12 order mirrored.
- Backward compat (`?name=` still works, tracking included) → Task 14 test + Task 15 app test.

**Placeholder scan:** none — every code step has complete code. (Task 15 explicitly resolves the tracking-while-loading concern by adding a `ready` param, with the exact code.)

**Type consistency:** `Entry`/`EntryStats`/`EntryWithStats` consistent (Task 7) and mirrored by `AdminEntry` (Task 16) and `RemoteEntry` (Task 11, the public subset `{name,phrase,mode}` returned by `/api/entry`). `TrackEvent` union identical in `messages.ts` (server) and `discord.ts` (client). `notifyX(name, id?)` / `notifyNote(name, note, id?)` signatures consistent across Tasks 12, 13, 15. `Mode`/`MODES` (Task 3) align with `BEHAVIOR_IDS` + `'random'` used in the form (Task 16) and `resolveMode` handling in Task 15.
