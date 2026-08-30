import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import type { DashboardData } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Loader2,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    apiClient
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch(console.error);
  }, []);

  if (!data)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  const completionRate =
    data.total_tasks > 0
      ? Math.round((data.completed_tasks / data.total_tasks) * 100)
      : 0;

  const stats = [
    {
      label: 'Total Disciplinas',
      value: data.total_subjects,
      icon: BookOpen,
      color: 'from-purple-500 to-purple-700',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
    {
      label: 'Total Tarefas',
      value: data.total_tasks,
      icon: ClipboardList,
      color: 'from-blue-500 to-blue-700',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: 'Tarefas Concluídas',
      value: data.completed_tasks,
      icon: CheckCircle2,
      color: 'from-green-500 to-green-700',
      bgLight: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      label: 'Taxa de Conclusão',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'from-amber-500 to-amber-700',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-text">
          Olá, {user?.nome || 'Estudante'}! 👋
        </h1>
        <p className="text-text-secondary mt-1">
          Aqui está o resumo do seu progresso acadêmico.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl ${stat.bgLight} flex items-center justify-center`}
              >
                <stat.icon className={stat.textColor} size={24} />
              </div>
            </div>
            <p className="text-3xl font-bold text-text">{stat.value}</p>
            <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 animate-fade-in" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <TrendingUp className="text-primary" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text">
              Progresso por Disciplina
            </h3>
            <p className="text-sm text-text-secondary">
              Porcentagem de tarefas concluídas
            </p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.subjects_progress} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ff" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e9d5ff' }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e9d5ff' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#111827',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}
              />
              <Bar
                dataKey="progress"
                fill="url(#purpleGradient)"
                radius={[8, 8, 0, 0]}
              />
              <defs>
                <linearGradient
                  id="purpleGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#6b21a8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
