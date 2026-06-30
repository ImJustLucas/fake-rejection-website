// src/components/question-card.tsx
import GrowShrink from '../behaviors/grow-shrink';
import type { BehaviorId } from '../behaviors/ids';

interface QuestionCardProps {
  name: string;
  mode: BehaviorId;
  isTouch: boolean;
  onYes: () => void;
}

export function QuestionCard({ name, isTouch, onYes }: QuestionCardProps) {
  return (
    <div className="meme-card max-w-sm w-full mx-auto relative z-10">
      <div className="text-4xl">💖</div>
      <h1 className="text-2xl font-extrabold text-[#2b061e] mt-2 leading-tight">
        {name}, veux-tu venir en date avec moi&nbsp;?
      </h1>
      <GrowShrink onYes={onYes} isTouch={isTouch} />
    </div>
  );
}
