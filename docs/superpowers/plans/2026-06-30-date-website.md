# Date Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fun single-page React site to send to Hinge matches: a personalized "veux-tu venir en date avec moi ?" card with an absurd "Non" button (one of 6 behaviors, desktop + touch), a thank-you card, and Discord webhook tracking.

**Architecture:** One page driven by an internal state machine (`asking` → `accepted`). Framework-free pure modules hold all the logic (name resolution, visit/return decision with rate-limit, mode selection, sanitization, behavior math) and are unit-tested. React components/hooks are thin wrappers. Each absurd behavior is an isolated component registered in a registry, so they are built one at a time and the pool stays extensible.

**Tech Stack:** React 18 + Vite 5 + TypeScript + Tailwind CSS 3. Tests: Vitest + jsdom + Testing Library. `canvas-confetti` for confetti. Deployed on Vercel. Discord webhook URL injected via `VITE_DISCORD_WEBHOOK_URL` (inlined into the bundle at build, kept out of git via `.env`).

**Naming conventions (from spec §3bis):** files/folders in `kebab-case`; React component identifiers in `PascalCase`; hooks `use-x.ts` exporting `useX`.

---

## File Structure

```
date-website/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts                 # Vite + Vitest config
├─ tailwind.config.js
├─ postcss.config.js
├─ vercel.json                    # SPA rewrite
├─ .env.example                   # documents VITE_DISCORD_WEBHOOK_URL
├─ src/
│  ├─ main.tsx                    # React root
│  ├─ app.tsx                     # App: state machine + orchestration
│  ├─ index.css                   # Tailwind + meme-card / yes-btn / no-btn styles
│  ├─ vite-env.d.ts               # ImportMetaEnv typing
│  ├─ test-setup.ts               # jest-dom matchers
│  ├─ lib/
│  │  ├─ sanitize.ts              # pure: sanitizeName, sanitizeText
│  │  ├─ person-name.ts           # pure: resolvePersonName + keys/types
│  │  ├─ visit-tracking.ts        # pure: decideVisitEvent + keys/consts
│  │  ├─ mode.ts                  # pure: resolveMode, randomBehaviorId
│  │  ├─ discord.ts               # 5 fire-and-forget webhook fns
│  │  └─ confetti.ts              # firePinkConfetti
│  ├─ hooks/
│  │  ├─ use-person-name.ts       # usePersonName
│  │  ├─ use-visit-tracking.ts    # useVisitTracking
│  │  └─ use-visitor-mode.ts      # useVisitorMode (mode + isTouch)
│  ├─ components/
│  │  ├─ buttons.tsx              # YesButton, NoButton (forwardRef)
│  │  ├─ question-card.tsx        # QuestionCard
│  │  └─ thank-you-card.tsx       # ThankYouCard
│  └─ behaviors/
│     ├─ ids.ts                   # BEHAVIOR_IDS, BehaviorId
│     ├─ behavior-types.ts        # BehaviorProps, BehaviorComponent, BehaviorEntry
│     ├─ helpers.ts               # pure math: growScales, randomPosition, repelOffset, nextGuiltIndex, computeSadness, GUILT_TEXTS
│     ├─ index.ts                 # BEHAVIORS registry
│     ├─ grow-shrink.tsx          # GrowShrink
│     ├─ flee.tsx                 # Flee
│     ├─ repel.tsx                # Repel
│     ├─ gravity.tsx              # Gravity
│     ├─ guilt.tsx                # Guilt
│     └─ sad.tsx                  # Sad
```

Tests are colocated next to each module as `*.test.ts(x)`.

---

## Task 1: Project scaffolding (Vite + React + TS + Tailwind + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.env.example`, `vercel.json`
- Create: `src/main.tsx`, `src/app.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/test-setup.ts`

`npm create vite` is interactive and not usable here — create the files directly, then install.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "date-website",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "canvas-confetti": "^1.9.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.1",
    "@types/canvas-confetti": "^1.6.4",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.45",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.4",
    "vite": "^5.4.3",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`** (includes Vitest config)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 5: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 6: Create `postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 7: Create `index.html`** (loads Poppins from Google Fonts)

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <title>Une question pour toi…</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create `src/index.css`** (Tailwind + the validated Option A styles)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    font-family: 'Poppins', system-ui, sans-serif;
  }
}

@layer components {
  .meme-card {
    @apply bg-white rounded-3xl p-7 text-center;
    border: 3px solid #2b061e;
    box-shadow: 7px 7px 0 #2b061e;
  }
  .yes-btn {
    @apply text-white font-extrabold rounded-2xl px-6 py-3 text-lg;
    background: #ff2d78;
    border: 3px solid #2b061e;
    box-shadow: 3px 3px 0 #2b061e;
  }
  .no-btn {
    @apply bg-white font-bold rounded-xl px-3 py-2 text-sm;
    color: #2b061e;
    border: 2px solid #2b061e;
  }
}
```

- [ ] **Step 9: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_WEBHOOK_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 10: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 11: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 12: Create a temporary `src/app.tsx`** (placeholder, replaced in Task 11)

```tsx
export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#ffd9e8] to-[#ff7eb0]">
      <div className="meme-card max-w-sm">
        <h1 className="text-2xl font-extrabold text-[#2b061e]">Date website 🎀</h1>
      </div>
    </main>
  );
}
```

- [ ] **Step 13: Create `.env.example`**

```bash
# Discord webhook URL (Channel Settings → Integrations → Webhooks → Copy URL).
# Copy this file to .env.local and fill the value. The value is inlined into the
# client bundle at build time (assumed public — a webhook only writes to your channel).
VITE_DISCORD_WEBHOOK_URL=
```

- [ ] **Step 14: Create `vercel.json`** (SPA + Vite framework)

```json
{
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 15: Install dependencies**

Run: `npm install`
Expected: completes without error, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 16: Verify dev build and test runner boot**

Run: `npm run build`
Expected: `tsc -b` passes and Vite writes `dist/` with no errors.

Run: `npm test`
Expected: Vitest runs and reports `No test files found` (exit 0) — that's fine, none exist yet.

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

## Task 2: `sanitize` (pure)

Neutralizes Discord mentions/markdown and truncates user-controlled text before it goes into a webhook message.

**Files:**
- Create: `src/lib/sanitize.ts`
- Test: `src/lib/sanitize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeName } from './sanitize';

describe('sanitizeText', () => {
  it('strips backticks and control chars', () => {
    expect(sanitizeText('a`b\nc')).toBe('a b c');
  });
  it('neutralizes @ to prevent mentions', () => {
    expect(sanitizeText('@everyone')).toBe('@​everyone');
  });
  it('truncates to max length', () => {
    expect(sanitizeText('abcdef', 3)).toBe('abc');
  });
  it('trims surrounding whitespace', () => {
    expect(sanitizeText('  hi  ')).toBe('hi');
  });
});

describe('sanitizeName', () => {
  it('cleans and limits a name', () => {
    expect(sanitizeName('  Camille ')).toBe('Camille');
  });
  it('falls back to "Toi" when empty after cleaning', () => {
    expect(sanitizeName('```')).toBe('Toi');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sanitize.test.ts`
Expected: FAIL — `sanitize` module/exports not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sanitize.ts

/** Remove backticks + control chars, neutralize @ mentions, trim, truncate. */
export function sanitizeText(raw: string, max = 100): string {
  return raw
    .replace(/[` -]/g, ' ')
    .replace(/@/g, '@​')
    .trim()
    .slice(0, max);
}

/** Sanitize a display/name string; fall back to "Toi" if nothing usable remains. */
export function sanitizeName(raw: string): string {
  const cleaned = sanitizeText(raw, 40);
  return cleaned || 'Toi';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sanitize.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sanitize.ts src/lib/sanitize.test.ts
git commit -m "feat: add discord text/name sanitizer"
```

---

## Task 3: `person-name` (pure name resolution)

Implements spec §6: URL param wins and is persisted; storage-only means the name was removed from the URL (sneaky); nothing means fallback "Toi".

**Files:**
- Create: `src/lib/person-name.ts`
- Test: `src/lib/person-name.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolvePersonName } from './person-name';

describe('resolvePersonName', () => {
  it('uses the URL name and is not sneaky', () => {
    expect(resolvePersonName('Camille', null)).toEqual({ name: 'Camille', source: 'url', sneaky: false });
  });
  it('prefers URL over storage', () => {
    expect(resolvePersonName('Lea', 'Old')).toEqual({ name: 'Lea', source: 'url', sneaky: false });
  });
  it('falls back to storage and flags sneaky when URL is empty', () => {
    expect(resolvePersonName(null, 'Camille')).toEqual({ name: 'Camille', source: 'storage', sneaky: true });
  });
  it('treats a blank URL param as absent', () => {
    expect(resolvePersonName('   ', 'Camille')).toEqual({ name: 'Camille', source: 'storage', sneaky: true });
  });
  it('returns the "Toi" fallback when nothing is available', () => {
    expect(resolvePersonName(null, null)).toEqual({ name: 'Toi', source: 'fallback', sneaky: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/person-name.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/person-name.ts
import { sanitizeName } from './sanitize';

export const NAME_STORAGE_KEY = 'date.name';

export type NameSource = 'url' | 'storage' | 'fallback';

export interface ResolvedName {
  name: string;
  source: NameSource;
  sneaky: boolean;
}

export function resolvePersonName(rawUrlName: string | null, stored: string | null): ResolvedName {
  if (rawUrlName && rawUrlName.trim()) {
    return { name: sanitizeName(rawUrlName), source: 'url', sneaky: false };
  }
  if (stored && stored.trim()) {
    return { name: sanitizeName(stored), source: 'storage', sneaky: true };
  }
  return { name: 'Toi', source: 'fallback', sneaky: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/person-name.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/person-name.ts src/lib/person-name.test.ts
git commit -m "feat: add person-name resolution logic"
```

---

## Task 4: `visit-tracking` (pure visit/return decision + rate-limit)

Implements spec §8: first load → `visit`; later loads → `return`, but rate-limited to max 10 within a rolling 30-minute window, else no event.

**Files:**
- Create: `src/lib/visit-tracking.ts`
- Test: `src/lib/visit-tracking.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { decideVisitEvent, RETURN_WINDOW_MS } from './visit-tracking';

describe('decideVisitEvent', () => {
  it('returns a "visit" event on first ever load', () => {
    const d = decideVisitEvent({ visited: false, returns: [], now: 1000 });
    expect(d.event).toBe('visit');
    expect(d.nextVisited).toBe(true);
    expect(d.nextReturns).toEqual([]);
  });

  it('returns a "return" event and records the timestamp when already visited', () => {
    const d = decideVisitEvent({ visited: true, returns: [], now: 5000 });
    expect(d.event).toBe('return');
    expect(d.nextReturns).toEqual([5000]);
  });

  it('drops timestamps older than the 30-minute window', () => {
    const now = 10_000_000;
    const old = now - RETURN_WINDOW_MS - 1;
    const d = decideVisitEvent({ visited: true, returns: [old], now });
    expect(d.nextReturns).toEqual([now]); // old pruned, new added
  });

  it('suppresses the event after 10 returns inside the window', () => {
    const now = 1_000_000;
    const returns = Array.from({ length: 10 }, (_, i) => now - i * 1000); // 10 recent
    const d = decideVisitEvent({ visited: true, returns, now });
    expect(d.event).toBeNull();
    expect(d.nextReturns).toHaveLength(10); // unchanged count, no new push
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/visit-tracking.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/visit-tracking.ts

export const VISITED_KEY = 'date.visited';
export const RETURNS_KEY = 'date.returns';
export const RETURN_WINDOW_MS = 30 * 60 * 1000;
export const RETURN_MAX = 10;

export type VisitEvent = 'visit' | 'return' | null;

export interface VisitDecision {
  event: VisitEvent;
  nextVisited: boolean;
  nextReturns: number[];
}

export function decideVisitEvent(args: { visited: boolean; returns: number[]; now: number }): VisitDecision {
  const { visited, returns, now } = args;

  if (!visited) {
    return { event: 'visit', nextVisited: true, nextReturns: returns };
  }

  const recent = returns.filter((t) => now - t < RETURN_WINDOW_MS);
  if (recent.length < RETURN_MAX) {
    return { event: 'return', nextVisited: true, nextReturns: [...recent, now] };
  }
  return { event: null, nextVisited: true, nextReturns: recent };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/visit-tracking.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/visit-tracking.ts src/lib/visit-tracking.test.ts
git commit -m "feat: add visit/return decision with rolling rate-limit"
```

---

## Task 5: behavior ids + `mode` resolution (pure)

The list of behavior ids is the single source of truth for both the registry and `?mode=` validation. Keep it in its own file to avoid circular imports.

**Files:**
- Create: `src/behaviors/ids.ts`
- Create: `src/lib/mode.ts`
- Test: `src/lib/mode.test.ts`

- [ ] **Step 1: Create `src/behaviors/ids.ts`**

```ts
// src/behaviors/ids.ts
export const BEHAVIOR_IDS = ['grow', 'flee', 'repel', 'gravity', 'guilt', 'sad'] as const;
export type BehaviorId = (typeof BEHAVIOR_IDS)[number];
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveMode, randomBehaviorId } from './mode';

describe('resolveMode', () => {
  it('uses a valid ?mode= value', () => {
    expect(resolveMode('flee', () => 'grow')).toBe('flee');
  });
  it('ignores an unknown ?mode= and uses the picker', () => {
    expect(resolveMode('banana', () => 'sad')).toBe('sad');
  });
  it('uses the picker when ?mode= is absent', () => {
    expect(resolveMode(null, () => 'repel')).toBe('repel');
  });
});

describe('randomBehaviorId', () => {
  it('maps rand=0 to the first id', () => {
    expect(randomBehaviorId(0)).toBe('grow');
  });
  it('maps rand close to 1 to the last id', () => {
    expect(randomBehaviorId(0.999)).toBe('sad');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/mode.test.ts`
Expected: FAIL — `mode` module not found.

- [ ] **Step 4: Write minimal implementation**

```ts
// src/lib/mode.ts
import { BEHAVIOR_IDS, type BehaviorId } from '../behaviors/ids';

export function resolveMode(rawMode: string | null, pick: () => BehaviorId): BehaviorId {
  if (rawMode && (BEHAVIOR_IDS as readonly string[]).includes(rawMode)) {
    return rawMode as BehaviorId;
  }
  return pick();
}

export function randomBehaviorId(rand: number = Math.random()): BehaviorId {
  const index = Math.min(BEHAVIOR_IDS.length - 1, Math.floor(rand * BEHAVIOR_IDS.length));
  return BEHAVIOR_IDS[index];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/mode.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/behaviors/ids.ts src/lib/mode.ts src/lib/mode.test.ts
git commit -m "feat: add behavior ids and ?mode= resolution"
```

---

## Task 6: `discord` (5 fire-and-forget webhooks)

Implements spec §8. URL read lazily from env so tests can stub it. `allowed_mentions: { parse: [] }` blocks mass mentions defensively (belt-and-suspenders with `sanitizeText`).

**Files:**
- Create: `src/lib/discord.ts`
- Test: `src/lib/discord.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/discord.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/discord.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/discord.ts src/lib/discord.test.ts
git commit -m "feat: add discord fire-and-forget webhooks"
```

---

## Task 7: `confetti`

`canvas-confetti` doesn't run meaningfully in jsdom; this module is verified manually. Wrapped in try/catch so it never breaks the UX.

**Files:**
- Create: `src/lib/confetti.ts`

- [ ] **Step 1: Write the implementation**

```ts
// src/lib/confetti.ts
import confetti from 'canvas-confetti';

/** Pink confetti burst — used on Oui and on note submit. */
export function firePinkConfetti(): void {
  try {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff2d78', '#ff7eb0', '#ffd9e8', '#ffffff'],
    });
  } catch {
    /* no-op if canvas is unavailable */
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/confetti.ts
git commit -m "feat: add pink confetti helper"
```

---

## Task 8: hooks (`use-person-name`, `use-visitor-mode`, `use-visit-tracking`)

Thin wrappers binding the pure modules to the browser (URL, localStorage, matchMedia) and firing webhooks once on mount.

**Files:**
- Create: `src/hooks/use-person-name.ts`
- Create: `src/hooks/use-visitor-mode.ts`
- Create: `src/hooks/use-visit-tracking.ts`
- Test: `src/hooks/use-visit-tracking.test.ts`

- [ ] **Step 1: Create `src/hooks/use-person-name.ts`**

```ts
import { useMemo } from 'react';
import { resolvePersonName, NAME_STORAGE_KEY, type ResolvedName } from '../lib/person-name';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function usePersonName(): ResolvedName {
  return useMemo(() => {
    const url = new URLSearchParams(window.location.search).get('name');
    const stored = safeGet(NAME_STORAGE_KEY);
    const resolved = resolvePersonName(url, stored);
    if (resolved.source === 'url') {
      safeSet(NAME_STORAGE_KEY, resolved.name);
    }
    return resolved;
  }, []);
}
```

- [ ] **Step 2: Create `src/hooks/use-visitor-mode.ts`**

```ts
import { useState } from 'react';
import { resolveMode, randomBehaviorId } from '../lib/mode';
import type { BehaviorId } from '../behaviors/ids';

export interface VisitorMode {
  mode: BehaviorId;
  isTouch: boolean;
}

export function useVisitorMode(): VisitorMode {
  const [state] = useState<VisitorMode>(() => {
    const raw = new URLSearchParams(window.location.search).get('mode');
    const mode = resolveMode(raw, () => randomBehaviorId());
    const isTouch =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
        : false;
    return { mode, isTouch };
  });
  return state;
}
```

- [ ] **Step 3: Create `src/hooks/use-visit-tracking.ts`**

```ts
import { useEffect, useRef } from 'react';
import { decideVisitEvent, VISITED_KEY, RETURNS_KEY } from '../lib/visit-tracking';
import { notifyVisit, notifyReturn, notifySneaky } from '../lib/discord';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function parseReturns(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

/** Fires the arrival webhooks exactly once on mount. */
export function useVisitTracking(name: string, sneaky: boolean): void {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return; // guard against StrictMode double-invoke
    fired.current = true;

    const visited = safeGet(VISITED_KEY) === '1';
    const returns = parseReturns(safeGet(RETURNS_KEY));
    const decision = decideVisitEvent({ visited, returns, now: Date.now() });

    safeSet(VISITED_KEY, '1');
    safeSet(RETURNS_KEY, JSON.stringify(decision.nextReturns));

    if (decision.event === 'visit') notifyVisit(name);
    else if (decision.event === 'return') notifyReturn(name);

    if (sneaky) notifySneaky(name);
  }, [name, sneaky]);
}
```

- [ ] **Step 4: Write a failing integration test for the tracking hook**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useVisitTracking } from './use-visit-tracking';
import * as discord from '../lib/discord';

function Harness({ name, sneaky }: { name: string; sneaky: boolean }) {
  useVisitTracking(name, sneaky);
  return null;
}

describe('useVisitTracking', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(discord, 'notifyVisit').mockResolvedValue();
    vi.spyOn(discord, 'notifyReturn').mockResolvedValue();
    vi.spyOn(discord, 'notifySneaky').mockResolvedValue();
  });
  afterEach(() => vi.restoreAllMocks());

  it('fires a visit on first mount and a return on the next', () => {
    render(<Harness name="Camille" sneaky={false} />);
    expect(discord.notifyVisit).toHaveBeenCalledWith('Camille');
    expect(discord.notifyReturn).not.toHaveBeenCalled();

    render(<Harness name="Camille" sneaky={false} />);
    expect(discord.notifyReturn).toHaveBeenCalledWith('Camille');
  });

  it('fires the sneaky webhook when sneaky is true', () => {
    render(<Harness name="Camille" sneaky={true} />);
    expect(discord.notifySneaky).toHaveBeenCalledWith('Camille');
  });
});
```

Note: this test renders without `<StrictMode>`, so the effect runs once per render and the `fired` ref guard is exercised in production via StrictMode separately.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/hooks/use-visit-tracking.test.tsx`
Expected: PASS (2 tests). (If the file is named `.tsx`, rename the test import path accordingly.)

> If you see "No test files found", confirm the file is named `use-visit-tracking.test.tsx` (JSX needs the `.tsx` extension).

- [ ] **Step 6: Commit**

```bash
git add src/hooks
git commit -m "feat: add person-name, visitor-mode, and visit-tracking hooks"
```

---

## Task 9: shared buttons (`YesButton`, `NoButton`)

Reusable presentational buttons every behavior composes. Both `forwardRef` so behaviors can measure their positions (repel/sad).

**Files:**
- Create: `src/components/buttons.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
// src/components/buttons.tsx
import { forwardRef, type CSSProperties, type TouchEvent } from 'react';

interface YesButtonProps {
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}
export const YesButton = forwardRef<HTMLButtonElement, YesButtonProps>(function YesButton(
  { onClick, style, className = '' },
  ref,
) {
  return (
    <button ref={ref} type="button" className={`yes-btn ${className}`} style={style} onClick={onClick}>
      Oui&nbsp;💕
    </button>
  );
});

interface NoButtonProps {
  text?: string;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onTouchStart?: (e: TouchEvent<HTMLButtonElement>) => void;
}
export const NoButton = forwardRef<HTMLButtonElement, NoButtonProps>(function NoButton(
  { text = 'Non', style, className = '', onClick, onMouseEnter, onTouchStart },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`no-btn ${className}`}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
    >
      {text}
    </button>
  );
});
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/buttons.tsx
git commit -m "feat: add shared Yes/No buttons"
```

---

## Task 10: behavior math helpers + types (pure)

All behavior math lives in one tested module so the behavior components stay thin.

**Files:**
- Create: `src/behaviors/behavior-types.ts`
- Create: `src/behaviors/helpers.ts`
- Test: `src/behaviors/helpers.test.ts`

- [ ] **Step 1: Create `src/behaviors/behavior-types.ts`**

```ts
// src/behaviors/behavior-types.ts
import type { FC } from 'react';
import type { BehaviorId } from './ids';

export interface BehaviorProps {
  onYes: () => void;
  isTouch: boolean;
}

export type BehaviorComponent = FC<BehaviorProps>;

export interface BehaviorEntry {
  id: BehaviorId;
  label: string;
  Component: BehaviorComponent;
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  growScales,
  GUILT_TEXTS,
  nextGuiltIndex,
  randomPosition,
  repelOffset,
  computeSadness,
} from './helpers';

describe('growScales', () => {
  it('is neutral at zero refusals', () => {
    expect(growScales(0)).toEqual({ yes: 1, no: 1 });
  });
  it('grows yes and shrinks no with each refusal', () => {
    const s = growScales(3);
    expect(s.yes).toBeGreaterThan(1);
    expect(s.no).toBeLessThan(1);
  });
  it('never shrinks no below the floor', () => {
    expect(growScales(100).no).toBeGreaterThanOrEqual(0.15);
  });
});

describe('nextGuiltIndex', () => {
  it('advances toward the last index and clamps there', () => {
    expect(nextGuiltIndex(0)).toBe(1);
    expect(nextGuiltIndex(GUILT_TEXTS.length - 1)).toBe(GUILT_TEXTS.length - 1);
  });
});

describe('randomPosition', () => {
  it('stays within the viewport minus the button size', () => {
    const p = randomPosition(1000, 800, 80, () => 0.5);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(1000 - 80);
    expect(p.y).toBeLessThanOrEqual(800 - 80);
  });
});

describe('repelOffset', () => {
  it('returns no push when the pointer is far', () => {
    expect(repelOffset({ x: 0, y: 0 }, { x: 500, y: 500 })).toEqual({ dx: 0, dy: 0 });
  });
  it('pushes away from a close pointer', () => {
    const o = repelOffset({ x: 100, y: 100 }, { x: 90, y: 100 });
    expect(o.dx).toBeGreaterThan(0); // button is to the right of pointer → pushed further right
  });
});

describe('computeSadness', () => {
  it('is high near the No button', () => {
    expect(computeSadness(0, 1000)).toBeGreaterThan(0.8);
  });
  it('is reduced near the Yes button', () => {
    expect(computeSadness(0, 0)).toBeLessThan(computeSadness(0, 1000));
  });
  it('is clamped between 0 and 1', () => {
    const v = computeSadness(0, 1000);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/behaviors/helpers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write minimal implementation**

```ts
// src/behaviors/helpers.ts

export function growScales(noCount: number): { yes: number; no: number } {
  return {
    yes: 1 + noCount * 0.4,
    no: Math.max(0.15, 1 - noCount * 0.18),
  };
}

export const GUILT_TEXTS = ['Non', "T'es sûre ?", 'Réfléchis bien…', 'Tu me brises le cœur 💔', 'Aïe.'];

export function nextGuiltIndex(i: number, len: number = GUILT_TEXTS.length): number {
  return Math.min(i + 1, len - 1);
}

export function randomPosition(
  vw: number,
  vh: number,
  size: number,
  rand: () => number = Math.random,
): { x: number; y: number } {
  const margin = 8;
  const maxX = Math.max(margin, vw - size - margin);
  const maxY = Math.max(margin, vh - size - margin);
  return {
    x: margin + rand() * (maxX - margin),
    y: margin + rand() * (maxY - margin),
  };
}

export function repelOffset(
  btn: { x: number; y: number },
  ptr: { x: number; y: number },
  radius = 120,
  strength = 1.4,
): { dx: number; dy: number } {
  const dx = btn.x - ptr.x;
  const dy = btn.y - ptr.y;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist > radius) return { dx: 0, dy: 0 };
  const push = (radius - dist) * strength;
  return { dx: (dx / dist) * push, dy: (dy / dist) * push };
}

export function computeSadness(distToNo: number, distToYes: number, maxDist = 300): number {
  const near = Math.max(0, 1 - distToNo / maxDist);
  const relief = Math.max(0, 1 - distToYes / maxDist);
  return Math.max(0, Math.min(1, near - relief * 0.7));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/behaviors/helpers.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/behaviors/behavior-types.ts src/behaviors/helpers.ts src/behaviors/helpers.test.ts
git commit -m "feat: add behavior math helpers and types"
```

---

## Task 11: App state machine + QuestionCard shell + ThankYouCard (with one behavior)

Wire the full happy path end-to-end using only the `grow` behavior for now. Later tasks add the other five and the registry switch. This task replaces the placeholder `app.tsx`.

**Files:**
- Create: `src/behaviors/grow-shrink.tsx`
- Create: `src/components/question-card.tsx`
- Create: `src/components/thank-you-card.tsx`
- Modify: `src/app.tsx` (replace placeholder)
- Test: `src/app.test.tsx`

- [ ] **Step 1: Create `src/behaviors/grow-shrink.tsx`** (spec §7 #1)

```tsx
// src/behaviors/grow-shrink.tsx
import { useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { growScales } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function GrowShrink({ onYes }: BehaviorProps) {
  const [count, setCount] = useState(0);
  const { yes, no } = growScales(count);
  return (
    <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
      <YesButton onClick={onYes} style={{ transform: `scale(${yes})`, transformOrigin: 'center' }} />
      <NoButton
        style={{ transform: `scale(${no})` }}
        onClick={() => setCount((c) => c + 1)}
        onTouchStart={(e) => {
          e.preventDefault();
          setCount((c) => c + 1);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/question-card.tsx`**

For now it renders `GrowShrink` directly; Task 17 swaps in the registry.

```tsx
// src/components/question-card.tsx
import GrowShrink from '../behaviors/grow-shrink';
import type { BehaviorId } from '../behaviors/ids';

interface QuestionCardProps {
  name: string;
  mode: BehaviorId;
  isTouch: boolean;
  onYes: () => void;
}

export function QuestionCard({ name, isTouch, onYes }: QuestionCardProps) {
  return (
    <div className="meme-card max-w-sm w-full mx-auto relative z-10">
      <div className="text-4xl">💖</div>
      <h1 className="text-2xl font-extrabold text-[#2b061e] mt-2 leading-tight">
        {name}, veux-tu venir en date avec moi&nbsp;?
      </h1>
      <GrowShrink onYes={onYes} isTouch={isTouch} />
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/thank-you-card.tsx`** (spec §10)

```tsx
// src/components/thank-you-card.tsx
import { useState } from 'react';

interface ThankYouCardProps {
  name: string;
  onSend: (note: string) => void;
}

export function ThankYouCard({ name, onSend }: ThankYouCardProps) {
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const submit = () => {
    onSend(note.trim());
    setSent(true);
  };

  if (sent) {
    return (
      <div className="meme-card max-w-sm w-full mx-auto relative z-10">
        <div className="text-4xl">✨</div>
        <h1 className="text-2xl font-extrabold text-[#2b061e] mt-2">C'est noté, à très vite&nbsp;!</h1>
      </div>
    );
  }

  return (
    <div className="meme-card max-w-sm w-full mx-auto relative z-10">
      <div className="text-4xl">🥳</div>
      <h1 className="text-2xl font-extrabold text-[#2b061e] mt-2 leading-tight">
        Yesss {name}, tu viens de faire ma journée&nbsp;!
      </h1>
      <input
        className="w-full mt-4 rounded-xl px-3 py-2 outline-none"
        style={{ border: '2px solid #2b061e' }}
        placeholder="Laisse-moi un petit mot (ton insta 👀)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button type="button" className="yes-btn mt-4 w-full" onClick={submit}>
        Envoyer
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Replace `src/app.tsx`**

```tsx
// src/app.tsx
import { useState } from 'react';
import { usePersonName } from './hooks/use-person-name';
import { useVisitorMode } from './hooks/use-visitor-mode';
import { useVisitTracking } from './hooks/use-visit-tracking';
import { QuestionCard } from './components/question-card';
import { ThankYouCard } from './components/thank-you-card';
import { notifyAccepted, notifyNote } from './lib/discord';
import { firePinkConfetti } from './lib/confetti';

type Phase = 'asking' | 'accepted';

export default function App() {
  const { name, sneaky } = usePersonName();
  const { mode, isTouch } = useVisitorMode();
  useVisitTracking(name, sneaky);

  const [phase, setPhase] = useState<Phase>('asking');

  const handleYes = () => {
    notifyAccepted(name); // fire immediately (spec §8 ordering), independent of the note
    firePinkConfetti();
    setPhase('accepted');
  };

  const handleNote = (note: string) => {
    if (note) notifyNote(name, note);
    firePinkConfetti();
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-[#ffd9e8] to-[#ff7eb0]">
      {phase === 'asking' ? (
        <QuestionCard name={name} mode={mode} isTouch={isTouch} onYes={handleYes} />
      ) : (
        <ThankYouCard name={name} onSend={handleNote} />
      )}
    </main>
  );
}
```

- [ ] **Step 5: Write the failing end-to-end test**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './app';
import * as discord from './lib/discord';
import * as confettiLib from './lib/confetti';

describe('App happy path', () => {
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
    expect(discord.notifyAccepted).toHaveBeenCalledWith('Camille');
    expect(confettiLib.firePinkConfetti).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/petit mot/), { target: { value: '@camille_insta' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer/ }));
    expect(discord.notifyNote).toHaveBeenCalledWith('Camille', '@camille_insta');
    expect(screen.getByText(/C'est noté/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/app.test.tsx`
Expected: PASS (1 test). Run full suite: `npm test` → all green.

- [ ] **Step 7: Manual smoke check**

Run: `npm run dev`, open `http://localhost:5173/?name=Camille&mode=grow`.
Expected: card shows "Camille, veux-tu venir en date avec moi ?"; clicking Non grows Oui / shrinks Non; clicking Oui shows the thank-you card with a working input + Envoyer.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire end-to-end flow with grow behavior"
```

---

## Tasks 12–16: the remaining five behaviors (one per task)

Each behavior is a self-contained component using the shared buttons + tested helpers, handling **both** mouse and touch (spec §9). After each, verify type-check + manual feel via `?mode=<id>`, then commit. The registry switch happens in Task 17, so to preview a new behavior before then, temporarily import it in `question-card.tsx` (or just wait for Task 17).

### Task 12: `flee` (spec §7 #2)

**Files:** Create `src/behaviors/flee.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
// src/behaviors/flee.tsx
import { useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { randomPosition } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function Flee({ onYes }: BehaviorProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const jump = () => {
    setPos(randomPosition(window.innerWidth, window.innerHeight, 90));
  };

  const noStyle = pos
    ? {
        position: 'fixed' as const,
        left: pos.x,
        top: pos.y,
        transition: 'left .15s ease, top .15s ease',
        zIndex: 50,
      }
    : undefined;

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        style={noStyle}
        onMouseEnter={jump}
        onTouchStart={(e) => {
          e.preventDefault(); // block the tap so it can't be clicked
          jump();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check** — Run: `npx tsc -b` → no errors.
- [ ] **Step 3: Commit** — `git add src/behaviors/flee.tsx && git commit -m "feat: add flee behavior"`

### Task 13: `repel` (spec §7 #3)

**Files:** Create `src/behaviors/repel.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
// src/behaviors/repel.tsx
import { useEffect, useRef, useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { repelOffset } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function Repel({ onYes }: BehaviorProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });

  useEffect(() => {
    const handle = (x: number, y: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const { dx, dy } = repelOffset(center, { x, y });
      if (dx || dy) setOffset((o) => ({ dx: o.dx + dx, dy: o.dy + dy }));
    };
    const onMouse = (e: MouseEvent) => handle(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) handle(t.clientX, t.clientY);
    };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        ref={ref}
        style={{ transform: `translate(${offset.dx}px, ${offset.dy}px)`, transition: 'transform .12s ease-out' }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check** — Run: `npx tsc -b` → no errors.
- [ ] **Step 3: Commit** — `git add src/behaviors/repel.tsx && git commit -m "feat: add repel behavior"`

### Task 14: `gravity` (spec §7 #4)

**Files:** Create `src/behaviors/gravity.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
// src/behaviors/gravity.tsx
import { useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import type { BehaviorProps } from './behavior-types';

export default function Gravity({ onYes }: BehaviorProps) {
  const [fallen, setFallen] = useState(false);
  const drop = () => setFallen(true);

  const noStyle = fallen
    ? {
        position: 'fixed' as const,
        left: '50%',
        top: window.innerHeight - 70,
        transform: 'translateX(-50%)',
        transition: 'top .8s cubic-bezier(.5, 1.8, .6, 1)', // overshoot ≈ bounce
        zIndex: 50,
      }
    : undefined;

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        style={noStyle}
        onMouseEnter={drop}
        onTouchStart={(e) => {
          e.preventDefault();
          drop();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check** — Run: `npx tsc -b` → no errors.
- [ ] **Step 3: Commit** — `git add src/behaviors/gravity.tsx && git commit -m "feat: add gravity behavior"`

### Task 15: `guilt` (spec §7 #5)

**Files:** Create `src/behaviors/guilt.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
// src/behaviors/guilt.tsx
import { useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { GUILT_TEXTS, nextGuiltIndex } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function Guilt({ onYes }: BehaviorProps) {
  const [i, setI] = useState(0);
  const advance = () => setI((v) => nextGuiltIndex(v));

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        text={GUILT_TEXTS[i]}
        onMouseEnter={advance}
        onClick={advance}
        onTouchStart={(e) => {
          e.preventDefault();
          advance();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check** — Run: `npx tsc -b` → no errors.
- [ ] **Step 3: Commit** — `git add src/behaviors/guilt.tsx && git commit -m "feat: add guilt behavior"`

### Task 16: `sad` (spec §7 #6)

**Files:** Create `src/behaviors/sad.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
// src/behaviors/sad.tsx
import { useEffect, useRef, useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { computeSadness } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function Sad({ onYes }: BehaviorProps) {
  const noRef = useRef<HTMLButtonElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const [sadness, setSadness] = useState(0);

  useEffect(() => {
    const distTo = (el: HTMLElement | null, x: number, y: number) => {
      if (!el) return Infinity;
      const r = el.getBoundingClientRect();
      return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    };
    const handle = (x: number, y: number) => {
      setSadness(computeSadness(distTo(noRef.current, x, y), distTo(yesRef.current, x, y)));
    };
    const onMouse = (e: MouseEvent) => handle(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) handle(t.clientX, t.clientY);
    };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center text-6xl"
        style={{ background: `rgba(10, 5, 15, ${sadness * 0.6})`, transition: 'background .2s ease' }}
      >
        <span style={{ opacity: sadness }}>😢💧😭</span>
      </div>
      <div className="flex items-center justify-center gap-3 mt-6 relative z-10">
        <YesButton ref={yesRef} onClick={onYes} />
        <NoButton ref={noRef} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check** — Run: `npx tsc -b` → no errors.
- [ ] **Step 3: Commit** — `git add src/behaviors/sad.tsx && git commit -m "feat: add sad-mood behavior"`

---

## Task 17: behavior registry + wire it into QuestionCard

Replace the hard-coded `GrowShrink` import with the registry keyed by `mode`. This activates the random pick and `?mode=` override across all six behaviors.

**Files:**
- Create: `src/behaviors/index.ts`
- Modify: `src/components/question-card.tsx`
- Test: `src/behaviors/index.test.ts`

- [ ] **Step 1: Create `src/behaviors/index.ts`**

```ts
// src/behaviors/index.ts
import type { BehaviorEntry } from './behavior-types';
import { BEHAVIOR_IDS, type BehaviorId } from './ids';
import GrowShrink from './grow-shrink';
import Flee from './flee';
import Repel from './repel';
import Gravity from './gravity';
import Guilt from './guilt';
import Sad from './sad';

export const BEHAVIORS: Record<BehaviorId, BehaviorEntry> = {
  grow: { id: 'grow', label: 'Grow/Shrink', Component: GrowShrink },
  flee: { id: 'flee', label: 'Fuyard', Component: Flee },
  repel: { id: 'repel', label: 'Aimant inversé', Component: Repel },
  gravity: { id: 'gravity', label: 'Gravité', Component: Gravity },
  guilt: { id: 'guilt', label: 'Culpabilisateur', Component: Guilt },
  sad: { id: 'sad', label: 'Ambiance triste', Component: Sad },
};

export { BEHAVIOR_IDS };
```

- [ ] **Step 2: Write the failing test** (guards that every id has a registered component)

```ts
import { describe, it, expect } from 'vitest';
import { BEHAVIORS } from './index';
import { BEHAVIOR_IDS } from './ids';

describe('behavior registry', () => {
  it('registers exactly one entry per behavior id', () => {
    for (const id of BEHAVIOR_IDS) {
      expect(BEHAVIORS[id]).toBeDefined();
      expect(BEHAVIORS[id].id).toBe(id);
      expect(typeof BEHAVIORS[id].Component).toBe('function');
    }
    expect(Object.keys(BEHAVIORS)).toHaveLength(BEHAVIOR_IDS.length);
  });
});
```

- [ ] **Step 3: Run test to verify it fails, then passes after Step 1 exists**

Run: `npx vitest run src/behaviors/index.test.ts`
Expected: PASS (registry already created in Step 1).

- [ ] **Step 4: Modify `src/components/question-card.tsx` to use the registry**

```tsx
// src/components/question-card.tsx
import { BEHAVIORS } from '../behaviors';
import type { BehaviorId } from '../behaviors/ids';

interface QuestionCardProps {
  name: string;
  mode: BehaviorId;
  isTouch: boolean;
  onYes: () => void;
}

export function QuestionCard({ name, mode, isTouch, onYes }: QuestionCardProps) {
  const Behavior = BEHAVIORS[mode].Component;
  return (
    <div className="meme-card max-w-sm w-full mx-auto relative z-10">
      <div className="text-4xl">💖</div>
      <h1 className="text-2xl font-extrabold text-[#2b061e] mt-2 leading-tight">
        {name}, veux-tu venir en date avec moi&nbsp;?
      </h1>
      <Behavior onYes={onYes} isTouch={isTouch} />
    </div>
  );
}
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests PASS (the `app.test.tsx` happy path still uses `?mode=grow`).

- [ ] **Step 6: Manual check of every mode**

Run: `npm run dev`, then visit each: `?name=Test&mode=grow`, `&mode=flee`, `&mode=repel`, `&mode=gravity`, `&mode=guilt`, `&mode=sad`.
Expected: each behaves per spec §7; `?name=Test` with no `mode` picks one at random on each fresh load.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: register behaviors and drive QuestionCard by mode"
```

---

## Task 18: Discord setup, env, and live verification

Connect a real webhook and confirm all five messages land in the channel, in order.

**Files:**
- Create: `.env.local` (gitignored — already covered by `.gitignore`)

- [ ] **Step 1: Create the Discord webhook**

In Discord: target channel → Edit Channel → Integrations → Webhooks → New Webhook → Copy Webhook URL.

- [ ] **Step 2: Create `.env.local`**

```bash
VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXX/YYYY
```

- [ ] **Step 3: Verify `.env.local` is ignored**

Run: `git check-ignore .env.local`
Expected: prints `.env.local` (it is ignored — never commit the real URL).

- [ ] **Step 4: Live walk-through**

Run: `npm run dev`.
- Visit `?name=Camille` (first time, fresh browser profile / cleared localStorage) → Discord shows **👀 Camille vient d'arriver**.
- Reload → **🔁 Camille est revenue**.
- Remove `?name=Camille` from the URL, reload → **🕵️ … elle est maligne** (name still shows).
- Click Oui → **✅ Camille a accepté le date !** + confetti.
- Type a word, Envoyer → **💌 Camille a laissé un mot : "…"** + confetti.

Expected: all five messages arrive; no `@everyone` ping even if the note contains `@everyone`.

- [ ] **Step 5: Commit** (no secret committed — just confirm clean tree)

```bash
git status   # confirm .env.local is NOT listed
```

---

## Task 19: Polish, responsive pass, and Vercel deploy

**Files:**
- Modify: `src/index.css`, behavior/card files as needed for responsive tweaks

- [ ] **Step 1: Responsive + overflow pass**

- On a 375px-wide viewport (mobile), confirm the card fits, the question wraps, and the `grow` behavior's giant Oui overflows playfully without breaking layout (`overflow-x` hidden on `body` if needed — add to `index.css`):

```css
@layer base {
  html, body { overflow-x: hidden; }
}
```

- [ ] **Step 2: Full build + test gate**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 3: Deploy to Vercel**

```bash
npm i -g vercel   # if not installed
vercel            # link the project, accept defaults (framework auto-detected as Vite)
```

In the Vercel dashboard → Project → Settings → Environment Variables, add `VITE_DISCORD_WEBHOOK_URL` with the webhook URL (Production + Preview). Then:

```bash
vercel --prod
```

- [ ] **Step 4: Live verification on the deployed URL**

Open `https://<project>.vercel.app/?name=Camille` on a **phone** (real touch) and confirm: name shows, the touch-adapted behavior works (Non can't be tapped / changes / flees), Oui → thank-you + confetti, Discord receives the messages.

- [ ] **Step 5: Commit any polish changes**

```bash
git add -A
git commit -m "polish: responsive pass + deploy config"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- §3 stack → Task 1. §3bis naming → followed throughout (kebab files, PascalCase components).
- §4 state machine + registry → Tasks 11, 17. §5 every unit → Tasks 2–17.
- §6 name logic (url/storage/fallback/sneaky) → Tasks 3, 8. §7 all 6 behaviors + `?mode=` → Tasks 5, 10–17.
- §8 all 5 webhooks + ordering + return rate-limit → Tasks 4, 6, 8, 11, 18.
- §9 touch adaptation → every behavior handles `onTouchStart`/`touchmove` (Tasks 11–16); `isTouch` detection in Task 8.
- §10 thank-you card + optional note + confetti → Tasks 7, 11. §11 visual Option A → Task 1 (`index.css`), Tasks 11/17 markup.
- §12 error handling → fire-and-forget (Task 6), safe storage access (Task 8), `?mode=` fallback (Task 5).
- §13 test strategy → unit tests on all pure modules + hook/app integration tests.
- §14 incremental order → Tasks ordered scaffold → flow → behaviors one-by-one → tracking → polish.

**Placeholder scan:** none — every code step contains complete code; no TBD/TODO.

**Type consistency:** `BehaviorId`/`BEHAVIOR_IDS` (ids.ts) used identically in mode.ts, registry, hooks, cards. `ResolvedName` fields (`name`/`source`/`sneaky`) consistent across person-name, hook, App. `decideVisitEvent` return shape (`event`/`nextVisited`/`nextReturns`) consistent between pure module and hook. Webhook fn names (`notifyVisit/Return/Sneaky/Accepted/Note`) consistent between discord.ts and callers.
