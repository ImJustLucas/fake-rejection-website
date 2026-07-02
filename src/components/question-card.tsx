// src/components/question-card.tsx
import { BEHAVIORS } from '../behaviors';
import type { BehaviorId } from '../behaviors/ids';
import { renderPhrase } from '../lib/phrase';

interface QuestionCardProps {
  name: string;
  phrase: string;
  mode: BehaviorId;
  isTouch: boolean;
  onYes: () => void;
}

export function QuestionCard({ name, phrase, mode, isTouch, onYes }: QuestionCardProps) {
  const Behavior = BEHAVIORS[mode].Component;
  return (
    <div className="meme-card max-w-sm md:max-w-lg md:p-10 w-full mx-auto relative z-10">
      <div className="text-4xl md:text-6xl">💖</div>
      <h1 className="text-2xl md:text-4xl font-extrabold text-[#2b061e] mt-2 leading-tight">
        {renderPhrase(phrase, name)}
      </h1>
      <Behavior onYes={onYes} isTouch={isTouch} />
    </div>
  );
}
