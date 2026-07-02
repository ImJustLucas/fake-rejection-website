// src/app.tsx
import { useState } from 'react';
import { useTarget } from './hooks/use-target';
import { useVisitTracking } from './hooks/use-visit-tracking';
import { QuestionCard } from './components/question-card';
import { ThankYouCard } from './components/thank-you-card';
import { notifyAccepted, notifyNote } from './lib/discord';
import { firePinkConfetti } from './lib/confetti';
import { resolveMode, randomBehaviorId } from './lib/mode';

type Phase = 'asking' | 'accepted';

export default function App() {
  const target = useTarget();
  const [phase, setPhase] = useState<Phase>('asking');

  const ready = target.status === 'ready';
  const name = ready ? target.name : 'Toi';
  const id = ready ? target.id : undefined;
  const sneaky = ready ? target.sneaky : false;
  const rawMode = ready ? target.mode : 'random';
  const phrase = ready ? target.phrase : '';
  const isTouch =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
      : false;

  useVisitTracking(name, sneaky, id, ready);

  const handleYes = () => {
    notifyAccepted(name, id);
    firePinkConfetti();
    setPhase('accepted');
  };
  const handleNote = (note: string) => {
    if (note) notifyNote(name, note, id);
    firePinkConfetti();
  };

  const mode = resolveMode(rawMode, () => randomBehaviorId());

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-[#ffd9e8] to-[#ff7eb0]">
      {!ready ? (
        <div className="meme-card max-w-sm w-full mx-auto text-4xl">💌</div>
      ) : phase === 'asking' ? (
        <QuestionCard name={name} phrase={phrase} mode={mode} isTouch={isTouch} onYes={handleYes} />
      ) : (
        <ThankYouCard name={name} onSend={handleNote} />
      )}
    </main>
  );
}
