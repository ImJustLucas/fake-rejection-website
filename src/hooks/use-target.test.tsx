// src/hooks/use-target.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useTarget } from './use-target';

function Harness() {
  const t = useTarget();
  return <div data-testid="s">{t.status === 'ready' ? `${t.name}|${t.phrase}|${t.mode}|${t.id ?? ''}|${t.sneaky}` : t.status}</div>;
}

const ID_KEY = 'date.id';

describe('useTarget', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('resolves from ?id and caches the id', async () => {
    window.history.replaceState({}, '', '/?id=abcDEF12');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ name: 'Lou', phrase: '{prenom} ?', mode: 'flee' }) }));
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('Lou|{prenom} ?|flee|abcDEF12|false'));
    expect(localStorage.getItem(ID_KEY)).toBe('abcDEF12');
  });

  it('falls back to ?name when there is no id', () => {
    window.history.replaceState({}, '', '/?name=Camille&mode=grow');
    render(<Harness />);
    expect(screen.getByTestId('s').textContent).toBe('Camille||grow||false');
  });

  it('flags sneaky and refetches when id is removed but cached', async () => {
    localStorage.setItem(ID_KEY, 'abcDEF12');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ name: 'Lou', phrase: '', mode: 'random' }) }));
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('Lou||random|abcDEF12|true'));
  });

  it('falls back to "Toi" when id is unknown (404) and no name', async () => {
    window.history.replaceState({}, '', '/?id=abcDEF12');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('Toi||random||false'));
  });

  it('clears a stale cached id when the sneaky fetch 404s', async () => {
    localStorage.setItem(ID_KEY, 'abcDEF12');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('Toi||random||false'));
    expect(localStorage.getItem(ID_KEY)).toBeNull();
  });
});
