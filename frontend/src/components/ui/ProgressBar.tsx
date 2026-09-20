import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  tone?: 'crimson' | 'navy' | 'success';
  size?: 'sm' | 'md';
  trackClassName?: string;
  className?: string;
}

const toneClasses = {
  crimson: 'bg-crimson',
  navy: 'bg-navy',
  success: 'bg-success',
};

/**
 * A transição de largura é feita em CSS (transition-[width]), então
 * anima automaticamente sempre que `value` muda — sem depender de JS para
 * a animação em si, e já reduzida pela regra global de prefers-reduced-motion.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  tone = 'crimson',
  size = 'md',
  trackClassName = '',
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`w-full bg-surface-muted rounded-full overflow-hidden ${
        size === 'sm' ? 'h-1.5' : 'h-2'
      } ${trackClassName}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${toneClasses[tone]} ${className}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};
