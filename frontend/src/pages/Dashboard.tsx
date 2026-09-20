import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { DashboardData, TaskWithSubject } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton, RowSkeleton } from '../components/ui/Skeleton';
import { useCountUp } from '../hooks/useCountUp';
import { buildDashboardInsights } from '../lib/insights';
import {
  formatLongDate,
  formatShortDate,
  isDueToday,
  isPastDue,
  daysUntil,
  startOfWeek,
  startOfToday,
  WEEKDAY_LABELS,
} from '../lib/date';
import {
  Circle,
  BookOpen,
  ArrowRight,
  Plus,
  AlertTriangle,
  Info,
  TrendingDown,
} from 'lucide-react';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

const insightIcon = { danger: AlertTriangle, warning: TrendingDown, info: Info } as const;

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<TaskWithSubject[] | null>(null);

  const loadTasks = () => {
    apiClient.get('/tasks/').then((res) => setTasks(res.data)).catch(console.error);
  };

  useEffect(() => {
    apiClient.get('/dashboard/').then((res) => setData(res.data)).catch(console.error);
    loadTasks();
  }, []);

  const loading = !data || !tasks;

  const totalSubjectsDisplay = useCountUp(data?.total_subjects ?? 0);
  const totalTasksDisplay = useCountUp(data?.total_tasks ?? 0);
  const completedDisplay = useCountUp(data?.tasks_completed ?? 0);
  const progressDisplay = useCountUp(Math.round(data?.overall_progress ?? 0));

  const safeTasks = tasks ?? [];
  const pending = useMemo(() => safeTasks.filter((t) => t.status !== 'concluida'), [safeTasks]);

  const overdueTasks = useMemo(() => pending.filter((t) => isPastDue(t.due_date)), [pending]);
  const todayTasks = useMemo(() => pending.filter((t) => isDueToday(t.due_date)), [pending]);
  const noDueDateCount = useMemo(() => pending.filter((t) => !t.due_date).length, [pending]);

  const upcoming = useMemo(() => {
    const withDays = pending
      .filter((t) => {
        const d = daysUntil(t.due_date);
        return d !== null && d > 0 && d <= 14;
      })
      .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1));

    const grouped: { due_date: string; tasks: TaskWithSubject[] }[] = [];
    withDays.forEach((t) => {
      const last = grouped[grouped.length - 1];
      if (last && last.due_date === t.due_date) {
        last.tasks.push(t);
      } else {
        grouped.push({ due_date: t.due_date!, tasks: [t] });
      }
    });
    return grouped.slice(0, 6);
  }, [pending]);

  const weekStart = useMemo(() => startOfWeek(), []);

  const weekCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    pending.forEach((t) => {
      if (!t.due_date) return;
      const diff = Math.round(
        (new Date(t.due_date + 'T00:00:00').getTime() - weekStart.getTime()) / 86400000
      );
      if (diff >= 0 && diff <= 6) counts[diff] += 1;
    });
    return counts;
  }, [pending, weekStart]);

  // Soma as horas estimadas dos objetivos do Study Planner com prazo nesta
  // semana — mesma lógica de weekCounts, mas somando estimated_hours em vez
  // de contar tarefas. Tarefas sem estimated_hours (a maioria, fora do
  // Study Planner) simplesmente não contribuem.
  const weekPlannedHours = useMemo(() => {
    return pending.reduce((sum, t) => {
      if (!t.due_date || !t.estimated_hours) return sum;
      const diff = Math.round(
        (new Date(t.due_date + 'T00:00:00').getTime() - weekStart.getTime()) / 86400000
      );
      return diff >= 0 && diff <= 6 ? sum + t.estimated_hours : sum;
    }, 0);
  }, [pending, weekStart]);

  const todayIndex = useMemo(
    () => Math.round((startOfToday().getTime() - weekStart.getTime()) / 86400000),
    [weekStart]
  );

  const sortedSubjects = useMemo(
    () => [...(data?.subjects_progress ?? [])].sort((a, b) => a.progress - b.progress),
    [data]
  );

  const insights = useMemo(
    () => (data ? buildDashboardInsights(safeTasks, data.subjects_progress) : []),
    [data, safeTasks]
  );

  const completeTask = async (taskId: number) => {
    setTasks((prev) => prev?.map((t) => (t.id === taskId ? { ...t, status: 'concluida' } : t)) ?? null);
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status: 'concluida' });
      toast.success('Tarefa concluída!');
      apiClient.get('/dashboard/').then((res) => setData(res.data)).catch(() => {});
    } catch {
      toast.error('Não foi possível concluir a tarefa.');
      loadTasks();
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'Estudante';

  if (loading) return <DashboardSkeleton />;

  const hasSubjects = (data?.total_subjects ?? 0) > 0;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <p className="text-graphite text-sm mb-1">{formatLongDate()}</p>
          <h1 className="font-serif text-3xl font-semibold text-ink">
            {greeting()}, {firstName}.
          </h1>
        </div>
      </div>

      {!hasSubjects ? (
        <Card className="mt-8 animate-fade-in-up" padding="lg" style={{ animationDelay: '80ms' }}>
          <EmptyState
            icon={BookOpen}
            title="Vamos começar pela primeira disciplina"
            description="Cadastre uma disciplina para organizar tarefas, prazos e progresso em um só lugar."
            action={{ label: 'Criar disciplina', icon: <Plus size={15} />, onClick: () => (window.location.href = '/subjects?new=1') }}
          />
        </Card>
      ) : (
        <>
          {/* Stats strip — números editoriais, sem grade de cards repetidos */}
          <div
            className="grid grid-cols-2 sm:flex gap-x-6 gap-y-5 sm:gap-0 py-6 mt-6 border-y border-border animate-fade-in-up"
            style={{ animationDelay: '80ms' }}
          >
            {[
              { label: 'Disciplinas', value: totalSubjectsDisplay },
              { label: 'Tarefas no total', value: totalTasksDisplay },
              { label: 'Concluídas', value: completedDisplay },
              { label: 'Taxa de conclusão', value: progressDisplay, suffix: '%' },
            ].map((s, i) => (
              <div key={s.label} className={`sm:flex-1 ${i > 0 ? 'sm:border-l sm:border-border sm:pl-6' : ''}`}>
                <p className="font-serif text-3xl sm:text-4xl font-semibold text-ink tabular-nums">
                  {s.value}
                  {s.suffix}
                </p>
                <p className="text-sm text-graphite mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Insights determinísticos */}
          {insights.length > 0 && (
            <div
              className="flex flex-wrap gap-x-6 gap-y-2 py-4 animate-fade-in-up"
              style={{ animationDelay: '140ms' }}
            >
              {insights.map((insight) => {
                const Icon = insightIcon[insight.tone];
                const color =
                  insight.tone === 'danger' ? 'text-danger' : insight.tone === 'warning' ? 'text-warning' : 'text-navy';
                return (
                  <span key={insight.id} className={`flex items-center gap-1.5 text-sm ${color}`}>
                    <Icon size={14} className="shrink-0" />
                    {insight.text}
                  </span>
                );
              })}
            </div>
          )}

          {/* Corpo: layout assimétrico em duas colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
            {/* Coluna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hoje */}
              <Card
                variant="accent"
                className="animate-fade-in-up"
                style={{ animationDelay: '200ms' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-lg font-semibold text-ink">Hoje</h2>
                  <Link to="/tasks?new=1" className="text-sm text-crimson hover:text-crimson-dark font-medium inline-flex items-center gap-1">
                    <Plus size={14} /> Nova tarefa
                  </Link>
                </div>

                {overdueTasks.length === 0 && todayTasks.length === 0 ? (
                  <p className="text-sm text-graphite py-2">
                    Seu dia está livre. Aproveite para planejar seus próximos estudos.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {overdueTasks.map((t) => (
                      <TaskRow key={t.id} task={t} overdue onComplete={completeTask} />
                    ))}
                    {todayTasks.map((t) => (
                      <TaskRow key={t.id} task={t} onComplete={completeTask} />
                    ))}
                  </div>
                )}
              </Card>

              {/* Próximos prazos */}
              <Card className="animate-fade-in-up" style={{ animationDelay: '260ms' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-serif text-lg font-semibold text-ink">Próximos prazos</h2>
                  <Link to="/tasks" className="text-sm text-graphite hover:text-ink font-medium inline-flex items-center gap-1">
                    Ver tarefas <ArrowRight size={14} />
                  </Link>
                </div>

                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted py-2">Nenhum prazo definido nos próximos 14 dias.</p>
                ) : (
                  <ol className="relative border-l border-border ml-1.5">
                    {upcoming.map((group) => (
                      <li key={group.due_date} className="pl-5 pb-5 last:pb-0 relative">
                        <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-navy" />
                        <p className="text-xs text-muted mb-1.5">{formatShortDate(group.due_date)}</p>
                        <div className="space-y-1.5">
                          {group.tasks.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 text-sm">
                              <span className="text-ink font-medium truncate">{t.title}</span>
                              <span className="text-muted text-xs shrink-0">{t.subject_name}</span>
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {noDueDateCount > 0 && (
                  <p className="text-xs text-muted mt-4 pt-4 border-t border-border">
                    + {noDueDateCount} {noDueDateCount === 1 ? 'tarefa sem prazo definido' : 'tarefas sem prazo definido'}.{' '}
                    <Link to="/tasks" className="underline hover:text-graphite">Ver em Tarefas</Link>
                  </p>
                )}
              </Card>
            </div>

            {/* Coluna lateral */}
            <div className="space-y-6">
              {/* Progresso por disciplina */}
              <Card className="animate-fade-in-up" style={{ animationDelay: '220ms' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-serif text-lg font-semibold text-ink">Progresso</h2>
                  <Link to="/subjects" className="text-sm text-graphite hover:text-ink font-medium">
                    Ver todas
                  </Link>
                </div>
                {sortedSubjects.length === 0 ? (
                  <p className="text-sm text-muted">Nenhuma disciplina ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {sortedSubjects.slice(0, 5).map((s) => (
                      <Link key={s.subject_id} to={`/subjects/${s.subject_id}`} className="block group">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-ink font-medium truncate group-hover:text-crimson transition-colors">
                            {s.subject_name}
                          </span>
                          <span className="text-graphite shrink-0 ml-2">{Math.round(s.progress)}%</span>
                        </div>
                        <ProgressBar value={s.progress} tone={s.progress < 40 ? 'crimson' : 'navy'} size="sm" />
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Carga acadêmica da semana */}
              {weekCounts.some((c) => c > 0) && (
                <Card className="animate-fade-in-up" style={{ animationDelay: '280ms' }}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-serif text-lg font-semibold text-ink">Carga da semana</h2>
                    {weekPlannedHours > 0 && (
                      <Link to="/study" className="text-xs text-graphite hover:text-ink font-medium">
                        {weekPlannedHours}h planejadas
                      </Link>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-2 h-24">
                    {weekCounts.map((count, i) => {
                      const max = Math.max(...weekCounts, 1);
                      const isToday = i === todayIndex;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div
                            className={`w-full rounded-t-sm transition-all duration-500 ${
                              isToday ? 'bg-crimson' : 'bg-navy-soft'
                            }`}
                            style={{ height: `${Math.max((count / max) * 100, count > 0 ? 10 : 3)}%` }}
                            title={`${count} tarefa(s)`}
                          />
                          <span className="text-[11px] text-muted">{WEEKDAY_LABELS[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const TaskRow: React.FC<{ task: TaskWithSubject; overdue?: boolean; onComplete: (id: number) => void }> = ({
  task,
  overdue,
  onComplete,
}) => (
  <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
    <button
      onClick={() => onComplete(task.id)}
      className="text-muted hover:text-success transition-colors cursor-pointer shrink-0"
      aria-label="Marcar como concluída"
    >
      <Circle size={19} />
    </button>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-ink truncate">{task.title}</p>
      <p className="text-xs text-muted truncate">{task.subject_name}</p>
    </div>
    {overdue ? (
      <Badge tone="danger" size="sm">Atrasada</Badge>
    ) : (
      <Badge tone="warning" size="sm">Hoje</Badge>
    )}
  </div>
);

const DashboardSkeleton: React.FC = () => (
  <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
    <Skeleton className="h-4 w-40 mb-3" />
    <Skeleton className="h-9 w-64 mb-8" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6 border-y border-border">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="border border-border rounded-xl p-6">
          <Skeleton className="h-5 w-24 mb-4" />
          <RowSkeleton />
          <RowSkeleton />
        </div>
        <div className="border border-border rounded-xl p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <RowSkeleton />
        </div>
      </div>
      <div className="space-y-6">
        <div className="border border-border rounded-xl p-6">
          <Skeleton className="h-5 w-28 mb-4" />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      </div>
    </div>
  </div>
);
