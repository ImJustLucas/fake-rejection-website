import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPage } from './admin-page';

describe('AdminPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('shows the password gate first, then the form after entering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ entries: [] }) }));
    render(<AdminPage />);
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'good' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrer/ }));
    await waitFor(() => expect(screen.getByLabelText('Prénom')).toBeInTheDocument());
  });

  it('creates a link and shows the copyable URL', async () => {
    localStorage.setItem('date.admin.secret', 'good');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'abcDEF12' }) })
      .mockResolvedValue({ ok: true, json: async () => ({ entries: [] }) }));
    render(<AdminPage />);
    await waitFor(() => screen.getByLabelText('Prénom'));
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Lou' } });
    fireEvent.click(screen.getByRole('button', { name: /Générer/ }));
    await waitFor(() => expect(screen.getByText(/\/\?id=abcDEF12/)).toBeInTheDocument());
  });
});
