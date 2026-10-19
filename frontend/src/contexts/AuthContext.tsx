import React, { createContext, useContext, useState, useEffect, useReducer, useCallback } from 'react';
import apiClient from '../api/client';
import type { User } from '../types';
import { authEntryReducer, initialAuthEntry } from '../lib/authEntry';
import type { ThemePreference } from '../lib/theme';
import { clearEntryTheme, readEntryTheme, rememberEntryTheme } from '../lib/theme';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  sessionId: number;
  entryIntroId: number | null;
  entryTheme: ThemePreference | null;
  completeEntryIntro: (entryId: number) => void;
  login: (data: LoginCredentials, theme: ThemePreference) => Promise<void>;
  register: (data: RegisterData, theme: ThemePreference) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [entry, dispatchEntry] = useReducer(authEntryReducer, initialAuthEntry, state => ({
    ...state, theme: token ? readEntryTheme() ?? null : null,
  }));
  const completeEntryIntro = useCallback((entryId: number) => dispatchEntry({ type: 'complete', entryId }), []);

  useEffect(() => {
    const controller = new AbortController();
    if (token) {
      setLoading(true);
      apiClient.get('/auth/me', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
        .then(res => { if (!controller.signal.aborted) setUser(res.data); })
        .catch(() => {
          if (controller.signal.aborted) return;
          setToken(null);
          setUser(null);
          dispatchEntry({ type: 'clear' });
          clearEntryTheme();
          localStorage.removeItem('token');
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => controller.abort();
  }, [token]);

  const login = async (data: LoginCredentials, theme: ThemePreference) => {
    const formData = new URLSearchParams();
    formData.append('username', data.email);
    formData.append('password', data.password);

    const res = await apiClient.post('/auth/login', formData);
    rememberEntryTheme(theme);
    dispatchEntry({ type: 'authenticated', theme });
    if (res.data.access_token !== token) {
      setUser(null);
      setLoading(true);
    }
    setToken(res.data.access_token);
    localStorage.setItem('token', res.data.access_token);
  };

  const register = async (data: RegisterData, theme: ThemePreference) => {
    await apiClient.post('/auth/register', data);
    await login({ email: data.email, password: data.password }, theme);
  };

  const logout = () => {
    dispatchEntry({ type: 'clear' });
    clearEntryTheme();
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, sessionId: entry.sequence, entryIntroId: entry.pendingId, entryTheme: entry.theme, completeEntryIntro, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
