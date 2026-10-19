import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';
import { PreferencesSync, cachePreferences, defaultUserPreferences, readCachedPreferences,
  type PreferencesPatch, type PreferencesState, type UserPreferences } from '../lib/userPreferences';
import { clearEntryTheme, confirmPendingTheme, readPendingTheme, rememberEntryTheme, rememberPendingTheme } from '../lib/theme';

interface PreferencesContextValue extends PreferencesState {
  authenticated: boolean;
  update: (patch: PreferencesPatch) => Promise<boolean>;
  retry: () => void;
}

const Context = createContext<PreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, token, sessionId, entryTheme } = useAuth();
  const ownerId = user?.id;
  const syncRef = useRef<PreferencesSync | null>(null);
  const [ownedState, setOwnedState] = useState<{ ownerId: number; token: string; sessionId: number; state: PreferencesState } | null>(null);
  // O primeiro render autenticado já mantém o tema do acesso, antes do GET.
  const bootstrap = useMemo(() => {
    const initial = ownerId === undefined ? defaultUserPreferences() : readCachedPreferences(ownerId);
    const theme = entryTheme ?? (ownerId === undefined ? undefined : readPendingTheme(ownerId));
    return { value: theme === undefined ? initial : { ...initial, theme }, theme };
  }, [ownerId, token, sessionId, entryTheme]);

  useEffect(() => {
    if (ownerId === undefined || !token) { syncRef.current = null; return; }
    // Capturar o token impede que uma gravação enfileirada use credenciais de outra conta.
    const headers = { Authorization: `Bearer ${token}` };
    if (entryTheme !== null && rememberPendingTheme(ownerId, entryTheme)) clearEntryTheme(entryTheme);
    const sync = new PreferencesSync(bootstrap.value, {
      read: async (signal) => {
        const value = (await apiClient.get<UserPreferences>('/preferences/', { headers, signal, timeout: 10_000 })).data;
        if (!signal.aborted) {
          confirmPendingTheme(ownerId, value.theme);
          clearEntryTheme(value.theme);
        }
        return value;
      },
      patch: async (patch, signal) => {
        const value = (await apiClient.patch<UserPreferences>('/preferences/', patch, { headers, signal, timeout: 10_000 })).data;
        if (!signal.aborted && patch.theme !== undefined && value.theme === patch.theme) {
          confirmPendingTheme(ownerId, value.theme);
          clearEntryTheme(value.theme);
        }
        return value;
      },
    }, (state) => {
      setOwnedState({ ownerId, token, sessionId, state });
      if (state.ready && !state.error && !state.saving) cachePreferences(ownerId, state.value);
    }, bootstrap.theme);
    syncRef.current = sync;
    setOwnedState({ ownerId, token, sessionId, state: sync.state });
    void sync.load();
    return () => { sync.dispose(); if (syncRef.current === sync) syncRef.current = null; };
  }, [ownerId, token, sessionId, entryTheme, bootstrap]);

  const update = useCallback((patch: PreferencesPatch) => {
    const sync = syncRef.current;
    if (ownerId === undefined || !sync?.state.ready) return Promise.resolve(false);
    if (patch.theme !== undefined) {
      clearEntryTheme();
      if (!rememberPendingTheme(ownerId, patch.theme)) rememberEntryTheme(patch.theme);
    }
    return sync.update(patch);
  }, [ownerId]);
  const retry = useCallback(() => { void syncRef.current?.retry(); }, []);
  const state = ownerId !== undefined && ownedState?.ownerId === ownerId && ownedState.token === token && ownedState.sessionId === sessionId ? ownedState.state
    : { value: bootstrap.value, ready: ownerId === undefined, saving: false, error: false };
  return <Context.Provider value={{ ...state, authenticated: ownerId !== undefined, update, retry }}>{children}</Context.Provider>;
}

export function useUserPreferences(): PreferencesContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useUserPreferences precisa de UserPreferencesProvider');
  return value;
}
