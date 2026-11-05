import React, { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, BookOpen, ClipboardList, ExternalLink, FolderOpen, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import apiClient from '../api/client';
import type { Material, Subject, Task, TaskStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton, RowSkeleton } from '../components/ui/Skeleton';
import { useSetBreadcrumb } from '../contexts/BreadcrumbContext';
import { CATEGORY_META, STATUS_META } from '../lib/materials';
import { PRIORITY_META } from '../lib/tasks';
import { getDueDateStatus, DUE_DATE_TEXT_CLASS, formatShortDate } from '../lib/date';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { SubjectFormModal } from '../components/subjects/SubjectFormModal';
import { SubjectDeleteModal } from '../components/subjects/SubjectDeleteModal';
import { ClassSchedule } from '../components/subjects/ClassSchedule';
import { SubjectAcademicRecords } from '../components/subjects/SubjectAcademicRecords';

const statusConfig: Record<TaskStatus, { label: string; tone: 'warning' | 'navy' | 'success' }> = {
  pendente: { label: 'Pendente', tone: 'warning' },
  em_andamento: { label: 'Em andamento', tone: 'navy' },
  concluida: { label: 'Concluída', tone: 'success' },
};

export const SubjectDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pendingTaskIds = useRef(new Set<number>());
  const [busyTaskIds, setBusyTaskIds] = useState<number[]>([]);
  useSetBreadcrumb(subject?.name ?? null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setSubject(null);
    const options = { signal: controller.signal };
    Promise.all([
      apiClient.get<Subject>(`/subjects/${id}`, options),
      apiClient.get<Task[]>('/tasks/', options),
      apiClient.get<Material[]>(`/materials/subject/${id}`, options),
      apiClient.get<Subject[]>('/subjects/', options),
    ]).then(([subjectResponse, tasksResponse, materialsResponse, allResponse]) => {
      if (controller.signal.aborted) return;
      setSubject(subjectResponse.data);
      setTasks(tasksResponse.data.filter(task => task.subject_id === subjectResponse.data.id));
      setMaterials(materialsResponse.data);
      setAllSubjects(allResponse.data.some(item => item.id === subjectResponse.data.id) ? allResponse.data : [subjectResponse.data, ...allResponse.data]);
    }).catch(reason => {
      if (controller.signal.aborted) return;
      setError(isAxiosError(reason) && reason.response?.status === 404 ? 'Esta disciplina foi removida ou não está disponível para sua conta.' : 'Não foi possível carregar os dados da disciplina.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, revision]);
  const refresh = () => { setTaskFormOpen(false); setEditingTask(null); setSubjectFormOpen(false); setRevision(value => value + 1); };
  const changeStatus = async (taskId: number, status: TaskStatus) => {
    if (pendingTaskIds.current.has(taskId)) return;
    pendingTaskIds.current.add(taskId); setBusyTaskIds(Array.from(pendingTaskIds.current));
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status });
      setTasks(previous => previous.map(task => task.id === taskId ? { ...task, status } : task));
      toast.success('Status atualizado.');
    } catch { toast.error('Não foi possível atualizar o status. Tente novamente.'); }
    finally { pendingTaskIds.current.delete(taskId); setBusyTaskIds(Array.from(pendingTaskIds.current)); }
  };

  if (loading) return <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto"><Skeleton className="h-4 w-40 mb-6" /><Skeleton className="h-9 w-64 mb-2" /><Skeleton className="h-4 w-56 mb-8" /><Card padding="none"><RowSkeleton /><RowSkeleton /><RowSkeleton /></Card></div>;
  if (!subject) return <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto"><Card padding="lg"><EmptyState icon={BookOpen} title="Disciplina indisponível" description={error || 'Ela pode ter sido removida ou o link está incorreto.'} /><div className="flex justify-center flex-wrap gap-3"><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Tentar novamente</Button><Link to="/subjects" className="inline-flex items-center px-4 min-h-11 text-sm font-medium text-crimson">Voltar para disciplinas</Link></div></Card></div>;

  const completedCount = tasks.filter(task => task.status === 'concluida').length;
  const progress = tasks.length ? completedCount / tasks.length * 100 : 0;
  return <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
    <Link to="/subjects" className="inline-flex items-center gap-2 text-sm text-graphite hover:text-ink font-medium mb-4 min-h-11"><ArrowLeft size={16} />Voltar para disciplinas</Link>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h1 className="font-serif text-3xl font-semibold text-ink break-words">{subject.name}</h1><p className="text-graphite mt-1 whitespace-pre-wrap break-words">{subject.description || 'Sem descrição'}</p>
        {(subject.professor || subject.workload_hours != null) && <p className="text-sm text-graphite mt-3">{[subject.professor ? `Professor(a): ${subject.professor}` : null, subject.workload_hours != null ? `${subject.workload_hours}h de carga horária` : null].filter(Boolean).join(' · ')}</p>}
        {(subject.start_date || subject.end_date) && <p className="text-sm text-graphite mt-1">Período: {subject.start_date ? formatShortDate(subject.start_date) : 'não definido'} – {subject.end_date ? formatShortDate(subject.end_date) : 'não definido'}</p>}
      </div>
      <div className="flex gap-1 flex-wrap"><Button variant="outline" icon={<Pencil size={16} />} onClick={() => setSubjectFormOpen(true)}>Editar disciplina</Button><Button variant="ghost" className="text-danger" icon={<Trash2 size={16} />} onClick={() => setConfirmDelete(true)}>Excluir</Button></div>
    </div>
    <div className="mt-5 flex justify-between text-sm text-graphite"><span>{completedCount} de {tasks.length} tarefas concluídas</span><span className="font-semibold text-ink">{Math.round(progress)}%</span></div><ProgressBar value={progress} className="mt-2" size="sm" />

    <ClassSchedule subjects={allSubjects} subjectId={subject.id} />
    <SubjectAcademicRecords subjectId={subject.id} tasks={tasks} />

    <Card padding="none" className="mt-6">
      <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between flex-wrap gap-3"><h2 className="font-serif text-xl font-semibold text-ink">Tarefas ({tasks.length})</h2><Button size="sm" className="min-h-11" icon={<Plus size={16} />} onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>Nova tarefa</Button></div>
      {!tasks.length ? <EmptyState icon={ClipboardList} title="Nenhuma tarefa ainda" description="Adicione uma tarefa com prazo para que ela também apareça no calendário." /> : <div className="divide-y divide-border">{tasks.map(task => {
        const config = statusConfig[task.status];
        const dueStatus = task.status === 'concluida' ? null : getDueDateStatus(task.due_date);
        return <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1"><p className={`text-sm font-medium break-words ${task.status === 'concluida' ? 'line-through text-muted' : 'text-ink'}`}>{task.title}</p>{dueStatus && <p className={`mt-1 text-xs ${DUE_DATE_TEXT_CLASS[dueStatus]}`}>{dueStatus === 'sem_prazo' ? 'Sem prazo' : formatShortDate(task.due_date!)}{task.estimated_hours ? ` · ${task.estimated_hours}h estimadas` : ''}</p>}</div>
          <div className="flex flex-wrap items-center gap-2">{(task.priority === 'urgente' || task.priority === 'alta') && <Badge tone={PRIORITY_META[task.priority].tone} size="sm">{PRIORITY_META[task.priority].label}</Badge>}<Badge tone={config.tone}>{config.label}</Badge>
            <select value={task.status} disabled={busyTaskIds.includes(task.id)} aria-label={`Status de ${task.title}`} onChange={event => changeStatus(task.id, event.target.value as TaskStatus)} className="text-xs border border-border rounded-md px-2 min-h-11 bg-surface text-graphite disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-crimson/30"><option value="pendente">Pendente</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option></select>
            <button type="button" disabled={busyTaskIds.includes(task.id)} onClick={() => { setEditingTask(task); setTaskFormOpen(true); }} className="min-h-11 min-w-11 rounded-md text-graphite hover:bg-surface-muted cursor-pointer disabled:opacity-60" aria-label={`Editar tarefa ${task.title}`}><Pencil size={16} className="mx-auto" /></button>
          </div>
        </div>;
      })}</div>}
    </Card>

    <Card padding="none" className="mt-6"><div className="p-4 sm:p-5 border-b border-border flex items-center justify-between flex-wrap gap-3"><h2 className="font-serif text-xl font-semibold text-ink">Materiais ({materials.length})</h2><Link to={`/materials?subject_id=${id}&new=1`} className="text-sm font-medium text-crimson min-h-11 inline-flex items-center gap-1"><Plus size={15} />Adicionar material</Link></div>
      {!materials.length ? <EmptyState icon={FolderOpen} title="Nenhum material ainda" description="Guarde links, PDFs e vídeos para ter os recursos desta disciplina à mão." /> : <div className="divide-y divide-border">{materials.slice(0, 5).map(material => {
        const category = CATEGORY_META[material.category]; const Icon = category.icon; const status = STATUS_META[material.status];
        return <div key={material.id} className="flex items-center flex-wrap sm:flex-nowrap gap-3 p-4"><div className="w-8 h-8 rounded-md bg-navy-soft flex items-center justify-center shrink-0"><Icon size={15} className="text-navy" /></div><span className="text-sm font-medium text-ink break-words flex-1 min-w-0">{material.title}</span><Badge tone={status.tone} size="sm">{status.label}</Badge>{material.url && <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-graphite hover:text-crimson min-h-11 min-w-11 inline-flex items-center justify-center" aria-label={`Abrir material ${material.title}`}><ExternalLink size={16} /></a>}</div>;
      })}<Link to={`/materials?subject_id=${id}`} className="min-h-11 px-5 inline-flex items-center text-sm font-medium text-crimson">Ver todos os materiais</Link></div>}
    </Card>
    <Link to={`/notes?subject_id=${id}`} className="mt-5 min-h-11 inline-flex items-center gap-2 text-sm font-medium text-crimson"><NotebookPen size={17} />Anotações desta disciplina</Link>
    <TaskFormModal open={taskFormOpen} task={editingTask} subjects={allSubjects} initialSubjectId={subject.id} onClose={() => setTaskFormOpen(false)} onSaved={refresh} onDeleted={refresh} />
    <SubjectFormModal open={subjectFormOpen} subject={subject} onClose={() => setSubjectFormOpen(false)} onSaved={refresh} />
    <SubjectDeleteModal subject={confirmDelete ? subject : null} onClose={() => setConfirmDelete(false)} onDeleted={() => navigate('/subjects', { replace: true })} />
  </div>;
};
