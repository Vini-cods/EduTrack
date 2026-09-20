import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { Subject, Task, TaskStatus, Material } from '../types';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Plus, CheckCircle2, Clock, AlertCircle, ClipboardList, BookOpen, ExternalLink, FolderOpen } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton, RowSkeleton } from '../components/ui/Skeleton';
import { useSetBreadcrumb } from '../contexts/BreadcrumbContext';
import { CATEGORY_META, STATUS_META } from '../lib/materials';

const statusConfig: Record<string, { label: string; tone: 'warning' | 'navy' | 'success'; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', tone: 'warning', icon: AlertCircle },
  em_andamento: { label: 'Em andamento', tone: 'navy', icon: Clock },
  concluida: { label: 'Concluída', tone: 'success', icon: CheckCircle2 },
};

interface TaskFormValues {
  title: string;
}

export const SubjectDetail: React.FC = () => {
  const { id } = useParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<TaskFormValues>();

  useSetBreadcrumb(subject?.name ?? null);

  const fetchData = async () => {
    try {
      const [subjRes, tasksRes, materialsRes] = await Promise.all([
        apiClient.get(`/subjects/${id}`),
        apiClient.get(`/tasks/subject/${id}`),
        apiClient.get(`/materials/subject/${id}`),
      ]);
      setSubject(subjRes.data);
      setTasks(tasksRes.data);
      setMaterials(materialsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onAddTask = handleSubmit(async (data) => {
    try {
      await apiClient.post('/tasks/', { ...data, subject_id: Number(id) });
      reset();
      setShowForm(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  });

  const onChangeStatus = async (taskId: number, status: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: status as TaskStatus } : t)));
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status });
    } catch (e) {
      console.error(e);
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Skeleton className="h-4 w-40 mb-6" />
        <Skeleton className="h-9 w-72 mb-2" />
        <Skeleton className="h-4 w-56 mb-8" />
        <Card padding="none">
          <div className="divide-y divide-border">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        </Card>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Card padding="lg">
          <EmptyState icon={BookOpen} title="Disciplina não encontrada" description="Ela pode ter sido removida ou o link está incorreto." />
        </Card>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'concluida').length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8 animate-fade-in-up">
        <Link to="/subjects" className="inline-flex items-center gap-2 text-sm text-graphite hover:text-ink font-medium mb-4 transition-colors">
          <ArrowLeft size={16} />
          Voltar para disciplinas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-ink">{subject.name}</h1>
            <p className="text-graphite mt-1">{subject.description || 'Sem descrição'}</p>
          </div>
          {tasks.length > 0 && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-serif font-semibold text-ink">{Math.round(progress)}%</p>
              <p className="text-xs text-muted">
                {completedCount} de {tasks.length} tarefas
              </p>
            </div>
          )}
        </div>
        {tasks.length > 0 && <ProgressBar value={progress} className="mt-4" size="sm" />}
      </div>

      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        {!showForm ? (
          <Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>
            Nova tarefa
          </Button>
        ) : (
          <Card padding="md">
            <h3 className="font-serif text-lg font-semibold text-ink mb-4">Adicionar tarefa</h3>
            <form onSubmit={onAddTask} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-graphite mb-1.5">Título</label>
                <input
                  {...register('title', { required: true })}
                  placeholder="Ex: Estudar capítulo 5"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
                />
              </div>
              <div className="flex gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Adicionar</Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <Card padding="none" className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <div className="p-5 border-b border-border">
          <h3 className="font-serif text-lg font-semibold text-ink">Tarefas ({tasks.length})</h3>
        </div>
        {tasks.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nenhuma tarefa ainda" description="Adicione a primeira tarefa desta disciplina." />
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((task) => {
              const config = statusConfig[task.status] || statusConfig.pendente;
              return (
                <div key={task.id} className="flex items-center justify-between gap-3 p-4">
                  <span
                    className={`text-sm font-medium truncate ${
                      task.status === 'concluida' ? 'line-through text-muted' : 'text-ink'
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={config.tone} icon={<config.icon size={12} />}>
                      {config.label}
                    </Badge>
                    <select
                      value={task.status}
                      onChange={(e) => onChangeStatus(task.id, e.target.value)}
                      className="text-xs border border-border rounded-md px-2 py-1.5 bg-surface text-graphite cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card padding="none" className="mt-6 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-ink">Materiais ({materials.length})</h3>
          <div className="flex items-center gap-3">
            <Link
              to={`/materials?subject_id=${id}&new=1`}
              className="text-sm font-medium text-crimson hover:text-crimson-dark inline-flex items-center gap-1"
            >
              <Plus size={14} /> Adicionar
            </Link>
            {materials.length > 0 && (
              <Link to={`/materials?subject_id=${id}`} className="text-sm text-graphite hover:text-ink font-medium">
                Ver todos
              </Link>
            )}
          </div>
        </div>
        {materials.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Nenhum material ainda"
            description="Adicione PDFs, links ou vídeos para ter os recursos desta disciplina à mão."
          />
        ) : (
          <div className="divide-y divide-border">
            {materials.slice(0, 5).map((material) => {
              const catMeta = CATEGORY_META[material.category];
              const Icon = catMeta.icon;
              const statusMeta = STATUS_META[material.status];
              return (
                <div key={material.id} className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-lg bg-navy-soft flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-navy" />
                  </div>
                  <span className="text-sm font-medium text-ink truncate flex-1">{material.title}</span>
                  <Badge tone={statusMeta.tone} size="sm">
                    {statusMeta.label}
                  </Badge>
                  {material.url && (
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-crimson transition-colors shrink-0"
                      aria-label="Abrir material"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
