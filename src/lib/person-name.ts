// src/lib/person-name.ts
import { cleanName } from './sanitize';

export const NAME_STORAGE_KEY = 'date.name';

export type NameSource = 'url' | 'storage' | 'fallback';

export interface ResolvedName {
  name: string;
  source: NameSource;
  sneaky: boolean;
}

export function resolvePersonName(rawUrlName: string | null, stored: string | null): ResolvedName {
  if (rawUrlName) {
    const name = cleanName(rawUrlName);
    if (name) return { name, source: 'url', sneaky: false };
  }
  if (stored) {
    const name = cleanName(stored);
    if (name) return { name, source: 'storage', sneaky: true };
  }
  return { name: 'Toi', source: 'fallback', sneaky: false };
}
