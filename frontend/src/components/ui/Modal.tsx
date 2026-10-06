import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Alinhamento vertical do painel: 'center' (diálogos comuns) ou 'top' (command palette). */
  align?: 'center' | 'top';
  panelClassName?: string;
  ariaLabel: string;
}

/**
 * Shell de modal reutilizável: backdrop, fechar com ESC, fechar clicando fora,
 * trava o scroll do body enquanto aberto. O conteúdo interno fica a cargo de
 * quem usa (CommandPalette, formulários futuros etc.).
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  align = 'center',
  panelClassName = '',
  ariaLabel,
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
    <div
      className={`fixed inset-0 z-[100] flex justify-center px-4 ${
        align === 'top' ? 'items-start pt-[12vh]' : 'items-center'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className="absolute inset-0 bg-ink/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full bg-surface rounded-xl shadow-float border border-border animate-scale-in ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
