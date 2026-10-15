import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import type { Subject } from '../../types';
import { Modal } from '../ui/Modal';
import { TextField } from '../ui/TextField';
import { Button } from '../ui/Button';

interface FormValues { name: string; description: string; color: string; professor: string; workload_hours: string; start_date: string; end_date: string }
interface Props { open: boolean; subject?: Subject | null; onClose: () => void; onSaved: () => void }

export const SubjectFormModal: React.FC<Props> = ({ open, subject, onClose, onSaved }) => {
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const { register, reset, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const startDate = watch('start_date');
  useEffect(() => {
    if (!open) return;
    setError('');
    reset({ name: subject?.name || '', description: subject?.description || '', color: subject?.color || '#9a2b2f',
      professor: subject?.professor || '', workload_hours: subject?.workload_hours == null ? '' : String(subject.workload_hours),
      start_date: subject?.start_date || '', end_date: subject?.end_date || '' });
  }, [open, subject, reset]);
  const submit = handleSubmit(async values => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError('');
    try {
      const payload = { name: values.name.trim(), description: values.description.trim() || null, color: values.color,
        professor: values.professor.trim() || null, workload_hours: values.workload_hours === '' ? null : Number(values.workload_hours),
        start_date: values.start_date || null, end_date: values.end_date || null };
      if (subject) await apiClient.put(`/subjects/${subject.id}`, payload);
      else await apiClient.post('/subjects/', payload);
      toast.success(subject ? 'Disciplina atualizada.' : 'Disciplina criada.');
      onSaved();
    } catch {
      setError('Não foi possível salvar a disciplina. Revise os dados e tente novamente.');
    } finally { busyRef.current = false; }
  });
  return <Modal open={open} onClose={() => { if (!busyRef.current) onClose(); }} ariaLabel={subject ? 'Editar disciplina' : 'Nova disciplina'} panelClassName="max-w-xl">
    <form onSubmit={submit} className="p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-ink">{subject ? 'Editar disciplina' : 'Nova disciplina'}</h2>
      <p className="text-sm text-graphite mt-1 mb-5">Identifique a disciplina e o período letivo. Os horários de aula são configurados no cronograma.</p>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <div><label htmlFor="subject-name" className="block text-sm text-graphite font-medium mb-1.5">Nome</label>
          <TextField id="subject-name" maxLength={255} {...register('name', { required: 'Informe o nome.', validate: value => !!value.trim() || 'Informe o nome.' })} error={errors.name?.message} placeholder="Ex.: Algoritmos e estruturas de dados" /></div>
        <div><label htmlFor="subject-description" className="block text-sm text-graphite font-medium mb-1.5">Descrição (opcional)</label>
          <textarea id="subject-description" maxLength={1000} {...register('description')} rows={3} className="w-full rounded-md border border-border bg-surface p-3 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-crimson/30" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label htmlFor="subject-professor" className="block text-sm text-graphite font-medium mb-1.5">Professor(a) (opcional)</label><TextField id="subject-professor" maxLength={255} {...register('professor')} /></div>
          <div><label htmlFor="subject-hours" className="block text-sm text-graphite font-medium mb-1.5">Carga horária total (opcional)</label><TextField id="subject-hours" type="number" min={0} max={2000} step={1} {...register('workload_hours', { validate: value => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 2000) || 'Informe de 0 a 2000 horas inteiras.' })} error={errors.workload_hours?.message} placeholder="Ex.: 80" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label htmlFor="subject-start" className="block text-sm text-graphite font-medium mb-1.5">Início do período (opcional)</label><TextField id="subject-start" type="date" {...register('start_date')} /></div>
          <div><label htmlFor="subject-end" className="block text-sm text-graphite font-medium mb-1.5">Fim do período (opcional)</label><TextField id="subject-end" type="date" min={startDate || undefined} {...register('end_date', { validate: value => !value || !startDate || value >= startDate || 'O fim não pode ser anterior ao início.' })} error={errors.end_date?.message} /></div>
        </div>
        <div className="flex items-center gap-3"><label htmlFor="subject-color" className="text-sm font-medium text-graphite">Cor de identificação</label><input id="subject-color" type="color" {...register('color')} className="h-11 w-14 border border-border rounded-md bg-surface cursor-pointer" /></div>
      </fieldset>
      {error && <p role="alert" className="text-danger text-sm mt-4">{error}</p>}
      <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2"><Button type="button" variant="ghost" disabled={isSubmitting} onClick={onClose}>Cancelar</Button><Button type="submit" loading={isSubmitting}>{subject ? 'Salvar alterações' : 'Criar disciplina'}</Button></div>
    </form>
  </Modal>;
};
