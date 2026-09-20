import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

/**
 * Um empty state é um convite à ação, não um pedido de desculpas — por isso
 * sempre tenta trazer um CTA relevante quando faz sentido para o contexto.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
    <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center mb-4">
      <Icon size={26} className="text-muted" />
    </div>
    <h3 className="font-serif text-lg font-semibold text-ink mb-1.5">{title}</h3>
    {description && (
      <p className="text-sm text-graphite max-w-sm mb-5 leading-relaxed">{description}</p>
    )}
    {action && (
      <Button variant="primary" size="sm" icon={action.icon} onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);
