import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import type { DashboardData, Subject } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Lightbulb,
  TrendingUp,
  Target,
  Award,
  Loader2,
  Flame,
} from 'lucide-react';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

export const Insights: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/dashboard/'),
      apiClient.get('/subjects/'),
    ])
      .then(([dashRes, subjRes]) => {
        setData(dashRes.data);
        setSubjects(subjRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  if (!data)
    return (
      <div className="flex items-center justify-center min-h-screen text-text-secondary">
        Erro ao carregar dados.
      </div>
    );

  const completionRate =
    data.total_tasks > 0
      ? Math.round((data.tasks_completed / data.total_tasks) * 100)
      : 0;
  const pendingTasks = data.total_tasks - data.tasks_completed;

  const pieData = [
    { name: 'Concluídas', value: data.tasks_completed },
    { name: 'Em Andamento', value: data.tasks_in_progress },
    { name: 'Pendentes', value: data.tasks_pending },
  ].filter((d) => d.value > 0);

  // Best and worst performing subject
  const sortedSubjects = [...subjects].sort(
    (a, b) => (b.progress ?? 0) - (a.progress ?? 0)
  );
  const bestSubject = sortedSubjects[0];
  const worstSubject = sortedSubjects[sortedSubjects.length - 1];

  // Tips based on data
  const tips: string[] = [];
  if (completionRate < 30) {
    tips.push(
      '📚 Tente definir metas diárias menores para aumentar sua taxa de conclusão.'
    );
  }
  if (completionRate >= 30 && completionRate < 70) {
    tips.push(
      '💪 Você está no caminho certo! Continue mantendo a consistência nos estudos.'
    );
  }
  if (completionRate >= 70) {
    tips.push(
      '🌟 Excelente progresso! Você está arrasando nos seus estudos!'
    );
  }
  if (worstSubject && (worstSubject.progress ?? 0) < 30) {
    tips.push(
      `⚠️ A disciplina "${worstSubject.name}" precisa de mais atenção. Dedique um tempo extra a ela.`
    );
  }
  if (data.total_tasks === 0) {
    tips.push(
      '📝 Comece criando tarefas nas suas disciplinas para acompanhar seu progresso!'
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-text">Insights</h1>
        <p className="text-text-secondary mt-1">
          Análise detalhada do seu desempenho acadêmico
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Target className="text-green-600" size={20} />
            </div>
            <span className="text-sm font-semibold text-text-secondary">
              Taxa de Conclusão
            </span>
          </div>
          <p className="text-4xl font-bold text-text">{completionRate}%</p>
          <div className="w-full bg-green-100 rounded-full h-2 mt-3">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {bestSubject && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Award className="text-amber-600" size={20} />
              </div>
              <span className="text-sm font-semibold text-text-secondary">
                Melhor Disciplina
              </span>
            </div>
            <p className="text-xl font-bold text-text truncate">
              {bestSubject.name}
            </p>
            <p className="text-sm text-primary-light font-semibold mt-1">
              {Math.round(bestSubject.progress ?? 0)}% completo
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Flame className="text-purple-600" size={20} />
            </div>
            <span className="text-sm font-semibold text-text-secondary">
              Tarefas Restantes
            </span>
          </div>
          <p className="text-4xl font-bold text-text">{pendingTasks}</p>
          <p className="text-sm text-text-secondary mt-1">
            de {data.total_tasks} no total
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Lightbulb className="text-primary" size={20} />
            </div>
            <h3 className="text-lg font-bold text-text">
              Distribuição de Tarefas
            </h3>
          </div>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#111827',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">
              Sem dados para exibir
            </div>
          )}
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <span className="text-xs text-text-secondary">
                  {entry.name} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <TrendingUp className="text-primary" size={20} />
            </div>
            <h3 className="text-lg font-bold text-text">
              Progresso por Disciplina
            </h3>
          </div>
          {data.subjects_progress.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjects_progress} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ff" />
                  <XAxis
                    dataKey="subject_name"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#e9d5ff' }}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
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
                    fill="url(#insightGradient)"
                    radius={[6, 6, 0, 0]}
                  />
                  <defs>
                    <linearGradient
                      id="insightGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#7e22ce" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">
              Sem dados para exibir
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 animate-fade-in" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Lightbulb className="text-primary" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text">Dicas e Sugestões</h3>
            <p className="text-sm text-text-secondary">
              Baseadas no seu desempenho atual
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-primary-50/50 border border-primary-100 text-text text-sm"
            >
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
