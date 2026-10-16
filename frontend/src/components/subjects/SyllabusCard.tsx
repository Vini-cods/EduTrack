import { useState } from 'react';
import { BookOpen, Pencil } from 'lucide-react';
import { useSubjectSyllabus } from '../../hooks/useAcademicRecords';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { SyllabusFormModal } from './SyllabusFormModal';

const sections = [
  { key: 'objectives', label: 'Objetivos de aprendizagem' },
  { key: 'topics', label: 'Conteúdo programático' },
  { key: 'bibliography', label: 'Bibliografia e referências' },
] as const;

export function SyllabusCard({ subjectId }: { subjectId: number }) {
  const { data, loading, error, reload } = useSubjectSyllabus(subjectId);
  const [editing, setEditing] = useState(false);
  const hasContent = data && sections.some(section => data[section.key].trim());

  return <Card padding="none">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
      <div><h2 className="font-serif text-xl font-semibold text-ink">Plano de ensino</h2><p className="mt-1 text-xs text-graphite">Ementa, objetivos e referências da disciplina.</p></div>
      <Button size="sm" variant="outline" className="min-h-11" disabled={!data || loading} icon={<Pencil size={15} aria-hidden="true" />} onClick={() => setEditing(true)}>Editar plano</Button>
    </div>
    {loading ? <div className="space-y-3 p-5" role="status" aria-label="Carregando plano de ensino"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
      : error ? <div className="p-5"><p role="alert" className="mb-3 text-sm text-danger">Não foi possível carregar o plano de ensino.</p><Button variant="outline" onClick={reload}>Tentar novamente</Button></div>
      : !hasContent ? <EmptyState icon={BookOpen} title="O percurso da disciplina, em um lugar" description="Adicione o conteúdo previsto e as referências para orientar seus estudos." className="!py-9" action={{ label: 'Adicionar plano de ensino', onClick: () => setEditing(true) }} />
      : <div className="p-4 sm:p-5">
        <div className="divide-y divide-border">{sections.map(section => <details key={section.key} className="group py-1">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-ink marker:text-crimson focus-visible:rounded-sm">{section.label}{!data?.[section.key].trim() && <span className="ml-2 text-xs font-normal text-muted">Não informado</span>}</summary>
          <p className="pb-4 pr-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-graphite">{data?.[section.key] || 'Este campo ainda não foi preenchido.'}</p>
        </details>)}</div>
        {data?.updated_at && <p className="mt-3 text-xs text-muted">Atualizado em {new Date(data.updated_at).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}.</p>}
      </div>}
    {data && <SyllabusFormModal open={editing} subjectId={subjectId} syllabus={data} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />}
  </Card>;
}
