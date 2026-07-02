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
  // Fetch by url id, or by cached id when the url has neither id nor name (the "sneaky" case).
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
