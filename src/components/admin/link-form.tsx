// src/components/admin/link-form.tsx
import { useState } from 'react';
import { BEHAVIOR_IDS } from '../../behaviors/ids';

interface Props {
  onCreate: (input: { name: string; phrase: string; mode: string }) => Promise<string | null>;
}

export function LinkForm({ onCreate }: Props) {
  const [name, setName] = useState('');
  const [phrase, setPhrase] = useState('');
  const [mode, setMode] = useState('random');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const id = await onCreate({ name: name.trim(), phrase: phrase.trim(), mode });
    if (!id) return setError('Échec (mot de passe ? champ ?)');
    setLink(`${window.location.origin}/?id=${id}`);
  };

  return (
    <div className="meme-card max-w-lg w-full mx-auto text-left">
      <h2 className="text-xl font-extrabold text-[#2b061e]">Nouveau lien</h2>
      <input className="w-full mt-3 rounded-xl px-3 py-2" style={{ border: '2px solid #2b061e' }}
        aria-label="Prénom" placeholder="Prénom" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea className="w-full mt-3 rounded-xl px-3 py-2" style={{ border: '2px solid #2b061e' }}
        aria-label="Phrase" placeholder="Phrase (utilise {prenom})" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
      <select className="w-full mt-3 rounded-xl px-3 py-2" style={{ border: '2px solid #2b061e' }}
        aria-label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="random">aléatoire</option>
        {BEHAVIOR_IDS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <button type="button" className="yes-btn mt-4 w-full" onClick={submit}>Générer</button>
      {error && <p className="mt-2 text-red-700">{error}</p>}
      {link && (
        <div className="mt-3">
          <code className="break-all">{link}</code>
          <button type="button" className="no-btn ml-2" onClick={() => navigator.clipboard?.writeText(link)}>📋 Copier</button>
        </div>
      )}
    </div>
  );
}
