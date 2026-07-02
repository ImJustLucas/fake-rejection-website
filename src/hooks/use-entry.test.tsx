// src/hooks/use-entry.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
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
