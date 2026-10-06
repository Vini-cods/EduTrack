import React, { useEffect } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
  ariaLabel: string;
  widthClassName?: string;
}

/** Painel deslizante (usado pela sidebar em telas menores que 1024px). */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  children,
  side = 'left',
  ariaLabel,
  widthClassName = 'w-72',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} ${widthClassName} bg-surface animate-slide-in flex flex-col`}
      >
        {children}
      </div>
    </div>
  );
};
