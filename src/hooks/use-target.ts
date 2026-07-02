// src/hooks/use-target.ts
import { useEffect, useMemo } from 'react';
import { useEntry } from './use-entry';
import { cleanName } from '../lib/sanitize';

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
function safeRemove(k: string): void {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
}

export function useTarget(): Target {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlId = params.get('id');
  const urlName = params.get('name');
  const urlPhrase = params.get('q') ?? '';
  const urlMode = params.get('mode') ?? 'random';

  const cachedId = useMemo(() => safeGet(ID_KEY), []);
  const idToFetch = urlId ?? (!urlName && cachedId ? cachedId : null);
  const sneaky = !urlId && !urlName && !!cachedId;

  const entry = useEntry(idToFetch);

  // Cache a freshly-visited id (side effect belongs in an effect, not useMemo).
  useEffect(() => {
    if (urlId && entry.status === 'ok') safeSet(ID_KEY, urlId);
  }, [urlId, entry.status]);

  // Evict a stale cached id so a dead sneaky link doesn't loop loading→Toi forever.
  useEffect(() => {
    if (sneaky && (entry.status === 'notfound' || entry.status === 'error')) safeRemove(ID_KEY);
  }, [sneaky, entry.status]);

  return useMemo<Target>(() => {
    if (idToFetch) {
      if (entry.status === 'loading' || entry.status === 'idle') return { status: 'loading' };
      if (entry.status === 'ok') {
        return { status: 'ready', name: entry.data.name, phrase: entry.data.phrase, mode: entry.data.mode, id: idToFetch, sneaky };
      }
      // notfound / error → fall through to name / fallback
    }
    const cleaned = urlName ? cleanName(urlName) : '';
    if (cleaned) {
      return { status: 'ready', name: cleaned, phrase: urlPhrase, mode: urlMode, sneaky: false };
    }
    return { status: 'ready', name: 'Toi', phrase: '', mode: 'random', sneaky: false };
  }, [idToFetch, entry, urlName, urlPhrase, urlMode, sneaky]);
}
