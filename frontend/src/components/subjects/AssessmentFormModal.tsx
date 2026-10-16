import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { academicRecordsApi } from '../../api/academicRecords';
import type { Task } from '../../types';
import type { Assessment, AssessmentInput } from '../../types/academicRecords';
import { createAssessmentDraft, parseAssessmentDraft, type AssessmentDraft } from '../../lib/academicRecords';
import { formatShortDate } from '../../lib/date';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { DiscardAcademicChangesModal } from './DiscardAcademicChangesModal';

interface Props { open: boolean; subjectId: number; assessment: Assessment | null; tasks: Task[]; onClose: () => void; onSaved: () => void }

export function AssessmentFormModal({ open, subjectId, assessment, tasks, onClose, onSaved }: Props) {
  const availableTasks = useMemo(() => tasks.filter(task => task.subject_id === subjectId), [tasks, subjectId]);
  const resolver: Resolver<AssessmentDraft, undefined, AssessmentInput> = values => {
    const result = parseAssessmentDraft(values, availableTasks.map(task => task.id));
    if (result.ok === true) return { values: result.payload, errors: {} };
    const errors: FieldErrors<AssessmentDraft> = {};
    for (const [field, message] of Object.entries(result.errors)) errors[field as keyof AssessmentDraft] = { type: 'validate', message };
    return { values: {}, errors };
  };
  const { register, reset, watch, handleSubmit, formState: { errors, isDirty, isSubmitting } } = useForm<AssessmentDraft, undefined, AssessmentInput>({
    resolver, defaultValues: createAssessmentDraft(), mode: 'onTouched',
  });
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const selectedTaskId = watch('task_id');
  const selectedTask = availableTasks.find(task => String(task.id) === selectedTaskId);

  useEffect(() => {
    if (!open) return;
    reset(createAssessmentDraft(assessment));
    setError(''); setDiscard(false);
  }, [open, assessment, reset]);

  function requestClose() {
    if (busy.current) return;
    if (isDirty) setDiscard(true);
    else onClose();
  }

  const submit = handleSubmit(async input => {
    if (busy.current) return;
    busy.current = true; setError('');
    try {
      if (assessment) await academicRecordsApi.updateAssessment(subjectId, assessment.id, input);
      else await academicRecordsApi.createAssessment(subjectId, input);
      toast.success(assessment ? 'Avaliação atualizada.' : 'Avaliação registrada.');
      onSaved();
    } catch (reason) {
      const detail = isAxiosError(reason) ? reason.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Não foi possível salvar a avaliação. Seu rascunho continua disponível.');
    } finally { busy.current = false; }
  });

  return <>
    <Modal open={open} onClose={requestClose} ariaLabel={assessment ? 'Editar avaliação' : 'Nova avaliação'} panelClassName="max-w-xl">
      <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-semibold text-ink">{assessment ? 'Editar avaliação' : 'Nova avaliação'}</h2>
        <p className="mt-2 mb-5 text-sm leading-relaxed text-graphite">Registre uma prova, trabalho ou outra avaliação. Deixe a nota em branco enquanto aguarda o resultado.</p>
        <fieldset disabled={isSubmitting} className="space-y-4">
          <div><label htmlFor="assessment-name" className="mb-2 block text-sm font-medium text-graphite">Nome da avaliação</label><TextField id="assessment-name" placeholder="Ex.: Prova da unidade 1" error={errors.name?.message} {...register('name')} /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><label htmlFor="assessment-score" className="mb-2 block text-sm font-medium text-graphite">Nota obtida</label><TextField id="assessment-score" inputMode="decimal" maxLength={32} placeholder="Pendente" aria-describedby="assessment-score-hint" error={errors.score?.message} {...register('score')} /></div>
            <div><label htmlFor="assessment-max" className="mb-2 block text-sm font-medium text-graphite">Nota máxima</label><TextField id="assessment-max" inputMode="decimal" maxLength={32} error={errors.max_score?.message} {...register('max_score')} /></div>
            <div><label htmlFor="assessment-weight" className="mb-2 block text-sm font-medium text-graphite">Peso</label><TextField id="assessment-weight" inputMode="decimal" maxLength={32} error={errors.weight?.message} {...register('weight')} /></div>
          </div>
          <p id="assessment-score-hint" className="text-xs leading-relaxed text-graphite">Nota 0 é um resultado válido. Uma nota em branco fica pendente e não entra na média parcial.</p>
          <div>
            <label htmlFor="assessment-task" className="mb-2 block text-sm font-medium text-graphite">Tarefa relacionada (opcional)</label>
            <select id="assessment-task" {...register('task_id')} aria-invalid={!!errors.task_id} aria-describedby={`assessment-task-hint${errors.task_id ? ' assessment-task-error' : ''}`} className="min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-crimson/30">
              <option value="">Sem tarefa vinculada</option>
              {availableTasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
            {errors.task_id && <p id="assessment-task-error" className="mt-1.5 text-xs text-danger">{errors.task_id.message}</p>}
            <p id="assessment-task-hint" className="mt-2 text-xs leading-relaxed text-graphite">{selectedTask ? `Prazo da tarefa: ${selectedTask.due_date ? formatShortDate(selectedTask.due_date) : 'não definido'}. Ajuste a data em Tarefas.` : 'Ao vincular uma tarefa, a avaliação reutiliza o prazo dela. Datas e calendário são gerenciados em Tarefas.'}</p>
          </div>
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="ghost" disabled={isSubmitting} onClick={requestClose}>Cancelar</Button><Button type="submit" loading={isSubmitting}>Salvar avaliação</Button></div>
      </form>
    </Modal>
    <DiscardAcademicChangesModal open={open && discard} onKeep={() => setDiscard(false)} onDiscard={() => { setDiscard(false); onClose(); }} />
  </>;
}
