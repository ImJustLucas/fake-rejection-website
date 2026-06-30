// src/components/buttons.tsx
import { forwardRef, type CSSProperties, type TouchEvent } from 'react';

interface YesButtonProps {
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}
export const YesButton = forwardRef<HTMLButtonElement, YesButtonProps>(function YesButton(
  { onClick, style, className = '' },
  ref,
) {
  return (
    <button ref={ref} type="button" className={`yes-btn ${className}`} style={style} onClick={onClick}>
      Oui&nbsp;💕
    </button>
  );
});

interface NoButtonProps {
  text?: string;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onTouchStart?: (e: TouchEvent<HTMLButtonElement>) => void;
}
export const NoButton = forwardRef<HTMLButtonElement, NoButtonProps>(function NoButton(
  { text = 'Non', style, className = '', onClick, onMouseEnter, onTouchStart },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`no-btn ${className}`}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
    >
      {text}
    </button>
  );
});
