import { useState } from 'react';
import { ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Task } from '../../types';
import type { Assessment, GradeSummary } from '../../types/academicRecords';
import { useSubjectAssessments } from '../../hooks/useAcademicRecords';
import { formatGradeNumber } from '../../lib/academicRecords';
import { formatShortDate } from '../../lib/date';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, RowSkeleton } from '../ui/Skeleton';
import { AssessmentFormModal } from './AssessmentFormModal';
import { AssessmentDeleteModal } from './AssessmentDeleteModal';

function GradeSummaryView({ summary }: { summary: GradeSummary }) {
  return <div className="border-b border-border bg-surface-muted px-4 py-5 sm:px-5">
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div><dt className="text-xs text-graphite">Média parcial · escala 0 a 10</dt><dd className="mt-2 font-serif text-3xl text-ink">{summary.partial_average == null ? '—' : formatGradeNumber(summary.partial_average)}</dd></div>
      <div><dt className="text-xs text-graphite">Notas informadas</dt><dd className="mt-2 font-serif text-3xl text-ink">{summary.graded_count}<span className="ml-2 font-sans text-sm text-graphite">de {summary.total_count}</span></dd></div>
      <div><dt className="text-xs text-graphite">Cobertura dos pesos</dt><dd className="mt-2 font-serif text-3xl text-ink">{formatGradeNumber(summary.coverage_percent)}%</dd>
        <div role="meter" aria-label="Cobertura dos pesos com nota informada" aria-valuenow={summary.coverage_percent} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-[var(--color-navy)] transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, summary.coverage_percent))}%` }} />
        </div>
      </div>
    </dl>
    <p className="mt-4 text-xs leading-relaxed text-graphite">A média parcial considera as notas informadas, normalizadas pela nota máxima e ponderadas pelo peso. Avaliações pendentes ficam fora do cálculo. Consulte a instituição para a média oficial e os critérios de aprovação.</p>
  </div>;
}

function AssessmentRow({ assessment, onEdit, onDelete }: { assessment: Assessment; onEdit: () => void; onDelete: () => void }) {
  return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 break-words text-sm font-medium text-ink">{assessment.name}</h3>{assessment.score === null && <Badge tone="warning" size="sm">Nota pendente</Badge>}</div>
      {assessment.task_id != null && <p className="mt-1.5 break-words text-xs text-graphite">Tarefa: {assessment.task_title || 'Tarefa vinculada'}{assessment.due_date ? ` · Prazo: ${formatShortDate(assessment.due_date)}` : ' · Sem prazo definido'}</p>}
      <p className="mt-1.5 text-xs text-graphite">Peso {formatGradeNumber(assessment.weight)}</p>
    </div>
    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
      <p className="tabular-nums text-ink"><span className="text-lg font-semibold">{assessment.score === null ? '—' : formatGradeNumber(assessment.score)}</span><span className="ml-1 text-sm text-muted">/ {formatGradeNumber(assessment.max_score)}</span></p>
      <div className="flex gap-1"><button type="button" onClick={onEdit} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-graphite hover:bg-surface-muted" aria-label={`Editar avaliação ${assessment.name}`}><Pencil size={16} aria-hidden="true" /></button><button type="button" onClick={onDelete} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-danger hover:bg-danger-soft" aria-label={`Excluir avaliação ${assessment.name}`}><Trash2 size={16} aria-hidden="true" /></button></div>
    </div>
  </div>;
}

export function AssessmentsCard({ subjectId, tasks }: { subjectId: number; tasks: Task[] }) {
  const { data, loading, error, reload } = useSubjectAssessments(subjectId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [removing, setRemoving] = useState<Assessment | null>(null);
  function openNew() { setEditing(null); setFormOpen(true); }
  function saved() { setFormOpen(false); setEditing(null); setRemoving(null); reload(); }

  return <Card padding="none">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
      <div><h2 className="font-serif text-xl font-semibold text-ink">Avaliações e notas</h2><p className="mt-1 text-xs text-graphite">Resultados, pesos e o que ainda falta avaliar.</p></div>
      <Button size="sm" className="min-h-11" disabled={loading || error} icon={<Plus size={16} aria-hidden="true" />} onClick={openNew}>Nova avaliação</Button>
    </div>
    {loading ? <div role="status" aria-label="Carregando avaliações"><div className="p-5"><Skeleton className="h-12 w-full" /></div><RowSkeleton /><RowSkeleton /></div>
      : error ? <div className="p-5"><p role="alert" className="mb-3 text-sm text-danger">Não foi possível carregar as avaliações.</p><Button variant="outline" onClick={reload}>Tentar novamente</Button></div>
      : !data?.items.length ? <EmptyState icon={ClipboardCheck} title="Acompanhe seus resultados" description="Cadastre avaliações com seus pesos. Você pode informar as notas conforme receber os resultados." className="!py-9" action={{ label: 'Registrar primeira avaliação', onClick: openNew }} />
      : <><GradeSummaryView summary={data.summary} /><div className="divide-y divide-border">{data.items.map(assessment => <AssessmentRow key={assessment.id} assessment={assessment} onEdit={() => { setEditing(assessment); setFormOpen(true); }} onDelete={() => setRemoving(assessment)} />)}</div></>}
    <AssessmentFormModal open={formOpen} subjectId={subjectId} assessment={editing} tasks={tasks} onClose={() => setFormOpen(false)} onSaved={saved} />
    <AssessmentDeleteModal subjectId={subjectId} assessment={removing} onClose={() => setRemoving(null)} onDeleted={saved} />
  </Card>;
}
