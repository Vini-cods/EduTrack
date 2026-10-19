import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthSuccessIntro } from './auth/AuthSuccessIntro';

export const PrivateRoute: React.FC = () => {
  const { token, user, loading, entryIntroId, completeEntryIntro } = useAuth();

  if (loading) return <div className="min-h-dvh flex items-center justify-center bg-paper text-graphite" role="status">Preparando seu espaço…</div>;

  if (!token || !user) return <Navigate to="/login" replace />;
  if (entryIntroId !== null) return <AuthSuccessIntro key={entryIntroId} entryId={entryIntroId} onComplete={completeEntryIntro} />;
  return <Outlet />;
};
