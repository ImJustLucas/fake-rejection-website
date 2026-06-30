// src/app.tsx
import { useState } from 'react';
import { usePersonName } from './hooks/use-person-name';
import { useVisitorMode } from './hooks/use-visitor-mode';
import { useVisitTracking } from './hooks/use-visit-tracking';
import { QuestionCard } from './components/question-card';
import { ThankYouCard } from './components/thank-you-card';
import { notifyAccepted, notifyNote } from './lib/discord';
import { firePinkConfetti } from './lib/confetti';

type Phase = 'asking' | 'accepted';

export default function App() {
  const { name, sneaky } = usePersonName();
  const { mode, isTouch } = useVisitorMode();
  useVisitTracking(name, sneaky);

  const [phase, setPhase] = useState<Phase>('asking');

  const handleYes = () => {
    notifyAccepted(name); // fire immediately, independent of the note
    firePinkConfetti();
    setPhase('accepted');
  };

  const handleNote = (note: string) => {
    if (note) notifyNote(name, note);
    firePinkConfetti();
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-[#ffd9e8] to-[#ff7eb0]">
      {phase === 'asking' ? (
        <QuestionCard name={name} mode={mode} isTouch={isTouch} onYes={handleYes} />
      ) : (
        <ThankYouCard name={name} onSend={handleNote} />
      )}
    </main>
  );
}
