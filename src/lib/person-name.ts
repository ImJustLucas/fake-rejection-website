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
