// src/components/thank-you-card.tsx
import { useState } from 'react';

interface ThankYouCardProps {
  name: string;
  onSend: (note: string) => void;
}

export function ThankYouCard({ name, onSend }: ThankYouCardProps) {
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const submit = () => {
    onSend(note.trim());
    setSent(true);
  };

  if (sent) {
    return (
      <div className="meme-card max-w-sm md:max-w-lg md:p-10 w-full mx-auto relative z-10">
        <div className="text-4xl md:text-6xl">✨</div>
        <h1 className="text-2xl md:text-4xl font-extrabold text-[#2b061e] mt-2">C'est noté, à très vite&nbsp;!</h1>
      </div>
    );
  }

  return (
    <div className="meme-card max-w-sm md:max-w-lg md:p-10 w-full mx-auto relative z-10">
      <div className="text-4xl md:text-6xl">🥳</div>
      <h1 className="text-2xl md:text-4xl font-extrabold text-[#2b061e] mt-2 leading-tight">
        Yesss {name}, tu viens de faire ma journée&nbsp;!
      </h1>
      <input
        className="w-full mt-4 rounded-xl px-3 py-2 outline-none"
        style={{ border: '2px solid #2b061e' }}
        aria-label="Petit mot"
        placeholder="Laisse-moi un petit mot (ton insta 👀)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button type="button" className="yes-btn mt-4 w-full" onClick={submit}>
        Envoyer
      </button>
    </div>
  );
}
