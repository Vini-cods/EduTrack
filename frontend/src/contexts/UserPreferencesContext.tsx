import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';
import { PreferencesSync, cachePreferences, defaultUserPreferences, readCachedPreferences,
  type PreferencesPatch, type PreferencesState, type UserPreferences } from '../lib/userPreferences';

interface PreferencesContextValue extends PreferencesState {
  authenticated: boolean;
  update: (patch: PreferencesPatch) => Promise<boolean>;
  retry: () => void;
}

const Context = createContext<PreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const ownerId = user?.id;
  const syncRef = useRef<PreferencesSync | null>(null);
  const [ownedState, setOwnedState] = useState<{ ownerId: number; state: PreferencesState } | null>(null);

  useEffect(() => {
    if (ownerId === undefined || !token) { syncRef.current = null; return; }
    // Capturar o token impede que uma gravação enfileirada use credenciais de outra conta.
    const headers = { Authorization: `Bearer ${token}` };
    const sync = new PreferencesSync(readCachedPreferences(ownerId), {
      read: async (signal) => (await apiClient.get<UserPreferences>('/preferences/', { headers, signal, timeout: 10_000 })).data,
      patch: async (patch, signal) => (await apiClient.patch<UserPreferences>('/preferences/', patch, { headers, signal, timeout: 10_000 })).data,
    }, (state) => {
      setOwnedState({ ownerId, state });
      if (state.ready && !state.error && !state.saving) cachePreferences(ownerId, state.value);
    });
    syncRef.current = sync;
    setOwnedState({ ownerId, state: sync.state });
    void sync.load();
    return () => { sync.dispose(); if (syncRef.current === sync) syncRef.current = null; };
  }, [ownerId, token]);

  const update = useCallback((patch: PreferencesPatch) => syncRef.current?.update(patch) ?? Promise.resolve(false), []);
  const retry = useCallback(() => { void syncRef.current?.retry(); }, []);
  const state = ownerId !== undefined && ownedState?.ownerId === ownerId ? ownedState.state
    : { value: defaultUserPreferences(), ready: ownerId === undefined, saving: false, error: false };
  return <Context.Provider value={{ ...state, authenticated: ownerId !== undefined, update, retry }}>{children}</Context.Provider>;
}

export function useUserPreferences(): PreferencesContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useUserPreferences precisa de UserPreferencesProvider');
  return value;
}
