import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, BookOpen, Plus, RefreshCw, Timer } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton } from '../components/ui/Skeleton';
import { PriorityTasks } from '../components/dashboard/PriorityTasks';
import { TodayAgenda } from '../components/dashboard/TodayAgenda';
import { UpcomingDeadlines } from '../components/dashboard/UpcomingDeadlines';
import { AcademicMetric as Metric } from '../components/analytics/AcademicMetric';
import { useDashboard } from '../hooks/useDashboard';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAcademicCapacity } from '../hooks/useAcademicCapacity';
import { analyticsRange, analyticsTimezone, formatMinutes } from '../lib/analytics';
import { formatLongDate } from '../lib/date';
import { dashboardAgenda, dashboardDeadlines, dashboardPriorities } from '../lib/dashboard';
import { projectCalendarItems } from '../lib/calendarProjection';

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export function Dashboard() {
  const { user } = useAuth();
  const { data, setData, loading, error, reload, today } = useDashboard();
  const { capacity } = useAcademicCapacity();
  const now = useMemo(() => new Date(`${today}T00:00:00`), [today]);
  const week = useMemo(() => analyticsRange('week', now), [now]);
  const analytics = useAnalytics({ ...week, timezone: analyticsTimezone(), capacity });
  const [completing, setCompleting] = useState<ReadonlySet<number>>(() => new Set());
  const completingRef = useRef(new Set<number>());
  const priorities = useMemo(() => dashboardPriorities(data?.tasks ?? [], now), [data?.tasks, now]);
  const agenda = useMemo(() => dashboardAgenda(data?.events ?? [], now), [data?.events, now]);
  const deadlines = useMemo(() => {
    if (!data) return [];
    const end = new Date(now);
    end.setDate(end.getDate() + 14);
    end.setHours(23, 59, 59, 999);
    return dashboardDeadlines(projectCalendarItems(data.events, data.tasks, now, end), now);
  }, [data, now]);

  async function completeTask(id: number) {
    if (completingRef.current.has(id)) return;
    completingRef.current.add(id);
    setCompleting(new Set(completingRef.current));
    try {
      await apiClient.patch(`/tasks/${id}/status`, { status: 'concluida' });
      setData((previous) => previous ? { ...previous, tasks: previous.tasks.map((task) => task.id === id ? { ...task, status: 'concluida' } : task) } : previous);
      toast.success('Tarefa concluída.');
      reload();
      analytics.reload();
    } catch {
      toast.error('Não foi possível concluir a tarefa. Tente novamente.');
    } finally {
      completingRef.current.delete(id);
      setCompleting(new Set(completingRef.current));
    }
  }

  if (loading && !data) return <DashboardSkeleton />;
  if (!data) return <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto"><Card><div role="alert"><h1 className="font-serif text-2xl font-semibold text-ink">Seu dia está a um passo</h1><p className="text-sm text-graphite mt-2 mb-5">Não foi possível carregar suas atividades. Confira sua conexão e tente novamente.</p></div><Button onClick={reload} variant="outline" icon={<RefreshCw size={16} />}>Tentar novamente</Button></Card></div>;

  const overdue = priorities.filter((task) => task.due_date && task.due_date < today).length;
  const dueToday = priorities.filter((task) => task.due_date === today).length;
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Estudante';
  const subjects = [...data.summary.subjects_progress].filter((subject) => subject.total_tasks > 0).sort((a, b) => a.progress - b.progress);

  return <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto" aria-busy={loading}>
    <header className="flex flex-wrap justify-between items-end gap-5 animate-fade-in-up">
      <div><p className="text-sm text-muted mb-2">{formatLongDate(now)}</p><h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink">{greeting()}, {firstName}.</h1><p className="text-graphite mt-2 max-w-xl">Seu dia acadêmico, em ordem de importância.</p></div>
      <div className="flex flex-wrap gap-2"><Link to="/study/focus" className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium text-ink bg-surface hover:bg-surface-muted"><Timer size={16} /> Iniciar Focus</Link><Link to="/tasks?new=1" className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white bg-crimson hover:bg-crimson-dark"><Plus size={16} /> Nova tarefa</Link></div>
    </header>
    {error && <div role="alert" className="flex flex-wrap gap-3 items-center justify-between mt-5 p-3 border border-warning/30 bg-warning-soft text-warning text-sm rounded-md"><p>Não foi possível atualizar. Exibindo os últimos dados carregados.</p><button type="button" onClick={reload} className="underline font-medium">Tentar novamente</button></div>}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 py-6 mt-6 border-y border-border animate-fade-in-up">
      <Metric value={String(dueToday)} label="Entregas para hoje" detail={dueToday ? 'Resolva os prazos do dia' : 'Sem tarefas vencendo hoje'} />
      <Metric value={String(agenda.length)} label="Compromissos hoje" detail="Aulas, provas e blocos de estudo" />
      <Metric value={String(overdue)} label="Tarefas em atraso" detail={overdue ? 'Reavalie os prazos e priorize' : 'Prazos anteriores em dia'} alert={overdue > 0} />
      <Metric value={analytics.loading ? '…' : analytics.data ? formatMinutes(analytics.data.summary.studied_minutes) : '—'} label="Estudo nesta semana" detail="Tempo ativo de sessões concluídas" />
    </div>

    {data.summary.total_subjects === 0 && <Card className="mt-6"><div className="flex gap-4 items-start"><BookOpen size={24} className="text-crimson shrink-0 mt-1" aria-hidden="true" /><div><h2 className="font-serif text-xl text-ink font-semibold">Seu semestre começa aqui</h2><p className="text-sm text-graphite mt-1">Adicione sua primeira disciplina para conectar tarefas, materiais e estudos.</p><Link to="/subjects?new=1" className="inline-flex items-center gap-1 text-sm text-crimson font-medium mt-3 hover:underline">Criar disciplina <ArrowRight size={14} /></Link></div></div></Card>}

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
      <div className="xl:col-span-2 min-w-0 space-y-6"><PriorityTasks tasks={priorities} today={today} completing={completing} onComplete={completeTask} /><TodayAgenda events={agenda} today={today} /><UpcomingDeadlines events={deadlines} /></div>
      <aside className="min-w-0 space-y-6" aria-label="Visão da semana e disciplinas">
        <Card><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl font-semibold text-ink">Esta semana</h2><Link to="/academic-load" className="inline-flex items-center gap-1 text-sm text-crimson font-medium hover:underline">Ver carga <ArrowRight size={14} /></Link></div>
          {analytics.loading ? <div className="space-y-4 mt-5" role="status" aria-label="Carregando carga da semana"><Skeleton className="h-8 w-24" /><Skeleton className="h-2 w-full" /><Skeleton className="h-12 w-full" /></div> : analytics.error || !analytics.data ? <div className="mt-5 text-sm text-graphite"><p>Não foi possível calcular a carga da semana.</p><button type="button" onClick={analytics.reload} className="mt-3 font-medium text-crimson hover:underline">Tentar novamente</button></div> : <>
            <div className="flex justify-between gap-3 items-baseline mt-5"><p className={`font-serif text-3xl font-semibold tabular-nums ${analytics.data.summary.load_percent > 100 ? 'text-danger' : 'text-ink'}`}>{Math.round(analytics.data.summary.load_percent)}%</p><span className="text-xs text-muted">da capacidade semanal</span></div>
            <div className="mt-3"><ProgressBar value={analytics.data.summary.load_percent} tone={analytics.data.summary.load_percent > 100 ? 'crimson' : 'navy'} size="sm" /></div>
            <p className="text-sm text-graphite mt-3 leading-relaxed">{formatMinutes(analytics.data.summary.total_load_minutes)} previstos de {formatMinutes(analytics.data.summary.capacity_minutes)} disponíveis.</p>
            <dl className="space-y-3 border-t border-border pt-4 mt-4 text-sm"><div className="flex justify-between gap-3"><dt className="text-graphite">Estudo agendado</dt><dd className="font-medium text-ink tabular-nums">{formatMinutes(analytics.data.summary.planned_study_minutes)}</dd></div><div className="flex justify-between gap-3"><dt className="text-graphite">Dias com estudo</dt><dd className="font-medium text-ink tabular-nums">{analytics.data.summary.active_days}</dd></div></dl>
            {analytics.data.summary.unknown_estimate_tasks > 0 && <p className="text-xs text-muted mt-4">{analytics.data.summary.unknown_estimate_tasks} tarefas abertas ainda sem estimativa.</p>}
          </>}
        </Card>
        <Card><div className="flex items-center justify-between gap-3 mb-5"><h2 className="font-serif text-xl font-semibold text-ink">Suas disciplinas</h2><Link to="/subjects" className="text-sm text-graphite hover:text-crimson">Ver todas</Link></div>
          {subjects.length ? <div className="space-y-5">{subjects.slice(0, 5).map((subject) => <Link key={subject.subject_id} to={`/subjects/${subject.subject_id}`} className="block group"><div className="flex justify-between items-start gap-3 text-sm mb-2"><span className="font-medium text-ink group-hover:text-crimson break-words">{subject.subject_name}</span><span className="text-graphite tabular-nums shrink-0">{Math.round(subject.progress)}%</span></div><ProgressBar value={subject.progress} tone={subject.progress < 40 ? 'crimson' : 'navy'} size="sm" /><p className="text-xs text-muted mt-1.5">{subject.completed_tasks} de {subject.total_tasks} tarefas concluídas</p></Link>)}</div> : <p className="text-sm text-muted">O progresso aparece quando você adiciona tarefas às disciplinas.</p>}
        </Card>
        <Link to="/insights" className="flex items-center justify-between gap-3 p-5 rounded-lg border border-border text-sm text-ink bg-surface hover:bg-surface-muted"><span><span className="block font-medium">Entenda seu ritmo</span><span className="block text-xs text-muted mt-1">Estudos, consistência e entregas</span></span><ArrowRight size={18} className="text-crimson shrink-0" /></Link>
      </aside>
    </div>
  </div>;
}

function DashboardSkeleton() {
  return <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto" role="status" aria-label="Carregando seu dia acadêmico"><Skeleton className="h-4 w-48 mb-3" /><Skeleton className="h-10 w-64 mb-3" /><Skeleton className="h-4 w-72 max-w-full" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-6 border-y border-border mt-6">{[0, 1, 2, 3].map((item) => <div key={item}><Skeleton className="h-9 w-16 mb-3" /><Skeleton className="h-3 w-32 max-w-full" /></div>)}</div><div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6"><div className="xl:col-span-2 space-y-6"><Skeleton className="h-80 w-full" /><Skeleton className="h-64 w-full" /></div><Skeleton className="h-72 w-full" /></div><span className="sr-only">Carregando atividades.</span></div>;
}
