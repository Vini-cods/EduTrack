import type { CalendarEventCreateInput, CalendarEventWithSubject } from '../types/index.ts';

export const CLASS_WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const MAX_CLASS_OCCURRENCES = 260;
export const MAX_CLASS_RANGE_DAYS = 366;

export interface ClassScheduleDraft {
  subjectId: number;
  days: number[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  return localDateKey(parsed) === value ? parsed : null;
}

function timeMinutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Calendário local, sem somar milissegundos: mudanças de horário de verão não saltam dias. */
export function classOccurrenceDates(draft: ClassScheduleDraft): string[] {
  const start = parseDate(draft.startDate);
  const end = parseDate(draft.endDate);
  if (!start || !end || end < start) return [];
  const dates: string[] = [];
  for (let date = start, days = 0; date <= end && days <= MAX_CLASS_RANGE_DAYS; date.setDate(date.getDate() + 1), days += 1) {
    if (draft.days.includes((date.getDay() + 6) % 7)) dates.push(localDateKey(date));
  }
  return dates;
}

export function validateClassSchedule(draft: ClassScheduleDraft): string | null {
  if (!Number.isInteger(draft.subjectId) || draft.subjectId <= 0) return 'Selecione uma disciplina.';
  if (!draft.days.length || draft.days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) return 'Selecione ao menos um dia da semana.';
  const start = parseDate(draft.startDate);
  const end = parseDate(draft.endDate);
  if (!start || !end) return 'Informe as datas de início e fim do período letivo.';
  if (end < start) return 'O fim do período deve ser igual ou posterior ao início.';
  const rangeDays = (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86_400_000;
  if (rangeDays > MAX_CLASS_RANGE_DAYS) return 'O período deve ter no máximo 366 dias.';
  const startMinutes = timeMinutes(draft.startTime);
  const endMinutes = timeMinutes(draft.endTime);
  if (startMinutes === null || endMinutes === null) return 'Informe horários válidos para a aula.';
  if (endMinutes <= startMinutes) return 'O fim deve ser depois do início, no mesmo dia. Para aulas após meia-noite, crie dois blocos.';
  const dates = classOccurrenceDates(draft);
  if (!dates.length) return 'Não há aulas nos dias selecionados dentro deste período.';
  if (dates.length > MAX_CLASS_OCCURRENCES) return 'A grade ultrapassa 260 aulas. Divida o período letivo.';
  if (draft.location.trim().length > 255) return 'O local deve ter no máximo 255 caracteres.';
  return null;
}

export function buildClassSchedulePayload(draft: ClassScheduleDraft, subjectName: string): CalendarEventCreateInput {
  const error = validateClassSchedule(draft);
  if (error) throw new Error(error);
  return {
    title: `Aula de ${subjectName}`.slice(0, 255),
    category: 'aula', subject_id: draft.subjectId,
    start_datetime: `${draft.startDate}T${draft.startTime}:00`,
    end_datetime: `${draft.startDate}T${draft.endTime}:00`,
    location: draft.location.trim() || null,
    recurrence: { type: 'weekly', days_of_week: [...new Set(draft.days)].sort((a, b) => a - b), until: draft.endDate },
  };
}

function localDateTimeKey(value: string): string {
  const date = new Date(value);
  return `${localDateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Duplicata = mesma disciplina e intervalo; o título/local não tornam uma aula nova. */
export function duplicateClassDates(draft: ClassScheduleDraft, events: CalendarEventWithSubject[]): string[] {
  const existing = new Set(events.filter(event => event.category === 'aula' && event.subject_id === draft.subjectId && event.end_datetime)
    .map(event => `${localDateTimeKey(event.start_datetime)}|${localDateTimeKey(event.end_datetime!)}`));
  return classOccurrenceDates(draft).filter(date => existing.has(`${date}T${draft.startTime}|${date}T${draft.endTime}`));
}

export function scheduleWeek(date: Date): Date[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12));
}
