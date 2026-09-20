import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-crimson text-white hover:bg-crimson-dark shadow-none disabled:hover:bg-crimson',
  secondary:
    'bg-navy text-white hover:bg-navy-dark disabled:hover:bg-navy',
  outline:
    'bg-transparent text-ink border border-border-strong hover:bg-surface-muted disabled:hover:bg-transparent',
  ghost:
    'bg-transparent text-graphite hover:bg-surface-muted disabled:hover:bg-transparent',
  danger:
    'bg-danger text-white hover:brightness-95 disabled:hover:brightness-100',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 gap-1.5 rounded-md',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-lg',
  lg: 'text-base px-5 py-3 gap-2 rounded-lg',
};

/**
 * Botão base do design system. Um único componente com variantes evita que
 * cada página reinvente sua própria combinação de classes Tailwind (o que
 * antes gerava gradientes/sombras diferentes em cada tela).
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson/30 focus-visible:ring-offset-1 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'lg' ? 18 : 16} className="animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
