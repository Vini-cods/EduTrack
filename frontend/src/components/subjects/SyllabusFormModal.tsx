import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { academicRecordsApi } from '../../api/academicRecords';
import type { SubjectSyllabus, SubjectSyllabusInput } from '../../types/academicRecords';
import { syllabusFieldError } from '../../lib/academicRecords';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DiscardAcademicChangesModal } from './DiscardAcademicChangesModal';

interface Props { open: boolean; subjectId: number; syllabus: SubjectSyllabus; onClose: () => void; onSaved: () => void }
const fields = [
  { name: 'objectives', label: 'Objetivos de aprendizagem', placeholder: 'O que você deve aprender nesta disciplina?' },
  { name: 'topics', label: 'Conteúdo programático', placeholder: 'Unidades, tópicos e conceitos previstos no plano de ensino.' },
  { name: 'bibliography', label: 'Bibliografia e referências', placeholder: 'Livros, artigos e referências indicados para a disciplina.' },
] as const;

export function SyllabusFormModal({ open, subjectId, syllabus, onClose, onSaved }: Props) {
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const { register, reset, handleSubmit, formState: { errors, isDirty, isSubmitting } } = useForm<SubjectSyllabusInput>({
    defaultValues: { objectives: '', topics: '', bibliography: '' }, mode: 'onTouched',
  });

  useEffect(() => {
    if (!open) return;
    reset({ objectives: syllabus.objectives, topics: syllabus.topics, bibliography: syllabus.bibliography });
    setError(''); setDiscard(false);
  }, [open, syllabus, reset]);

  function requestClose() {
    if (busy.current) return;
    if (isDirty) setDiscard(true);
    else onClose();
  }

  const submit = handleSubmit(async input => {
    if (busy.current) return;
    busy.current = true; setError('');
    try {
      await academicRecordsApi.saveSyllabus(subjectId, input);
      toast.success('Plano de ensino atualizado.');
      onSaved();
    } catch (reason) {
      const detail = isAxiosError(reason) ? reason.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Não foi possível salvar o plano. Seu rascunho continua disponível.');
    } finally { busy.current = false; }
  });

  return <>
    <Modal open={open} onClose={requestClose} ariaLabel="Editar plano de ensino" panelClassName="max-w-2xl">
      <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-semibold text-ink">Plano de ensino</h2>
        <p id="syllabus-hint" className="mt-2 mb-5 text-sm leading-relaxed text-graphite">Registre a ementa e as referências da disciplina. Todos os campos são opcionais, com até 20.000 caracteres cada.</p>
        <fieldset disabled={isSubmitting} className="space-y-5">
          {fields.map(field => <div key={field.name}>
            <label htmlFor={`syllabus-${field.name}`} className="mb-2 block text-sm font-medium text-graphite">{field.label}</label>
            <textarea
              id={`syllabus-${field.name}`} rows={5} placeholder={field.placeholder}
              {...register(field.name, { validate: value => syllabusFieldError(value) || true })}
              aria-invalid={!!errors[field.name]}
              aria-describedby={`syllabus-hint${errors[field.name] ? ` syllabus-${field.name}-error` : ''}`}
              className="w-full resize-y rounded-md border border-border bg-surface p-3 text-sm leading-relaxed text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-crimson/30"
            />
            {errors[field.name] && <p id={`syllabus-${field.name}-error`} className="mt-1.5 text-xs text-danger">{errors[field.name]?.message}</p>}
          </div>)}
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" disabled={isSubmitting} onClick={requestClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>Salvar plano</Button>
        </div>
      </form>
    </Modal>
    <DiscardAcademicChangesModal open={open && discard} onKeep={() => setDiscard(false)} onDiscard={() => { setDiscard(false); onClose(); }} />
  </>;
}
