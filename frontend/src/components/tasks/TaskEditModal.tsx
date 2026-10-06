import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PRIORITY_META, PRIORITY_ORDER } from '../../lib/tasks';
import type { Task, TaskPriority, TaskStatus, Subject } from '../../types';

interface TaskEditFormValues {
  title: string;
  description: string;
  subject_id: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimated_hours: string;
}

interface TaskEditModalProps {
  /** Aceita Task ou qualquer extensão dele (ex.: TaskWithSubject) — o modal só usa os campos da própria Task. */
  task: Task | null;
  subjects: Subject[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Edição completa de uma tarefa — todos os campos que a entidade Task já
 * suporta (título, descrição, disciplina, prazo, prioridade, status, tempo
 * estimado). Compartilhado entre a página Tasks e SubjectDetail para não
 * duplicar este formulário em dois lugares.
 */
export const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, subjects, onClose, onSaved }) => {
  const { register, handleSubmit, reset } = useForm<TaskEditFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        subject_id: String(task.subject_id),
        due_date: task.due_date || '',
        priority: task.priority,
        status: task.status,
        estimated_hours: task.estimated_hours ? String(task.estimated_hours) : '',
      });
    }
  }, [task, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!task) return;
    setSaving(true);
    try {
      await apiClient.put(`/tasks/${task.id}`, {
        title: values.title,
        description: values.description || null,
        subject_id: Number(values.subject_id),
        due_date: values.due_date || null,
        priority: values.priority,
        status: values.status,
        estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : null,
      });
      toast.success('Tarefa atualizada.');
      onSaved();
    } catch {
      toast.error('Não foi possível salvar a tarefa.');
    } finally {
      setSaving(false);
    }
  });

  return (
    <Modal open={!!task} onClose={onClose} ariaLabel="Editar tarefa" panelClassName="max-w-lg">
      <form onSubmit={onSubmit} className="p-6">
        <h2 className="font-serif text-xl font-semibold text-ink mb-5">Editar tarefa</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1.5">Título</label>
            <input
              {...register('title', { required: true })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1.5">Descrição (opcional)</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Disciplina</label>
              <select
                {...register('subject_id', { required: true })}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Status</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Prazo</label>
              <input
                type="date"
                {...register('due_date')}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Prioridade</label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                {PRIORITY_ORDER.slice()
                  .reverse()
                  .map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Horas est.</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                {...register('estimated_hours')}
                placeholder="—"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 mt-6 pt-5 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};
