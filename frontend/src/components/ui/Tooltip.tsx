import React, { useId, useState } from 'react';

interface TooltipProps {
  label: string;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'right';
}

const sideClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

/**
 * Tooltip simples via hover/focus, sem lib externa — suficiente para labels
 * curtos de botões de ícone (ex.: colapsar sidebar, notificações).
 */
export const Tooltip: React.FC<TooltipProps> = ({ label, children, side = 'bottom' }) => {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {React.cloneElement(children, { 'aria-describedby': id } as React.HTMLAttributes<HTMLElement>)}
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white transition-opacity duration-150 ${sideClasses[side]} ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {label}
      </span>
    </span>
  );
};
