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
