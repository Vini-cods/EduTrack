/**
 * Planejamento reutiliza Task e blocos CalendarEvent; execução vem de StudySession.
 * Nenhuma ação de agenda altera automaticamente conclusão ou tempo estudado.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Target, Timer } from 'lucide-react';
import { deleteGoal, setGoalStatus } from '../api/studyPlanner';
import { useStudyPlanner } from '../hooks/useStudyPlanner';
import type { GoalFilter, GoalSort } from '../lib/studyPlanner';
import { filterStudyGoals, formatStudyDuration, isStudyGoal, studyWeekSummary, upcomingStudyBlocks } from '../lib/studyPlanner';
import { toDatetimeLocalValue } from '../lib/calendar';
import type { Task, TaskWithSubject } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { ScheduleStudyModal } from '../components/study/ScheduleStudyModal';
import { StudyGoalRow } from '../components/study/StudyGoalRow';

const FILTERS: { value: GoalFilter; label: string }[] = [
  { value: 'active', label: 'Em aberto' }, { value: 'week', label: 'Prazo nesta semana' },
  { value: 'overdue', label: 'Atrasados' }, { value: 'unscheduled', label: 'Sem próximo bloco' },
  { value: 'completed', label: 'Concluídos' }, { value: 'all', label: 'Todos' },
];
const selectClass = 'min-h-11 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-crimson/30';

export const StudyPlanner: React.FC = () => {
  const { data, loading, error, reload } = useStudyPlanner();
  const [searchParams, setSearchParams] = useSearchParams();
  const [now, setNow] = useState(() => new Date());
  const [filter, setFilter] = useState<GoalFilter>('active');
  const [subjectId, setSubjectId] = useState('');
  const [sort, setSort] = useState<GoalSort>('priority');
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskWithSubject | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const mutationLock = useRef(new Set<number>());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setEditTarget(null);
    setGoalModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const goals = useMemo(() => data ? filterStudyGoals(data.tasks, data.events, filter, subjectId, sort, now) : [], [data, filter, subjectId, sort, now]);
  const blocks = useMemo(() => upcomingStudyBlocks(data?.events || [], now), [data, now]);
  const summary = useMemo(() => data ? studyWeekSummary(data.tasks, data.events, data.sessions, now) : null, [data, now]);
  const hasGoals = data?.tasks.some(isStudyGoal);

  const mutate = async (task: TaskWithSubject, action: 'complete' | 'delete') => {
    if (mutationLock.current.has(task.id)) return;
    mutationLock.current.add(task.id);
    setBusyIds(new Set(mutationLock.current));
    try {
      if (action === 'delete') {
        await deleteGoal(task.id);
        setDeleteTarget(null);
        toast.success('Objetivo excluído.');
      } else {
        await setGoalStatus(task.id, task.status === 'concluida' ? 'pendente' : 'concluida');
        toast.success(task.status === 'concluida' ? 'Objetivo reaberto.' : 'Objetivo concluído.');
      }
      await reload();
    } catch { toast.error('Não foi possível atualizar o objetivo. Tente novamente.'); }
    finally {
      mutationLock.current.delete(task.id);
      setBusyIds(new Set(mutationLock.current));
    }
  };

  const closeGoal = () => { setGoalModalOpen(false); setEditTarget(null); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <SectionHeader title="Study Planner" eyebrow="Organize seu próximo passo"
        description="Defina o que estudar, reserve tempo na agenda e acompanhe o que realizou."
        action={<div className="flex flex-wrap gap-2">
          <Link to="/study/focus" className="inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm text-ink border border-border-strong rounded-lg hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-crimson"><Timer size={16} /> Iniciar foco</Link>
          <Button icon={<Plus size={16} />} disabled={!data || loading || !!error} onClick={() => { setEditTarget(null); setGoalModalOpen(true); }}>Novo objetivo</Button>
        </div>} />

      {error && <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4 border border-danger/30 rounded-lg bg-danger/5">
        <p className="text-sm text-danger">{error}{data ? ' Os dados exibidos são da última atualização.' : ''}</p>
        <Button variant="outline" icon={<RefreshCw size={15} />} loading={loading} onClick={() => void reload()}>Tentar novamente</Button>
      </div>}

      {!data && loading ? <Card className="mt-6" aria-label="Carregando planejamento" aria-busy="true">
        <Skeleton className="h-6 w-40 mb-5" /><Skeleton className="h-24 w-full mb-4" /><Skeleton className="h-24 w-full" />
      </Card> : data && <>
        {summary && <Card variant="accent" className="mt-6 animate-fade-in-up">
          <div className="flex flex-wrap justify-between gap-3">
            <div><h2 className="font-serif text-xl font-semibold text-ink">Esta semana</h2>
              <p className="text-sm text-graphite mt-1">{summary.count} {summary.count === 1 ? 'objetivo em aberto com prazo nesta semana' : 'objetivos em aberto com prazo nesta semana'}.</p></div>
            <Button variant="ghost" icon={<RefreshCw size={15} />} loading={loading} onClick={() => void reload()}>Atualizar</Button>
          </div>
          <dl className="grid sm:grid-cols-3 gap-5 mt-5 pt-5 border-t border-border">
            <div><dt className="text-xs text-graphite">Estimativa dos objetivos em aberto</dt><dd className="font-serif text-2xl text-ink mt-1 tabular-nums">{formatStudyDuration(summary.estimatedSeconds)}</dd></div>
            <div><dt className="text-xs text-graphite">Tempo reservado na agenda</dt><dd className="font-serif text-2xl text-navy mt-1 tabular-nums">{formatStudyDuration(summary.scheduledSeconds)}</dd></div>
            <div><dt className="text-xs text-graphite">Tempo realizado em sessões concluídas</dt><dd className="font-serif text-2xl text-ink mt-1 tabular-nums">{formatStudyDuration(summary.studiedSeconds)}</dd></div>
          </dl>
          <p className="text-xs text-muted mt-4">Sessões concluídas são contabilizadas na semana em que começaram. Agendar tempo não conclui um objetivo.</p>
        </Card>}

        {blocks.length > 0 && <section className="mt-7" aria-labelledby="next-blocks-title">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3"><h2 id="next-blocks-title" className="font-serif text-lg font-semibold text-ink">Próximos blocos de estudo</h2><Link className="text-sm text-navy underline underline-offset-2 py-2" to="/calendar">Abrir calendário</Link></div>
          <Card padding="none"><ul className="divide-y divide-border">{blocks.slice(0, 4).map((event) => <li key={event.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-sm font-medium text-ink break-words">{event.title}</p><p className="text-xs text-graphite mt-1">
              {new Date(event.start_datetime).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}{event.subject_name ? ' · ' + event.subject_name : ''}
            </p></div>
            <Link to={'/calendar?date=' + toDatetimeLocalValue(new Date(event.start_datetime)).slice(0, 10)} className="min-h-11 inline-flex items-center text-sm text-navy underline underline-offset-2">Ver na agenda</Link>
          </li>)}</ul></Card>
        </section>}

        <section className="mt-7" aria-labelledby="goals-title" aria-busy={loading}>
          <h2 id="goals-title" className="font-serif text-lg font-semibold text-ink mb-3">Objetivos de estudo</h2>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-graphite">Exibir<select value={filter} onChange={(event) => setFilter(event.target.value as GoalFilter)} className={selectClass}>{FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-graphite">Disciplina<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className={selectClass}><option value="">Todas as disciplinas</option>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-graphite">Ordenar por<select value={sort} onChange={(event) => setSort(event.target.value as GoalSort)} className={selectClass}><option value="priority">Prioridade e prazo</option><option value="deadline">Prazo mais próximo</option></select></label>
          </div>
          <p className="text-xs text-muted mb-3" role="status">{goals.length} {goals.length === 1 ? 'objetivo encontrado' : 'objetivos encontrados'}. Tarefas com estimativa também aparecem aqui.</p>
          <Card padding="none">
            {goals.length ? <ul className="divide-y divide-border">{goals.map((task) => <StudyGoalRow key={task.id} task={task} blocks={blocks.filter((event) => event.task_id === task.id)} busy={busyIds.has(task.id) || loading || !!error}
              onComplete={() => void mutate(task, 'complete')} onEdit={() => { setEditTarget(task); setGoalModalOpen(true); }}
              onSchedule={() => setScheduleTarget(task)} onDelete={() => setDeleteTarget(task)} />)}</ul>
              : <div className="p-5 sm:p-8"><EmptyState icon={Target} title={hasGoals ? 'Nenhum objetivo neste filtro' : 'Seu próximo estudo começa aqui'}
                description={hasGoals ? 'Ajuste os filtros ou crie um objetivo para o próximo conteúdo.' : 'Escolha uma disciplina, defina o conteúdo e estime o tempo. Depois, divida seu estudo em blocos na agenda.'}
                action={{ label: hasGoals ? 'Limpar filtros' : 'Novo objetivo', icon: <Plus size={15} />, onClick: () => {
                  if (hasGoals) { setFilter('all'); setSubjectId(''); } else setGoalModalOpen(true);
                } }} /></div>}
          </Card>
        </section>
      </>}

      {data && (data.subjects.length === 0 && goalModalOpen ? <Modal open onClose={closeGoal} ariaLabel="Cadastre uma disciplina" panelClassName="max-w-md">
        <div className="p-6"><h2 className="font-serif text-xl text-ink">Comece pela disciplina</h2><p className="text-sm text-graphite my-4">Todo objetivo pertence a uma disciplina. Cadastre a primeira para organizar seus estudos.</p><div className="flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center text-crimson underline" to="/subjects?new=1">Criar disciplina</Link><Button variant="ghost" onClick={closeGoal}>Fechar</Button></div></div>
      </Modal> : <TaskFormModal open={goalModalOpen} task={editTarget} studyGoal subjects={data.subjects} onClose={closeGoal}
        onCreated={(task) => setScheduleTarget(task)} onSaved={() => { closeGoal(); void reload(); }} />)}
      <ScheduleStudyModal task={scheduleTarget} events={data?.events || []} ready={!!data && !loading && !error} onClose={() => setScheduleTarget(null)} onScheduled={() => void reload()} />
      <Modal open={!!deleteTarget} onClose={() => { if (!deleteTarget || !busyIds.has(deleteTarget.id)) setDeleteTarget(null); }} ariaLabel="Excluir objetivo de estudo" panelClassName="max-w-md">
        <div className="p-6"><h2 className="font-serif text-xl font-semibold text-ink">Excluir objetivo?</h2><p className="text-sm text-graphite mt-3 break-words">{deleteTarget?.title}</p>
          <div className="flex justify-end gap-2 mt-6"><Button variant="ghost" disabled={!!deleteTarget && busyIds.has(deleteTarget.id)} onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" loading={!!deleteTarget && busyIds.has(deleteTarget.id)} onClick={() => { if (deleteTarget) void mutate(deleteTarget, 'delete'); }}>Excluir objetivo</Button></div></div>
      </Modal>
    </div>
  );
};
