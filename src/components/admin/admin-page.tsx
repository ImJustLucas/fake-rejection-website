// src/components/admin/admin-page.tsx
import { useEffect, useState } from 'react';
import { LinkForm } from './link-form';
import { LinkList, type AdminEntry } from './link-list';

const SECRET_KEY = 'date.admin.secret';

export function AdminPage() {
  const [secret, setSecret] = useState<string>(() => {
    try { return localStorage.getItem(SECRET_KEY) ?? ''; } catch { return ''; }
  });
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [error, setError] = useState('');

  const headers = { 'Content-Type': 'application/json', 'x-admin-secret': secret };

  const refresh = async () => {
    if (!secret) return;
    try {
      const r = await fetch('/api/list', { headers });
      if (r.ok) setEntries((await r.json()).entries as AdminEntry[]);
    } catch { /* ignore */ }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [secret]);

  const create = async (body: { name: string; phrase: string; mode: string }): Promise<string | null> => {
    try {
      const r = await fetch('/api/create', { method: 'POST', headers, body: JSON.stringify(body) });
      if (!r.ok) return null;
      const { id } = await r.json();
      void refresh();
      return id as string;
    } catch { return null; }
  };

  const remove = async (id: string) => {
    setError('');
    try {
      const r = await fetch('/api/delete', { method: 'POST', headers, body: JSON.stringify({ id }) });
      if (r.ok) void refresh();
      else setError('Suppression échouée (mot de passe ?).');
    } catch { setError('Suppression échouée (réseau).'); }
  };

  const enter = () => {
    try { localStorage.setItem(SECRET_KEY, input); } catch { /* ignore */ }
    setSecret(input);
  };

  if (!secret) {
    return (
      <div className="meme-card max-w-sm w-full mx-auto">
        <h2 className="text-xl font-extrabold text-[#2b061e]">Admin</h2>
        <input className="w-full mt-3 rounded-xl px-3 py-2" style={{ border: '2px solid #2b061e' }}
          type="password" aria-label="Mot de passe" placeholder="Mot de passe" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') enter(); }} />
        <button type="button" className="yes-btn mt-3 w-full" onClick={enter}>Entrer</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto py-8">
      <LinkForm onCreate={create} />
      {error && <p className="mt-3 text-center text-red-700">{error}</p>}
      <LinkList entries={entries} onDelete={remove} />
    </div>
  );
}
