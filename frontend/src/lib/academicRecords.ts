import type { Assessment, AssessmentInput } from '../types/academicRecords.ts';

export interface AssessmentDraft {
  name: string;
  score: string;
  max_score: string;
  weight: string;
  task_id: string;
}

export function createAssessmentDraft(assessment?: Assessment | null): AssessmentDraft {
  return {
    name: assessment?.name ?? '',
    score: assessment?.score == null ? '' : String(assessment.score),
    max_score: String(assessment?.max_score ?? 10),
    weight: String(assessment?.weight ?? 1),
    task_id: assessment?.task_id == null ? '' : String(assessment.task_id),
  };
}

function decimalNumber(value: string): number {
  const normalized = value.trim().replace(',', '.');
  return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized) ? Number(normalized) : NaN;
}

type AssessmentDraftResult =
  | { ok: true; payload: AssessmentInput }
  | { ok: false; errors: Partial<Record<keyof AssessmentDraft, string>> };

export function parseAssessmentDraft(draft: AssessmentDraft, allowedTaskIds: number[]): AssessmentDraftResult {
  const errors: Partial<Record<keyof AssessmentDraft, string>> = {};
  const name = draft.name.trim();
  const score = draft.score.trim() === '' ? null : decimalNumber(draft.score);
  const maxScore = decimalNumber(draft.max_score);
  const weight = decimalNumber(draft.weight);
  const taskId = draft.task_id.trim() === '' ? null : Number(draft.task_id);

  if (!name || Array.from(name).length > 255) errors.name = 'Informe um nome de até 255 caracteres.';
  if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 10000) errors.max_score = 'Informe uma nota máxima maior que 0 e até 10.000.';
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) errors.weight = 'Informe um peso maior que 0 e até 1.000.';
  if (score !== null && (!Number.isFinite(score) || score < 0)) errors.score = 'Informe uma nota maior ou igual a 0, ou deixe em branco.';
  else if (score !== null && Number.isFinite(maxScore) && score > maxScore) errors.score = 'A nota não pode superar a nota máxima.';
  if (taskId !== null && (!Number.isInteger(taskId) || taskId <= 0 || !allowedTaskIds.includes(taskId))) errors.task_id = 'Escolha uma tarefa desta disciplina ou remova o vínculo.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, payload: { name, score, max_score: maxScore, weight, task_id: taskId } };
}

export function syllabusFieldError(value: string): string | null {
  return Array.from(value).length > 20000 ? 'Use até 20.000 caracteres por campo.' : null;
}

export const formatGradeNumber = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 6 }).format(value);
