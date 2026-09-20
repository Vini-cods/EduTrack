import React from 'react';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Grupo de abas/filtros com indicador de contagem opcional. */
export const Tabs: React.FC<TabsProps> = ({ tabs, value, onChange, className = '' }) => (
  <div className={`flex flex-wrap gap-1.5 ${className}`} role="tablist">
    {tabs.map((tab) => {
      const active = tab.key === value;
      return (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(tab.key)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson/30 ${
            active
              ? 'bg-navy text-white'
              : 'text-graphite hover:bg-surface-muted border border-transparent'
          }`}
        >
          {tab.label}
          {typeof tab.count === 'number' && (
            <span className={`ml-1.5 ${active ? 'text-white/70' : 'text-muted'}`}>
              {tab.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
