import React, { useEffect, useRef } from 'react';

let openModalCount = 0;
let originalOverflow = '';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    ) || []).filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => (focusable()[0] || panelRef.current)?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== dialogRef.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first) { e.preventDefault(); panelRef.current?.focus(); return; }
        if (!panelRef.current?.contains(document.activeElement) || (e.shiftKey && document.activeElement === first)) {
          e.preventDefault(); (e.shiftKey ? last : first).focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    if (openModalCount === 0) originalOverflow = document.body.style.overflow;
    openModalCount += 1;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      openModalCount -= 1;
      if (openModalCount === 0) document.body.style.overflow = originalOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
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
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full max-h-[90dvh] overflow-y-auto overscroll-contain bg-surface rounded-xl shadow-float border border-border animate-scale-in ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
