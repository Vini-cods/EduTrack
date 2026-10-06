/**
 * Helpers de data usados por Dashboard, Topbar e Tasks para classificar
 * tarefas por prazo. Centralizados aqui para não duplicar a mesma lógica
 * (e o mesmo bug em potencial) em cada tela.
 *
 * Datas de tarefas vêm do backend como string "YYYY-MM-DD" (sem horário),
 * então sempre construímos o Date à meia-noite local para comparar dia a dia.
 */

export function parseDateOnly(value: string): Date {
  return new Date(value + 'T00:00:00');
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isPastDue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return parseDateOnly(dueDate) < startOfToday();
}

export function isDueToday(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return parseDateOnly(dueDate).toDateString() === startOfToday().toDateString();
}

export function daysUntil(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const diff = parseDateOnly(dueDate).getTime() - startOfToday().getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/** Segunda-feira 00:00 da semana que contém `date` (padrão: hoje). */
export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export type DueDateStatus = 'atrasada' | 'hoje' | 'proximo' | 'sem_prazo';

/**
 * Estado do prazo de uma tarefa NÃO concluída (conclusão é um estado à
 * parte, tratado separadamente pelo strikethrough/ícone de check — não
 * duplicado aqui).
 */
export function getDueDateStatus(dueDate: string | null | undefined): DueDateStatus {
  if (!dueDate) return 'sem_prazo';
  if (isPastDue(dueDate)) return 'atrasada';
  if (isDueToday(dueDate)) return 'hoje';
  return 'proximo';
}

/** Cor do texto do prazo por estado — visual sutil para todos os 5 estados, sem badge em toda tarefa. */
export const DUE_DATE_TEXT_CLASS: Record<DueDateStatus, string> = {
  atrasada: 'text-danger font-medium',
  hoje: 'text-warning font-medium',
  proximo: 'text-graphite',
  sem_prazo: 'text-muted italic',
};

export function isThisWeek(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const d = parseDateOnly(dueDate);
  return d >= start && d < end;
}

export const WEEKDAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

export function formatLongDate(date: Date = new Date()): string {
  const formatted = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(dueDate: string): string {
  return parseDateOnly(dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
