import React, { useId } from 'react';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
  error?: string;
  rightElement?: React.ReactNode;
}
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ icon: Icon, error, rightElement, className = '', id, 'aria-describedby': describedBy, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    return (
      <div>
        <div className="relative">
          {Icon && <Icon aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} />}
          <input ref={ref} id={inputId} aria-invalid={error ? true : undefined} aria-describedby={[describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined}
            className={`w-full min-h-11 py-2.5 rounded-md border bg-surface text-ink placeholder:text-muted outline-none transition-colors duration-150 ${Icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-14' : 'pr-4'} ${error ? 'border-danger focus:border-danger focus:ring-4 focus:ring-danger/10' : 'border-border focus:border-crimson focus:ring-4 focus:ring-crimson/10'} ${className}`} {...props} />
          {rightElement && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightElement}</div>}
        </div>
        {error && <span id={errorId} className="text-danger text-xs mt-1.5 block">{error}</span>}
      </div>
    );
  }
);
TextField.displayName = 'TextField';
