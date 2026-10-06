import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}

/**
 * Cabeçalho padrão de página/seção. Centralizar aqui evita que cada página
 * declare seu próprio <h1> com classes ligeiramente diferentes (o que gerava
 * inconsistência de tamanho/peso entre telas).
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  action,
  eyebrow,
  className = '',
}) => (
  <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
    <div>
      {eyebrow && <p className="text-sm text-crimson font-medium mb-1">{eyebrow}</p>}
      <h1 className="font-serif text-[1.75rem] leading-tight font-semibold text-ink">{title}</h1>
      {description && <p className="text-graphite mt-1.5">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
