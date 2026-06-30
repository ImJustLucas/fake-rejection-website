import { useEffect, useState } from 'react';
import { resolvePersonName, NAME_STORAGE_KEY, type ResolvedName } from '../lib/person-name';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function usePersonName(): ResolvedName {
  const [resolved] = useState<ResolvedName>(() => {
    const url = new URLSearchParams(window.location.search).get('name');
    const stored = safeGet(NAME_STORAGE_KEY);
    return resolvePersonName(url, stored);
  });

  useEffect(() => {
    if (resolved.source === 'url') safeSet(NAME_STORAGE_KEY, resolved.name);
  }, [resolved]);

  return resolved;
}
