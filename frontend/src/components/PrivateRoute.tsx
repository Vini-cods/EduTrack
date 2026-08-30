import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const PrivateRoute: React.FC = () => {
  const { token, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;

  return token ? <Outlet /> : <Navigate to="/login" />;
};
