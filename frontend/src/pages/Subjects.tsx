import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import type { Subject } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { BookOpen, Plus, ArrowRight } from 'lucide-react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCardSkeleton } from '../components/ui/Skeleton';

interface SubjectFormValues {
  name: string;
  description?: string;
}

export const Subjects: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<SubjectFormValues>();

  const fetchSubjects = () => {
    setLoading(true);
    apiClient
      .get('/subjects/')
      .then((res) => setSubjects(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Abre o formulário automaticamente quando chega via Command Palette (?new=1).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: SubjectFormValues) => {
    try {
      await apiClient.post('/subjects/', data);
      reset();
      setShowForm(false);
      fetchSubjects();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <SectionHeader
        title="Disciplinas"
        description="Gerencie suas disciplinas e acompanhe o progresso."
        action={
          <Button icon={<Plus size={18} />} onClick={() => setShowForm(!showForm)}>
            Nova disciplina
          </Button>
        }
      />

      {showForm && (
        <Card className="mt-6 animate-scale-in" padding="md">
          <h3 className="font-serif text-lg font-semibold text-ink mb-4">Adicionar disciplina</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-graphite mb-1.5">Nome</label>
              <input
                {...register('name', { required: true })}
                placeholder="Ex: Matemática"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-graphite mb-1.5">Descrição</label>
              <input
                {...register('description')}
                placeholder="Breve descrição da disciplina"
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {[0, 1, 2].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <Card className="mt-8" padding="lg">
          <EmptyState
            icon={BookOpen}
            title="Nenhuma disciplina cadastrada"
            description="Comece adicionando sua primeira disciplina para organizar tarefas e acompanhar seu progresso."
            action={{ label: 'Nova disciplina', icon: <Plus size={15} />, onClick: () => setShowForm(true) }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {subjects.map((subject, index) => (
            <Link
              to={`/subjects/${subject.id}`}
              key={subject.id}
              className="group bg-surface rounded-xl p-6 border border-border border-l-[3px] hover:border-l-crimson hover:shadow-soft transition-all duration-200 animate-fade-in-up"
              style={{
                animationDelay: `${index * 60}ms`,
                borderLeftColor: subject.color || 'var(--color-border-strong)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-serif text-lg font-semibold text-ink group-hover:text-crimson transition-colors">
                  {subject.name}
                </h3>
                <ArrowRight
                  className="text-muted group-hover:text-crimson group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                  size={18}
                />
              </div>
              <p className="text-sm text-graphite mb-5 line-clamp-2 min-h-[2.5rem]">
                {subject.description || 'Sem descrição'}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">
                    {subject.completed_tasks ?? 0} de {subject.total_tasks ?? 0} tarefas
                  </span>
                  <span className="font-semibold text-ink">{Math.round(subject.progress ?? 0)}%</span>
                </div>
                <ProgressBar value={subject.progress ?? 0} tone={(subject.progress ?? 0) < 40 ? 'crimson' : 'navy'} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
