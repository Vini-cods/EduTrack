import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { applyTheme, normalizeThemePreference, readThemePreference, resolveTheme, THEME_STORAGE_KEY } from '../lib/theme';
import type { ResolvedTheme, ThemePreference } from '../lib/theme';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolvedTheme = resolveTheme(preference, systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setPreferenceState(normalizeThemePreference(event.newValue));
    };
    onChange();
    media.addEventListener('change', onChange);
    window.addEventListener('storage', onStorage);
    return () => { media.removeEventListener('change', onChange); window.removeEventListener('storage', onStorage); };
  }, []);

  useEffect(() => { applyTheme(resolvedTheme); }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const setPreference = (next: ThemePreference) => {
      setPreferenceState(next);
      applyTheme(resolveTheme(next, systemDark));
      try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Tema continua válido sem storage. */ }
    };
    return { preference, resolvedTheme, setPreference, toggleTheme: () => setPreference(resolvedTheme === 'dark' ? 'light' : 'dark') };
  }, [preference, resolvedTheme, systemDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme precisa de ThemeProvider');
  return value;
}
