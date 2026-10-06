/**
 * Study Planner — PLANEJAMENTO, não execução.
 *
 * Um "objetivo de estudo" aqui é uma Task com `estimated_hours` preenchido —
 * não uma entidade própria. Isso evita duplicar título/disciplina/prazo/
 * status numa tabela separada (Task já resolve isso).
 *
 * Importante: esta página representa INTENÇÃO (o que planejo estudar, com
 * que prioridade e em quanto tempo) — não EXECUÇÃO (quanto tempo eu de fato
 * estudei). Agendar uma sessão aqui cria um CalendarEvent(categoria=estudo)
 * vinculado à tarefa via `task_id`, mas isso ainda é planejamento ("quando
 * pretendo estudar"), não um registro de tempo efetivamente estudado.
 *
 * Essa segunda parte (execução real, cronômetro, histórico de sessões)
 * pertence a uma futura entidade `StudySession`, ligada ao Focus/Pomodoro —
 * que ainda não existe. Não introduza aqui nenhum campo de "tempo
 * efetivamente gasto"; isso pertenceria a StudySession, não a Task/CalendarEvent.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Target, Plus, CalendarPlus, CalendarCheck, Circle, CheckCircle2, Trash2, Timer } from 'lucide-react';
import apiClient from '../api/client';
import type { TaskWithSubject, Subject, TaskPriority, CalendarEventWithSubject } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { PRIORITY_META, PRIORITY_ORDER } from '../lib/tasks';
import { formatShortDate, isThisWeek } from '../lib/date';
import { toDatetimeLocalValue } from '../lib/calendar';

interface GoalFormValues {
  title: string;
  subject_id: string;
  description: string;
  estimated_hours: string;
  due_date: string;
  priority: TaskPriority;
}

const priorityDotColor: Record<TaskPriority, string> = {
  urgente: 'var(--color-crimson)',
  alta: 'var(--color-warning)',
  media: 'var(--color-navy)',
  baixa: 'var(--color-muted)',
};

export const StudyPlanner: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<TaskWithSubject[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [events, setEvents] = useState<CalendarEventWithSubject[]>([]);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<TaskWithSubject | null>(null);

  const loadAll = () => {
    apiClient.get('/tasks/').then((res) => setTasks(res.data)).catch(console.error);
    apiClient.get('/calendar-events/').then((res) => setEvents(res.data)).catch(console.error);
  };

  useEffect(() => {
    loadAll();
    apiClient.get('/subjects/').then((res) => setSubjects(res.data)).catch(console.error);
  }, []);

  // "Novo objetivo de estudo" vindo do Command Palette (?new=1)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setGoalModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onToggleComplete = async (task: TaskWithSubject) => {
    const nextStatus = task.status === 'concluida' ? 'pendente' : 'concluida';
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)) ?? null);
    try {
      await apiClient.patch(`/tasks/${task.id}/status`, { status: nextStatus });
      if (nextStatus === 'concluida') toast.success('Objetivo concluído!');
    } catch {
      toast.error('Não foi possível atualizar.');
      loadAll();
    }
  };

  const onDelete = async (taskId: number) => {
    if (!window.confirm('Excluir este objetivo de estudo?')) return;
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      toast.success('Objetivo excluído.');
      loadAll();
    } catch {
      toast.error('Não foi possível excluir.');
    }
  };

  const studyTasks = useMemo(() => (tasks ?? []).filter((t) => t.estimated_hours != null), [tasks]);

  const eventByTaskId = useMemo(() => {
    const map = new Map<number, CalendarEventWithSubject>();
    events.forEach((e) => {
      if (e.task_id) map.set(e.task_id, e);
    });
    return map;
  }, [events]);

  const grouped = useMemo(
    () =>
      PRIORITY_ORDER.map((priority) => ({
        priority,
        items: studyTasks
          .filter((t) => t.priority === priority)
          .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')),
      })).filter((g) => g.items.length > 0),
    [studyTasks]
  );

  const weekSummary = useMemo(() => {
    const pending = studyTasks.filter((t) => t.status !== 'concluida' && isThisWeek(t.due_date));
    const totalHours = pending.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    return { count: pending.length, totalHours };
  }, [studyTasks]);

  const loading = tasks === null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <SectionHeader
        title="Study Planner"
        description="Planeje o que estudar, com prioridade e tempo estimado — não apenas o que entregar."
        action={
          <div className="flex gap-2">
            <Button variant="outline" icon={<Timer size={16} />} onClick={() => navigate('/study/focus')}>
              Iniciar foco
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => setGoalModalOpen(true)}>
              Novo objetivo
            </Button>
          </div>
        }
      />

      {!loading && studyTasks.length > 0 && (
        <Card className="mt-6 animate-fade-in-up" variant="accent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink">Esta semana</h2>
              <p className="text-sm text-graphite mt-0.5">
                {weekSummary.count === 0
                  ? 'Nenhum objetivo com prazo para esta semana.'
                  : `${weekSummary.count} ${weekSummary.count === 1 ? 'objetivo' : 'objetivos'} pendente${
                      weekSummary.count === 1 ? '' : 's'
                    } com prazo esta semana.`}
              </p>
            </div>
            {weekSummary.totalHours > 0 && (
              <p className="font-serif text-3xl font-semibold text-ink tabular-nums text-right">
                {weekSummary.totalHours}h
                <span className="block text-xs font-sans font-normal text-graphite">planejadas</span>
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="mt-6 space-y-6">
        {loading ? (
          <Card padding="lg">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-16 w-full mb-2" />
            <Skeleton className="h-16 w-full" />
          </Card>
        ) : studyTasks.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={Target}
              title="Nenhum objetivo de estudo ainda"
              description='Crie objetivos como "Estudar Árvores Binárias" com disciplina, prazo, prioridade e tempo estimado — diferente de uma tarefa genérica de entrega.'
              action={{ label: 'Novo objetivo', icon: <Plus size={15} />, onClick: () => setGoalModalOpen(true) }}
            />
          </Card>
        ) : (
          grouped.map(({ priority, items }) => (
            <div key={priority}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityDotColor[priority] }} />
                <h2 className="text-sm font-semibold text-graphite">
                  Prioridade {PRIORITY_META[priority].label} · {items.length}
                </h2>
              </div>
              <Card padding="none">
                <div className="divide-y divide-border">
                  {items.map((task) => {
                    const linkedEvent = eventByTaskId.get(task.id);
                    return (
                      <div key={task.id} className="flex items-start gap-3 p-4">
                        <button
                          onClick={() => onToggleComplete(task)}
                          className={`shrink-0 mt-0.5 transition-colors cursor-pointer ${
                            task.status === 'concluida' ? 'text-success' : 'text-muted hover:text-success'
                          }`}
                          aria-label="Alternar conclusão"
                        >
                          {task.status === 'concluida' ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${
                              task.status === 'concluida' ? 'line-through text-muted' : 'text-ink'
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.description && <p className="text-sm text-graphite mt-0.5">{task.description}</p>}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted">
                            <Badge tone="neutral" size="sm">
                              {task.subject_name}
                            </Badge>
                            <span>{task.estimated_hours}h estimadas</span>
                            {task.due_date && <span>Prazo: {formatShortDate(task.due_date)}</span>}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/study/focus?task_id=${task.id}`)}
                            className="text-xs font-medium text-crimson hover:text-crimson-dark inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Timer size={13} />
                            Focar
                          </button>
                          {linkedEvent ? (
                            <Link
                              to={`/calendar?date=${linkedEvent.start_datetime.slice(0, 10)}`}
                              className="text-xs font-medium text-navy hover:text-navy-dark inline-flex items-center gap-1"
                            >
                              <CalendarCheck size={13} />
                              {formatShortDate(linkedEvent.start_datetime.slice(0, 10))}
                            </Link>
                          ) : (
                            <button
                              onClick={() => setScheduleTarget(task)}
                              className="text-xs font-medium text-graphite hover:text-ink inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CalendarPlus size={13} />
                              Agendar
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(task.id)}
                            className="text-muted hover:text-danger transition-colors cursor-pointer"
                            aria-label="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))
        )}
      </div>

      <GoalModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        subjects={subjects}
        onCreated={(task) => {
          setGoalModalOpen(false);
          loadAll();
          setScheduleTarget(task);
        }}
      />

      <ScheduleModal task={scheduleTarget} onClose={() => setScheduleTarget(null)} onScheduled={loadAll} />
    </div>
  );
};

// --- Sub-componentes (específicos desta página, não reutilizados em outro lugar) ---

const GoalModal: React.FC<{
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  onCreated: (task: TaskWithSubject) => void;
}> = ({ open, onClose, subjects, onCreated }) => {
  const { register, handleSubmit, reset } = useForm<GoalFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) reset({ title: '', subject_id: '', description: '', estimated_hours: '', due_date: '', priority: 'media' });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const res = await apiClient.post('/tasks/', {
        title: values.title,
        subject_id: Number(values.subject_id),
        description: values.description || null,
        due_date: values.due_date || null,
        priority: values.priority,
        estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : null,
      });
      toast.success('Objetivo de estudo criado.');
      onCreated(res.data);
    } catch {
      toast.error('Não foi possível criar o objetivo.');
    } finally {
      setSaving(false);
    }
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Novo objetivo de estudo" panelClassName="max-w-lg">
      <form onSubmit={onSubmit} className="p-6">
        <h2 className="font-serif text-xl font-semibold text-ink mb-5">Novo objetivo de estudo</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1.5">Objetivo</label>
            <input
              {...register('title', { required: true })}
              placeholder='Ex.: "Estudar Estruturas de Dados"'
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Disciplina</label>
              <select
                {...register('subject_id', { required: true })}
                defaultValue=""
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Prioridade</label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                {PRIORITY_ORDER.slice()
                  .reverse()
                  .map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1.5">Conteúdo (opcional)</label>
            <input
              {...register('description')}
              placeholder="Ex.: Árvores Binárias"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Tempo estimado (h)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                {...register('estimated_hours', { required: true })}
                placeholder="2"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Prazo</label>
              <input
                type="date"
                {...register('due_date')}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 mt-6 pt-5 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Criar objetivo
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ScheduleModal: React.FC<{
  task: TaskWithSubject | null;
  onClose: () => void;
  onScheduled: () => void;
}> = ({ task, onClose, onScheduled }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setDate(task.due_date || toDatetimeLocalValue(new Date()).slice(0, 10));
      setTime('19:00');
    }
  }, [task]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !date) return;
    setSaving(true);
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + (task.estimated_hours || 1) * 60 * 60 * 1000);
    try {
      await apiClient.post('/calendar-events/', {
        title: task.title,
        category: 'estudo',
        subject_id: task.subject_id,
        task_id: task.id,
        start_datetime: toDatetimeLocalValue(start),
        end_datetime: toDatetimeLocalValue(end),
      });
      toast.success('Sessão agendada no calendário.');
      onScheduled();
      onClose();
    } catch {
      toast.error('Não foi possível agendar a sessão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!task} onClose={onClose} ariaLabel="Agendar sessão de estudo" panelClassName="max-w-sm">
      <form onSubmit={onSubmit} className="p-6">
        <h2 className="font-serif text-lg font-semibold text-ink mb-1">Agendar sessão</h2>
        <p className="text-sm text-graphite mb-5">
          Quando você vai estudar &quot;<span className="text-ink font-medium">{task?.title}</span>&quot;?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1.5">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1.5">Horário</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
          </div>
        </div>
        <p className="text-xs text-muted mt-2">Duração de {task?.estimated_hours || 1}h, a partir do horário escolhido.</p>
        <div className="flex justify-end gap-2.5 mt-6 pt-5 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Pular
          </Button>
          <Button type="submit" loading={saving}>
            Agendar
          </Button>
        </div>
      </form>
    </Modal>
  );
};
