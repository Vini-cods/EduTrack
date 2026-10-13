import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { PRIORITY_META, PRIORITY_ORDER } from '../../lib/tasks';
import { taskFormPayload, taskFormSchema } from '../../lib/taskForm';
import type { TaskFormValues } from '../../lib/taskForm';
import type { Task, Subject } from '../../types';
import { Trash2 } from 'lucide-react';

interface TaskFormModalProps {
  task?: Task | null;
  open?: boolean;
  studyGoal?: boolean;
  subjects: Subject[];
  onClose: () => void;
  onSaved: () => void;
  onCreated?: (task: Task) => void;
  onDeleted?: () => void;
}

const selectClass = 'w-full min-h-11 px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-crimson/30';

/** Um formulário para criação/edição, compartilhado por Tasks, Subjects e Planner. */
export const TaskFormModal: React.FC<TaskFormModalProps> = ({ task, open, studyGoal = false, subjects, onClose, onSaved, onCreated, onDeleted }) => {
  const isOpen = open ?? !!task;
  const saving = useRef(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const schema = useMemo(() => taskFormSchema(studyGoal), [studyGoal]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaskFormValues>({ resolver: zodResolver(schema) });
  const title = task ? (studyGoal ? 'Editar objetivo de estudo' : 'Editar tarefa') : (studyGoal ? 'Novo objetivo de estudo' : 'Nova tarefa');
  const busy = isSubmitting || isDeleting;

  useEffect(() => {
    if (isOpen) {
      setConfirmingDelete(false);
      reset({ title: task?.title || '', description: task?.description || '',
      subject_id: task ? String(task.subject_id) : '', due_date: task?.due_date || '',
      priority: task?.priority || 'media', status: task?.status || 'pendente',
      estimated_hours: task?.estimated_hours ? String(task.estimated_hours) : '' });
    }
  }, [isOpen, task, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (saving.current) return;
    saving.current = true;
    try {
      if (task) {
        await apiClient.put(`/tasks/${task.id}`, taskFormPayload(values));
        toast.success(studyGoal ? 'Objetivo atualizado.' : 'Tarefa atualizada.');
      } else {
        const response = await apiClient.post<Task>('/tasks/', taskFormPayload(values));
        toast.success(studyGoal ? 'Objetivo de estudo criado.' : (values.due_date ? 'Tarefa criada. O prazo está no calendário.' : 'Tarefa criada.'));
        onCreated?.(response.data);
      }
      onSaved();
    } catch {
      toast.error('Não foi possível salvar. Seus dados continuam no formulário.');
    } finally { saving.current = false; }
  });

  const onDelete = async () => {
    if (!task || saving.current) return;
    saving.current = true;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/tasks/${task.id}`);
      toast.success(studyGoal ? 'Objetivo excluído.' : 'Tarefa excluída.');
      (onDeleted ?? onSaved)();
    } catch {
      toast.error('Não foi possível excluir. A tarefa foi preservada.');
    } finally {
      saving.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={() => { if (!busy) onClose(); }} ariaLabel={title} panelClassName="max-w-lg">
      <form onSubmit={onSubmit} className="p-5 sm:p-6">
        <h2 className="font-serif text-xl font-semibold text-ink mb-5">{title}</h2>
        <fieldset disabled={busy} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-graphite mb-1.5">{studyGoal ? 'Objetivo' : 'Título'}</label>
            <TextField id="task-title" {...register('title')} placeholder={studyGoal ? 'Ex.: Revisar árvores binárias' : undefined}
              aria-invalid={!!errors.title} aria-describedby={errors.title ? 'task-title-error' : undefined} />
            {errors.title && <p id="task-title-error" className="text-xs text-danger mt-1" role="alert">{errors.title.message}</p>}
          </div>
          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-graphite mb-1.5">{studyGoal ? 'Conteúdo e resultado esperado' : 'Descrição (opcional)'}</label>
            <textarea id="task-description" {...register('description')} rows={2} className={`${selectClass} resize-y`} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-subject" className="block text-sm font-medium text-graphite mb-1.5">Disciplina</label>
              <select id="task-subject" {...register('subject_id')} className={selectClass}
                aria-invalid={!!errors.subject_id} aria-describedby={errors.subject_id ? 'task-subject-error' : undefined}>
                <option value="">Selecione uma disciplina</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
              {errors.subject_id && <p id="task-subject-error" className="text-xs text-danger mt-1" role="alert">{errors.subject_id.message}</p>}
            </div>
            <div>
              <label htmlFor="task-status" className="block text-sm font-medium text-graphite mb-1.5">Status</label>
              <select id="task-status" {...register('status')} className={selectClass}>
                <option value="pendente">Pendente</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option>
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="task-due" className="block text-sm font-medium text-graphite mb-1.5">Prazo</label>
              <TextField id="task-due" type="date" {...register('due_date')} />
            </div>
            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-graphite mb-1.5">Prioridade</label>
              <select id="task-priority" {...register('priority')} className={selectClass}>
                {PRIORITY_ORDER.slice().reverse().map((priority) => <option key={priority} value={priority}>{PRIORITY_META[priority].label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="task-estimate" className="block text-sm font-medium text-graphite mb-1.5">Estimativa (h)</label>
              <TextField id="task-estimate" type="number" step="any" min="0" {...register('estimated_hours')}
                aria-invalid={!!errors.estimated_hours} aria-describedby={errors.estimated_hours ? 'task-estimate-error' : undefined} />
              {errors.estimated_hours && <p id="task-estimate-error" className="text-xs text-danger mt-1" role="alert">{errors.estimated_hours.message}</p>}
            </div>
          </div>
        </fieldset>
        {subjects.length === 0 && <p className="text-xs text-warning mt-3">Cadastre uma disciplina antes de criar uma tarefa.</p>}
        <p className="text-xs text-muted mt-4">Ao definir um prazo, a tarefa aparece automaticamente no calendário, sem horário fixo.</p>
        {confirmingDelete && <div role="alert" className="mt-4 p-3 border border-danger/30 rounded-lg bg-danger/5">
          <p className="text-sm text-ink">Excluir {studyGoal ? 'este objetivo' : 'esta tarefa'}?</p>
          <p className="text-xs text-graphite mt-1">O prazo será removido do calendário. Eventos agendados e histórico de estudo serão preservados. Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 mt-3">
            <Button type="button" variant="danger" size="sm" loading={isDeleting} onClick={onDelete}>Confirmar exclusão</Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmingDelete(false)}>Manter tarefa</Button>
          </div>
        </div>}
        <div className="flex flex-wrap justify-end gap-2.5 mt-6 pt-5 border-t border-border">
          {task && <Button type="button" variant="ghost" className="mr-auto text-danger" icon={<Trash2 size={15} />} disabled={busy} onClick={() => setConfirmingDelete(true)}>Excluir</Button>}
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting} disabled={subjects.length === 0 || isDeleting}>{task ? 'Salvar' : (studyGoal ? 'Criar objetivo' : 'Criar tarefa')}</Button>
        </div>
      </form>
    </Modal>
  );
};
