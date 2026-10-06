import React from 'react';

type Tone = 'neutral' | 'navy' | 'crimson' | 'success' | 'warning' | 'danger';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-graphite border-border',
  navy: 'bg-navy-soft text-navy border-navy-soft',
  crimson: 'bg-crimson-soft text-crimson-dark border-crimson-soft',
  success: 'bg-success-soft text-success border-success-soft',
  warning: 'bg-warning-soft text-warning border-warning-soft',
  danger: 'bg-danger-soft text-danger border-danger-soft',
};

/** Etiqueta compacta para status de tarefa, prioridade, categoria de evento etc. */
export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  icon,
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full whitespace-nowrap ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
      } ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
};
