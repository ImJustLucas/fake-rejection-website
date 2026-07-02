// src/components/admin/link-list.tsx
import { copyToClipboard, linkUrl } from '../../lib/copy-link';

export interface AdminEntry {
  id: string;
  entry: { name: string; phrase: string; mode: string };
  stats: { visits: number; accepted: number; noted: number };
}

interface Props {
  entries: AdminEntry[];
  onDelete: (id: string) => void;
}

export function LinkList({ entries, onDelete }: Props) {
  if (entries.length === 0) return <p className="mt-4 text-[#2b061e]">Aucun lien pour l'instant.</p>;
  return (
    <ul className="mt-4 space-y-2 text-left">
      {entries.map((e) => (
        <li key={e.id} className="meme-card max-w-lg w-full mx-auto">
          <div className="font-bold text-[#2b061e]">{e.entry.name} · <code>/?id={e.id}</code></div>
          <div className="text-sm">{e.entry.phrase || '(phrase par défaut)'} — mode {e.entry.mode}</div>
          <div className="text-sm mt-1">👁 {e.stats.visits} · ✅ {e.stats.accepted} · 💌 {e.stats.noted}</div>
          <div className="mt-2 flex gap-2">
            <button type="button" className="no-btn" onClick={() => copyToClipboard(linkUrl(e.id))}>📋 Copier</button>
            <button type="button" className="no-btn" onClick={() => onDelete(e.id)}>🗑 Supprimer</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
