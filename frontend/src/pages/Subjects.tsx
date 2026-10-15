import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import apiClient from '../api/client';
import type { Subject } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { SubjectFormModal } from '../components/subjects/SubjectFormModal';
import { SubjectDeleteModal } from '../components/subjects/SubjectDeleteModal';
import { ClassSchedule } from '../components/subjects/ClassSchedule';

export const Subjects: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    apiClient.get<Subject[]>('/subjects/', { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setSubjects(response.data); })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível carregar suas disciplinas.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setEditing(null); setFormOpen(true);
    const next = new URLSearchParams(searchParams); next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const create = () => { setEditing(null); setFormOpen(true); };
  const refresh = () => { setFormOpen(false); setEditing(null); setDeleting(null); setRevision(value => value + 1); };

  return <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
    <SectionHeader title="Disciplinas" description="Organize as disciplinas, acompanhe as tarefas e monte seu cronograma de aulas."
      action={<Button icon={<Plus size={18} />} onClick={create}>Nova disciplina</Button>} />
    {error && <Card className="mt-6"><p role="alert" className="text-sm text-danger mb-3">{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Tentar novamente</Button></Card>}
    {loading ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">{[0, 1, 2].map(index => <StatCardSkeleton key={index} />)}</div>
      : !subjects.length && !error ? <Card className="mt-8" padding="lg"><EmptyState icon={BookOpen} title="Nenhuma disciplina cadastrada" description="Adicione sua primeira disciplina para organizar tarefas, materiais e horários de aula."
        action={{ label: 'Nova disciplina', icon: <Plus size={15} />, onClick: create }} /></Card>
        : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">{subjects.map(subject => <article key={subject.id} className="bg-surface rounded-lg border border-border border-t-[3px] overflow-hidden" style={{ borderTopColor: subject.color || 'var(--color-crimson)' }}>
          <Link to={`/subjects/${subject.id}`} className="group block p-5 hover:bg-surface-muted transition-colors">
            <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 font-serif text-xl font-semibold text-ink group-hover:text-crimson transition-colors break-words">{subject.name}</h2><ArrowRight size={18} className="shrink-0 mt-1 text-muted" /></div>
            <p className="text-sm text-graphite mt-2 mb-4 line-clamp-2 min-h-10">{subject.description || 'Sem descrição'}</p>
            {(subject.professor || subject.workload_hours != null) && <p className="text-xs text-graphite mb-4 truncate">{[subject.professor, subject.workload_hours != null ? `${subject.workload_hours}h de carga horária` : null].filter(Boolean).join(' · ')}</p>}
            <div className="flex justify-between text-xs mb-2"><span className="text-graphite">{subject.completed_tasks ?? 0} de {subject.total_tasks ?? 0} tarefas concluídas</span><span className="font-semibold text-ink">{Math.round(subject.progress ?? 0)}%</span></div>
            <ProgressBar value={subject.progress ?? 0} tone="navy" size="sm" />
          </Link>
          <div className="border-t border-border px-3 py-1.5 flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="min-h-11" icon={<Pencil size={15} />} aria-label={`Editar disciplina ${subject.name}`} onClick={() => { setEditing(subject); setFormOpen(true); }}>Editar</Button>
            <Button variant="ghost" size="sm" className="min-h-11 text-danger" icon={<Trash2 size={15} />} aria-label={`Excluir disciplina ${subject.name}`} onClick={() => setDeleting(subject)}>Excluir</Button>
          </div>
        </article>)}</div>}
    {!loading && !error && subjects.length > 0 && <ClassSchedule subjects={subjects} />}
    <SubjectFormModal open={formOpen} subject={editing} onClose={() => setFormOpen(false)} onSaved={refresh} />
    <SubjectDeleteModal subject={deleting} onClose={() => setDeleting(null)} onDeleted={refresh} />
  </div>;
};
