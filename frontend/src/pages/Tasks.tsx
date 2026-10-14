import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import type { TaskWithSubject, Subject, TaskStatus } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { RowSkeleton } from '../components/ui/Skeleton';
import { isDueToday, isPastDue, isThisWeek, formatShortDate, getDueDateStatus, DUE_DATE_TEXT_CLASS } from '../lib/date';
import { PRIORITY_META } from '../lib/tasks';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { ClipboardList, Plus, Trash2, Pencil, Circle, CheckCircle2 } from 'lucide-react';

type TabKey = 'todas' | 'hoje' | 'semana' | 'atrasadas' | 'concluida';

export const Tasks: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<TaskWithSubject[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tab, setTab] = useState<TabKey>('todas');
  const [subjectFilter, setSubjectFilter] = useState('todas');
  const [sortBy, setSortBy] = useState<'due_date' | 'created_at' | 'priority'>('due_date');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithSubject | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const pendingTaskIds = useRef(new Set<number>());
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightId = searchParams.get('highlight');

  const loadTasks = () => {
    setLoadError(false);
    apiClient.get<TaskWithSubject[]>('/tasks/').then((res) => setTasks(res.data)).catch(() => setLoadError(true));
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

  const markPending = (taskId: number, pending: boolean) => {
    if (pending) pendingTaskIds.current.add(taskId);
    else pendingTaskIds.current.delete(taskId);
    setPendingIds([...pendingTaskIds.current]);
  };

  const onChangeStatus = async (taskId: number, status: TaskStatus) => {
    if (pendingTaskIds.current.has(taskId)) return;
    markPending(taskId, true);
    setTasks((prev) => prev?.map((t) => (t.id === taskId ? { ...t, status } : t)) ?? null);
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status });
      toast.success(status === 'concluida' ? 'Tarefa concluída!' : 'Status atualizado.');
    } catch {
      toast.error('Não foi possível atualizar o status.');
      loadTasks();
    } finally { markPending(taskId, false); }
  };

  const onDelete = async (taskId: number) => {
    if (pendingTaskIds.current.has(taskId)) return;
    if (!window.confirm('Excluir esta tarefa e seu prazo do calendário? Eventos agendados e histórico de estudo serão preservados. Esta ação não pode ser desfeita.')) return;
    markPending(taskId, true);
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      toast.success('Tarefa excluída.');
      loadTasks();
    } catch {
      toast.error('Não foi possível excluir a tarefa.');
    } finally { markPending(taskId, false); }
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
    } else {
      list = [...list].sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
    }
    return list;
  }, [subjectScoped, tab, sortBy]);

  const loading = tasks === null;
  const isUnfiltered = tab === 'todas' && subjectFilter === 'todas';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <SectionHeader
        title="Tarefas"
        description="Organize entregas e estudos. Tarefas com prazo aparecem automaticamente no calendário."
        action={
          <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowForm((v) => !v)}>
            Nova tarefa
          </Button>
        }
      />

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
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <select
            value={subjectFilter}
            aria-label="Filtrar tarefas por disciplina"
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="max-w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-graphite cursor-pointer"
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
            aria-label="Ordenar tarefas"
            onChange={(e) => setSortBy(e.target.value as 'due_date' | 'created_at' | 'priority')}
            className="max-w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-graphite cursor-pointer"
          >
            <option value="due_date">Ordenar por prazo</option>
            <option value="priority">Ordenar por prioridade</option>
            <option value="created_at">Ordenar por criação</option>
          </select>
        </div>
      </div>

      {loadError && <div role="alert" className="mb-4 p-4 border border-danger/30 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-danger">Não foi possível carregar as tarefas.</p><Button variant="outline" onClick={loadTasks}>Tentar novamente</Button>
      </div>}
      {loading && !loadError ? (
        <Card padding="none">
          <div className="divide-y divide-border">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        </Card>
      ) : loading ? null : filtered.length === 0 ? (
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
              const dueDateStatus = task.status === 'concluida' ? null : getDueDateStatus(task.due_date);
              return (
                <div
                  key={task.id}
                  ref={(el) => {
                    rowRefs.current[String(task.id)] = el;
                  }}
                  className={`flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 transition-colors duration-700 ${
                    String(task.id) === highlightId ? 'bg-crimson-soft' : ''
                  }`}
                >
                  <button
                    onClick={() => onChangeStatus(task.id, task.status === 'concluida' ? 'pendente' : 'concluida')}
                    disabled={pendingIds.includes(task.id)}
                    className={`shrink-0 transition-colors cursor-pointer ${
                      task.status === 'concluida' ? 'text-success' : 'text-muted hover:text-success'
                    }`}
                    aria-label={task.status === 'concluida' ? 'Marcar como pendente' : 'Marcar como concluída'}
                  >
                    {task.status === 'concluida' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>

                  <div className="min-w-0 flex-1 basis-[65%] sm:basis-auto">
                    <p
                      className={`text-sm font-medium truncate ${
                        task.status === 'concluida' ? 'line-through text-muted' : 'text-ink'
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs truncate">
                      <span className="text-muted">{task.subject_name}</span>
                      {task.status !== 'concluida' && (
                        <span className={DUE_DATE_TEXT_CLASS[dueDateStatus!]}>
                          {' · '}
                          {dueDateStatus === 'sem_prazo' ? 'Sem prazo' : formatShortDate(task.due_date!)}
                        </span>
                      )}
                      {task.status === 'concluida' && task.due_date && (
                        <span className="text-muted"> · {formatShortDate(task.due_date)}</span>
                      )}
                      {task.estimated_hours && <span className="text-muted"> · {task.estimated_hours}h</span>}
                    </p>
                  </div>

                  {(task.priority === 'urgente' || task.priority === 'alta') && (
                    <Badge tone={PRIORITY_META[task.priority].tone} size="sm">
                      {PRIORITY_META[task.priority].label}
                    </Badge>
                  )}

                  {dueDateStatus === 'atrasada' && (
                    <Badge tone="danger" size="sm">
                      Atrasada
                    </Badge>
                  )}
                  {dueDateStatus === 'hoje' && (
                    <Badge tone="warning" size="sm">
                      Hoje
                    </Badge>
                  )}

                  <select
                    value={task.status}
                    aria-label={`Status da tarefa ${task.title}`}
                    disabled={pendingIds.includes(task.id)}
                    onChange={(e) => onChangeStatus(task.id, e.target.value as TaskStatus)}
                    className="text-xs border border-border rounded-md px-2 py-1.5 bg-surface text-graphite shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>

                  <button
                    onClick={() => setEditingTask(task)}
                    disabled={pendingIds.includes(task.id)}
                    className="text-muted hover:text-ink transition-colors cursor-pointer shrink-0"
                    aria-label="Editar tarefa"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    onClick={() => onDelete(task.id)}
                    disabled={pendingIds.includes(task.id)}
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

      <TaskFormModal
        open={showForm || !!editingTask}
        task={editingTask}
        subjects={subjects}
        onClose={() => { setEditingTask(null); setShowForm(false); }}
        onSaved={() => {
          setEditingTask(null);
          setShowForm(false);
          loadTasks();
        }}
      />
    </div>
  );
};
