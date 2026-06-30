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
