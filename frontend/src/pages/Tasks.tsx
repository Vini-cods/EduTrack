import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import type { TaskWithSubject, Subject } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { RowSkeleton } from '../components/ui/Skeleton';
import { isDueToday, isPastDue, isThisWeek, formatShortDate } from '../lib/date';
import { PRIORITY_META, PRIORITY_ORDER } from '../lib/tasks';
import { ClipboardList, Plus, Trash2, Circle, CheckCircle2 } from 'lucide-react';
import type { TaskPriority } from '../types';

type TabKey = 'todas' | 'hoje' | 'semana' | 'atrasadas' | 'concluida';

interface TaskFormValues {
  title: string;
  subject_id: string;
  due_date: string;
  priority: TaskPriority;
}

export const Tasks: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<TaskWithSubject[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tab, setTab] = useState<TabKey>('todas');
  const [subjectFilter, setSubjectFilter] = useState('todas');
  const [sortBy, setSortBy] = useState<'due_date' | 'created_at' | 'priority'>('due_date');
  const [showForm, setShowForm] = useState(false);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightId = searchParams.get('highlight');

  const { register, handleSubmit, reset } = useForm<TaskFormValues>();

  const loadTasks = () => {
    apiClient.get('/tasks/').then((res) => setTasks(res.data)).catch(console.error);
  };

  useEffect(() => {
    loadTasks();
    apiClient.get('/subjects/').then((res) => setSubjects(res.data)).catch(console.error);
  }, []);

  // Abre o formulário automaticamente quando chega via Command Palette (?new=1)
  // e limpa o parâmetro da URL para não reabrir num refresh.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rola até a tarefa vinda de notificações/Command Palette (?highlight=ID) e
  // remove o destaque/param depois de alguns segundos. Reseta os filtros para
  // garantir que a tarefa de destino não fique escondida por um filtro/aba
  // que já estivesse ativo antes de chegar aqui.
  useEffect(() => {
    if (!highlightId || !tasks) return;
    setTab('todas');
    setSubjectFilter('todas');
    const raf = requestAnimationFrame(() => {
      rowRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('highlight');
      setSearchParams(next, { replace: true });
    }, 2200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, tasks]);

  const onCreate = handleSubmit(async (values) => {
    try {
      await apiClient.post('/tasks/', {
        title: values.title,
        subject_id: Number(values.subject_id),
        due_date: values.due_date || null,
        priority: values.priority || 'media',
      });
      toast.success('Tarefa criada.');
      reset();
      setShowForm(false);
      loadTasks();
    } catch {
      toast.error('Não foi possível criar a tarefa.');
    }
  });

  const onToggleComplete = async (task: TaskWithSubject) => {
    const nextStatus = task.status === 'concluida' ? 'pendente' : 'concluida';
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)) ?? null);
    try {
      await apiClient.patch(`/tasks/${task.id}/status`, { status: nextStatus });
      if (nextStatus === 'concluida') toast.success('Tarefa concluída!');
    } catch {
      toast.error('Não foi possível atualizar a tarefa.');
      loadTasks();
    }
  };

  const onChangeStatus = async (taskId: number, status: string) => {
    setTasks((prev) => prev?.map((t) => (t.id === taskId ? { ...t, status: status as TaskWithSubject['status'] } : t)) ?? null);
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status });
    } catch {
      toast.error('Não foi possível atualizar o status.');
      loadTasks();
    }
  };

  const onDelete = async (taskId: number) => {
    if (!window.confirm('Excluir esta tarefa? Essa ação não pode ser desfeita.')) return;
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      toast.success('Tarefa excluída.');
      loadTasks();
    } catch {
      toast.error('Não foi possível excluir a tarefa.');
    }
  };

  const subjectScoped = useMemo(() => {
    const list = tasks ?? [];
    return subjectFilter === 'todas' ? list : list.filter((t) => String(t.subject_id) === subjectFilter);
  }, [tasks, subjectFilter]);

  const counts = useMemo<Record<TabKey, number>>(
    () => ({
      todas: subjectScoped.length,
      hoje: subjectScoped.filter((t) => isDueToday(t.due_date)).length,
      semana: subjectScoped.filter((t) => isThisWeek(t.due_date)).length,
      atrasadas: subjectScoped.filter((t) => t.status !== 'concluida' && isPastDue(t.due_date)).length,
      concluida: subjectScoped.filter((t) => t.status === 'concluida').length,
    }),
    [subjectScoped]
  );

  const filtered = useMemo(() => {
    let list = subjectScoped;
    if (tab === 'hoje') list = list.filter((t) => isDueToday(t.due_date));
    else if (tab === 'semana') list = list.filter((t) => isThisWeek(t.due_date));
    else if (tab === 'atrasadas') list = list.filter((t) => t.status !== 'concluida' && isPastDue(t.due_date));
    else if (tab === 'concluida') list = list.filter((t) => t.status === 'concluida');

    if (sortBy === 'created_at') {
      list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (sortBy === 'priority') {
      list = [...list].sort((a, b) => PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight);
    }
    return list;
  }, [subjectScoped, tab, sortBy]);

  const loading = tasks === null;
  const isUnfiltered = tab === 'todas' && subjectFilter === 'todas';

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <SectionHeader
        title="Tarefas"
        description="Visualize e gerencie todas as suas tarefas em um só lugar."
        action={
          <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowForm((v) => !v)}>
            Nova tarefa
          </Button>
        }
      />

      {showForm && (
        <Card className="mt-6 animate-scale-in" padding="md">
          <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-graphite mb-1 block">Disciplina</label>
              <select
                {...register('subject_id', { required: true })}
                defaultValue=""
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-crimson/20"
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
            <div className="flex-[2] min-w-[220px]">
              <label className="text-xs text-graphite mb-1 block">Título</label>
              <input
                {...register('title', { required: true })}
                placeholder="Ex.: Estudar árvores AVL"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-crimson/20"
              />
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs text-graphite mb-1 block">Prazo (opcional)</label>
              <input
                type="date"
                {...register('due_date')}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-crimson/20"
              />
            </div>
            <div className="min-w-[130px]">
              <label className="text-xs text-graphite mb-1 block">Prioridade</label>
              <select
                {...register('priority')}
                defaultValue="media"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                {PRIORITY_ORDER.slice().reverse().map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Criar</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </form>
          {subjects.length === 0 && (
            <p className="text-xs text-warning mt-3">
              Você ainda não tem nenhuma disciplina — crie uma disciplina antes de adicionar tarefas.
            </p>
          )}
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-4">
        <Tabs
          value={tab}
          onChange={(k) => setTab(k as TabKey)}
          tabs={[
            { key: 'todas', label: 'Todas', count: counts.todas },
            { key: 'hoje', label: 'Hoje', count: counts.hoje },
            { key: 'semana', label: 'Semana', count: counts.semana },
            { key: 'atrasadas', label: 'Atrasadas', count: counts.atrasadas },
            { key: 'concluida', label: 'Concluídas', count: counts.concluida },
          ]}
        />
        <div className="flex items-center gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-graphite cursor-pointer"
          >
            <option value="todas">Todas as disciplinas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'due_date' | 'created_at' | 'priority')}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-graphite cursor-pointer"
          >
            <option value="due_date">Ordenar por prazo</option>
            <option value="priority">Ordenar por prioridade</option>
            <option value="created_at">Ordenar por criação</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Card padding="none">
          <div className="divide-y divide-border">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma tarefa encontrada"
            description={
              isUnfiltered
                ? 'Crie sua primeira tarefa para começar a organizar seus estudos.'
                : 'Nenhuma tarefa corresponde a esse filtro.'
            }
            action={
              isUnfiltered ? { label: 'Nova tarefa', icon: <Plus size={15} />, onClick: () => setShowForm(true) } : undefined
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border">
            {filtered.map((task) => {
              const overdue = task.status !== 'concluida' && isPastDue(task.due_date);
              return (
                <div
                  key={task.id}
                  ref={(el) => {
                    rowRefs.current[String(task.id)] = el;
                  }}
                  className={`flex items-center gap-3 p-4 transition-colors duration-700 ${
                    String(task.id) === highlightId ? 'bg-crimson-soft' : ''
                  }`}
                >
                  <button
                    onClick={() => onToggleComplete(task)}
                    className={`shrink-0 transition-colors cursor-pointer ${
                      task.status === 'concluida' ? 'text-success' : 'text-muted hover:text-success'
                    }`}
                    aria-label={task.status === 'concluida' ? 'Marcar como pendente' : 'Marcar como concluída'}
                  >
                    {task.status === 'concluida' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium truncate ${
                        task.status === 'concluida' ? 'line-through text-muted' : 'text-ink'
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {task.subject_name}
                      {task.due_date ? ` · ${formatShortDate(task.due_date)}` : ' · sem prazo'}
                      {task.estimated_hours ? ` · ${task.estimated_hours}h` : ''}
                    </p>
                  </div>

                  {(task.priority === 'urgente' || task.priority === 'alta') && (
                    <Badge tone={PRIORITY_META[task.priority].tone} size="sm">
                      {PRIORITY_META[task.priority].label}
                    </Badge>
                  )}

                  {overdue && (
                    <Badge tone="danger" size="sm">
                      Atrasada
                    </Badge>
                  )}

                  <select
                    value={task.status}
                    onChange={(e) => onChangeStatus(task.id, e.target.value)}
                    className="text-xs border border-border rounded-md px-2 py-1.5 bg-surface text-graphite shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>

                  <button
                    onClick={() => onDelete(task.id)}
                    className="text-muted hover:text-danger transition-colors cursor-pointer shrink-0"
                    aria-label="Excluir tarefa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
