// src/behaviors/guilt.tsx
import { useState } from 'react';
import { YesButton, NoButton } from '../components/buttons';
import { GUILT_TEXTS, nextGuiltIndex } from './helpers';
import type { BehaviorProps } from './behavior-types';

export default function Guilt({ onYes }: BehaviorProps) {
  const [i, setI] = useState(0);
  const advance = () => setI((v) => nextGuiltIndex(v));

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <YesButton onClick={onYes} />
      <NoButton
        text={GUILT_TEXTS[i]}
        onMouseEnter={advance}
        onTouchStart={(e) => {
          e.preventDefault();
          advance();
        }}
      />
    </div>
  );
}
