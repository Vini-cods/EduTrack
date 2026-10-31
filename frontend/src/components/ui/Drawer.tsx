import React, { useEffect, useRef } from 'react';

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
    const isTopmostDialog = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
        .filter((dialog) => dialog.getClientRects().length > 0);
      return dialogs[dialogs.length - 1] === dialogRef.current;
    };
    const frame = requestAnimationFrame(() => {
      if (isTopmostDialog()) (focusable()[0] || panelRef.current)?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTopmostDialog()) return;
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      const activeDialog = document.activeElement?.closest('[role="dialog"][aria-modal="true"]');
      if (previousFocus?.isConnected && (!activeDialog || activeDialog === dialogRef.current)) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} ${widthClassName} bg-surface animate-slide-in flex flex-col`}
      >
        {children}
      </div>
    </div>
  );
};
