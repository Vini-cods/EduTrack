import { z } from 'zod';

export function taskFormSchema(requireEstimate = false) {
  return z.object({
    title: z.string().trim().min(1, 'Informe um título.').max(255, 'Use até 255 caracteres.'),
    description: z.string(),
    subject_id: z.string().regex(/^[1-9]\d*$/, 'Selecione uma disciplina.'),
    due_date: z.string(),
    priority: z.enum(['baixa', 'media', 'alta', 'urgente']),
    status: z.enum(['pendente', 'em_andamento', 'concluida']),
    estimated_hours: z.string().refine((value) => {
      if (!value.trim()) return !requireEstimate;
      return Number.isFinite(Number(value)) && Number(value) > 0;
    }, requireEstimate ? 'Informe uma estimativa maior que zero.' : 'Use um número maior que zero.'),
  });
}

export type TaskFormValues = z.infer<ReturnType<typeof taskFormSchema>>;

export function taskFormPayload(values: TaskFormValues) {
  return { ...values, title: values.title.trim(), description: values.description.trim() || null,
    subject_id: Number(values.subject_id), due_date: values.due_date || null,
    estimated_hours: values.estimated_hours.trim() ? Number(values.estimated_hours) : null };
}
