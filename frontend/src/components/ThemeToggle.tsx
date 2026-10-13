import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const label = resolvedTheme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';
  return <button type="button" onClick={toggleTheme} aria-label={label} title={label}
    className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-graphite hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-crimson cursor-pointer">
    {resolvedTheme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
  </button>;
};
