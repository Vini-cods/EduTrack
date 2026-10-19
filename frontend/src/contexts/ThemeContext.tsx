import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { applyTheme, normalizeThemePreference, readThemePreference, resolveTheme, THEME_STORAGE_KEY } from '../lib/theme';
import type { ResolvedTheme, ThemePreference } from '../lib/theme';
import { useUserPreferences } from './UserPreferencesContext';
import toast from 'react-hot-toast';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [anonymousPreference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const preferences = useUserPreferences();
  const preference = preferences.authenticated ? preferences.value.theme : anonymousPreference;
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolvedTheme = resolveTheme(preference, systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) setPreferenceState(normalizeThemePreference(event.newValue));
      else if (event.key === null) setPreferenceState(readThemePreference());
    };
    onChange();
    media.addEventListener('change', onChange);
    window.addEventListener('storage', onStorage);
    return () => { media.removeEventListener('change', onChange); window.removeEventListener('storage', onStorage); };
  }, []);

  useEffect(() => { applyTheme(resolvedTheme); }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const setPreference = (next: ThemePreference) => {
      if (preferences.authenticated && !preferences.ready) return;
      setPreferenceState(next);
      applyTheme(resolveTheme(next, systemDark));
      try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Tema continua válido sem storage. */ }
      if (preferences.authenticated) {
        void preferences.update({ theme: next }).then((saved) => {
          if (!saved) toast.error('Tema ainda não salvo. Tente sincronizar em Configurações.');
        });
      }
    };
    return { preference, resolvedTheme, ready: preferences.ready, setPreference, toggleTheme: () => setPreference(resolvedTheme === 'dark' ? 'light' : 'dark') };
  }, [preference, resolvedTheme, systemDark, preferences]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme precisa de ThemeProvider');
  return value;
}
