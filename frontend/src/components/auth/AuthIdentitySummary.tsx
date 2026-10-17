import type { ReactNode } from 'react';

interface AuthIdentitySummaryProps {
  children: ReactNode;
  editLabel: string;
  onEdit: () => void;
}

export function AuthIdentitySummary({ children, editLabel, onEdit }: AuthIdentitySummaryProps) {
  return (
    <div className="auth-portal-identity">
      <div className="min-w-0 break-words text-sm leading-relaxed">{children}</div>
      <button type="button" onClick={onEdit} className="auth-portal-back inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-crimson hover:underline">
        {editLabel}
      </button>
    </div>
  );
}
