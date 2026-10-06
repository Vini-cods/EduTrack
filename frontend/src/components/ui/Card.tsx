import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 'flat': painel padrão (borda fina, sem sombra) — usar na maioria dos casos.
   * 'accent': painel com régua de destaque à esquerda (crimson), para blocos
   *           editoriais que merecem ênfase (ex.: "Hoje" no Dashboard).
   * 'float': eleva com sombra suave — reservado a elementos que realmente
   *          flutuam sobre o conteúdo (dropdowns, popovers), não cards comuns.
   */
  variant?: 'flat' | 'accent' | 'float';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({
  variant = 'flat',
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  const variantClasses =
    variant === 'accent'
      ? 'bg-surface border border-border border-l-[3px] border-l-crimson'
      : variant === 'float'
      ? 'bg-surface border border-border shadow-soft'
      : 'bg-surface border border-border';

  return (
    <div
      className={`rounded-xl ${variantClasses} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
