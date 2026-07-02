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
