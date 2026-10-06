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
import { Lightbulb, TrendingUp, Award, ClipboardList } from 'lucide-react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

// Cores semânticas alinhadas ao resto do produto: sucesso/navy/alerta em vez
// das cores genéricas do Recharts.
const PIE_COLORS = ['#2f6b4f', '#1c2b4a', '#a8721f']; // concluídas / em andamento / pendentes
const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e4e1d8',
  borderRadius: '8px',
  color: '#1c1b19',
  fontSize: '13px',
};

export const Insights: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.get('/dashboard/'), apiClient.get('/subjects/')])
      .then(([dashRes, subjRes]) => {
        setData(dashRes.data);
        setSubjects(subjRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-72 mb-8" />
        <div className="grid grid-cols-3 gap-6 py-6 border-y border-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <Card padding="lg">
          <EmptyState icon={ClipboardList} title="Erro ao carregar dados" description="Tente novamente em instantes." />
        </Card>
      </div>
    );
  }

  const completionRate = data.total_tasks > 0 ? Math.round((data.tasks_completed / data.total_tasks) * 100) : 0;
  const pendingTasks = data.total_tasks - data.tasks_completed;

  const pieData = [
    { name: 'Concluídas', value: data.tasks_completed },
    { name: 'Em andamento', value: data.tasks_in_progress },
    { name: 'Pendentes', value: data.tasks_pending },
  ].filter((d) => d.value > 0);

  const sortedSubjects = [...subjects].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
  const bestSubject = sortedSubjects[0];
  const worstSubject = sortedSubjects[sortedSubjects.length - 1];

  // Dicas determinísticas baseadas nos dados atuais (sem IA) — mesma regra de
  // negócio de antes, só a apresentação visual muda nesta migração.
  const tips: string[] = [];
  if (completionRate < 30) {
    tips.push('📚 Tente definir metas diárias menores para aumentar sua taxa de conclusão.');
  }
  if (completionRate >= 30 && completionRate < 70) {
    tips.push('💪 Você está no caminho certo! Continue mantendo a consistência nos estudos.');
  }
  if (completionRate >= 70) {
    tips.push('🌟 Excelente progresso! Você está arrasando nos seus estudos!');
  }
  if (worstSubject && (worstSubject.progress ?? 0) < 30) {
    tips.push(`⚠️ A disciplina "${worstSubject.name}" precisa de mais atenção. Dedique um tempo extra a ela.`);
  }
  if (data.total_tasks === 0) {
    tips.push('📝 Comece criando tarefas nas suas disciplinas para acompanhar seu progresso!');
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <SectionHeader title="Insights" description="Análise detalhada do seu desempenho acadêmico." />

      {/* Métricas — mesma linguagem editorial do Dashboard, sem repetir cards de ícone */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 py-6 mt-6 border-y border-border">
        <div>
          <p className="font-serif text-4xl font-semibold text-ink tabular-nums">{completionRate}%</p>
          <p className="text-sm text-graphite mt-1">Taxa de conclusão</p>
        </div>
        <div className="sm:border-l sm:border-border sm:pl-6">
          <p className="font-serif text-2xl font-semibold text-ink truncate">{bestSubject ? bestSubject.name : '—'}</p>
          <p className="text-sm text-graphite mt-1">
            {bestSubject ? `Melhor disciplina · ${Math.round(bestSubject.progress ?? 0)}%` : 'Melhor disciplina'}
          </p>
        </div>
        <div className="sm:border-l sm:border-border sm:pl-6">
          <p className="font-serif text-4xl font-semibold text-ink tabular-nums">{pendingTasks}</p>
          <p className="text-sm text-graphite mt-1">Tarefas restantes de {data.total_tasks}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="text-navy" size={20} />
            <h3 className="font-serif text-lg font-semibold text-ink">Distribuição de tarefas</h3>
          </div>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted text-sm">Sem dados para exibir</div>
          )}
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="text-xs text-graphite">
                  {entry.name} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-navy" size={20} />
            <h3 className="font-serif text-lg font-semibold text-ink">Progresso por disciplina</h3>
          </div>
          {data.subjects_progress.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjects_progress} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d8" vertical={false} />
                  <XAxis dataKey="subject_name" tick={{ fill: '#85817a', fontSize: 11 }} axisLine={{ stroke: '#e4e1d8' }} tickLine={false} />
                  <YAxis tick={{ fill: '#85817a', fontSize: 11 }} axisLine={{ stroke: '#e4e1d8' }} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1efe8' }} />
                  <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                    {data.subjects_progress.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.progress < 40 ? '#9a2b2f' : '#1c2b4a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted text-sm">Sem dados para exibir</div>
          )}
        </Card>
      </div>

      {/* Dicas */}
      {tips.length > 0 && (
        <Card className="mt-6">
          <div className="flex items-center gap-3 mb-5">
            <Award className="text-crimson" size={20} />
            <div>
              <h3 className="font-serif text-lg font-semibold text-ink">Dicas e sugestões</h3>
              <p className="text-sm text-muted">Baseadas no seu desempenho atual</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {tips.map((tip, index) => (
              <div key={index} className="p-3.5 rounded-lg bg-surface-muted text-ink text-sm">
                {tip}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
