import React from 'react';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
  error?: string;
  rightElement?: React.ReactNode;
}

/**
 * Input com ícone à esquerda e estado de erro padronizado. Extraído porque
 * Login, Register e ForgotPassword repetiam exatamente essa marcação.
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ icon: Icon, error, rightElement, className = '', ...props }, ref) => (
    <div>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} />}
        <input
          ref={ref}
          className={`w-full py-2.5 rounded-lg border bg-surface text-ink placeholder:text-muted outline-none transition-colors duration-150 ${
            Icon ? 'pl-10' : 'pl-4'
          } ${rightElement ? 'pr-10' : 'pr-4'} ${
            error
              ? 'border-danger focus:border-danger focus:ring-4 focus:ring-danger/10'
              : 'border-border focus:border-crimson focus:ring-4 focus:ring-crimson/10'
          } ${className}`}
          {...props}
        />
        {rightElement && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</div>}
      </div>
      {error && <span className="text-danger text-xs mt-1.5 block">{error}</span>}
    </div>
  )
);
TextField.displayName = 'TextField';
