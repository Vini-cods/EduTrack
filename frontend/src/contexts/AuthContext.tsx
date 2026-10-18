import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { User } from '../types';

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
  login: (data: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

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
          localStorage.removeItem('token');
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => controller.abort();
  }, [token]);

  const login = async (data: LoginCredentials) => {
    const formData = new URLSearchParams();
    formData.append('username', data.email);
    formData.append('password', data.password);

    const res = await apiClient.post('/auth/login', formData);
    if (res.data.access_token !== token) {
      setUser(null);
      setLoading(true);
    }
    setToken(res.data.access_token);
    localStorage.setItem('token', res.data.access_token);
  };

  const register = async (data: RegisterData) => {
    await apiClient.post('/auth/register', data);
    await login({ email: data.email, password: data.password });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
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
