import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { DashboardData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const { logout } = useAuth();

  useEffect(() => {
    apiClient.get('/dashboard').then(res => setData(res.data)).catch(console.error);
  }, []);

  if (!data) return <div className="p-8">Carregando dashboard...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div>
          <Link to="/subjects" className="text-blue-600 mr-4 font-medium">Disciplinas</Link>
          <button onClick={logout} className="text-red-600 font-medium">Sair</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold text-gray-500">Total Disciplinas</h3>
          <p className="text-4xl font-bold">{data.total_subjects}</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold text-gray-500">Total Tarefas</h3>
          <p className="text-4xl font-bold">{data.total_tasks}</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold text-gray-500">Tarefas Concluídas</h3>
          <p className="text-4xl font-bold text-green-600">{data.completed_tasks}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow h-96">
        <h3 className="text-xl font-bold mb-4">Progresso por Disciplina (%)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.subjects_progress}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="progress" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
