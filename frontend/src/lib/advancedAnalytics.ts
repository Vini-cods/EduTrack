import type { AcademicAnalytics, AnalyticsAction, AnalyticsDay } from '../types/analytics.ts';

export const analyticsActionLinks: Record<AnalyticsAction, { to: string; label: string }> = {
  planner: { to: '/study', label: 'Ajustar planejamento' },
  tasks: { to: '/tasks', label: 'Revisar tarefas' },
  focus: { to: '/study/focus', label: 'Iniciar uma sessão' },
  academic_load: { to: '/academic-load', label: 'Revisar carga' },
};

export const analyticsWeekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** Use the report timezone rather than the browser timezone for future-day labels. */
export function reportDateKey(instant: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function consistencyCalendar(days: AnalyticsDay[]): (AnalyticsDay | null)[] {
  if (!days.length) return [];
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const weekday = new Date(`${ordered[0].date}T00:00:00Z`).getUTCDay();
  return [...Array.from<null>({ length: (weekday + 6) % 7 }).fill(null), ...ordered];
}

export function studyIntensity(minutes: number, maximum: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0 || maximum <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil(minutes / maximum * 4))) as 1 | 2 | 3 | 4;
}

export type AnalyticsExport = 'daily' | 'subjects' | 'comparison';
type CsvCell = string | number | null | undefined;

/** Semicolon-separated UTF-8 CSV for spreadsheets. Neutralize user-controlled formulas. */
export function csvCell(value: CsvCell): string {
  let text = value == null ? '' : String(value);
  if (typeof value === 'string' && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvRows(rows: CsvCell[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}

export function analyticsCsv(data: AcademicAnalytics, kind: AnalyticsExport): string {
  const timezone = data.period.timezone;
  if (kind === 'daily') return csvRows([
    ['Data', 'Fuso', 'Estudado (min)', 'Estudo agendado (min)', 'Agenda total (min)', 'Esforço sem bloco (min)', 'Carga (min)', 'Capacidade (min)', 'Ocupação (%)', 'Tarefas com prazo', 'Concluídas com prazo', 'Eventos de conclusão', 'Eventos de reabertura'],
    ...data.daily.map((day) => [day.date, timezone, day.studied_minutes, day.planned_study_minutes, day.scheduled_minutes, day.unallocated_task_minutes, day.total_load_minutes, day.capacity_minutes, day.load_percent, day.tasks_due, day.tasks_completed, day.completion_events ?? 0, day.reopened_events ?? 0]),
  ]);
  if (kind === 'subjects') return csvRows([
    ['Início', 'Fim', 'Fuso', 'Disciplina', 'Estudado (min)', 'Estudo agendado (min)', 'Agenda total (min)', 'Esforço sem bloco (min)', 'Carga (min)', 'Tarefas com prazo', 'Concluídas', 'Conclusão (%)'],
    ...data.subjects.map((subject) => [data.period.start_date, data.period.end_date, timezone, subject.subject_name, subject.studied_minutes, subject.planned_study_minutes, subject.scheduled_minutes, subject.unallocated_task_minutes, subject.total_load_minutes, subject.tasks_due, subject.tasks_completed, subject.completion_rate]),
  ]);
  const comparison = data.comparison;
  return csvRows([
    ['Intervalo', 'Início', 'Fim', 'Fuso', 'Dias comparáveis', 'Estudado (min)', 'Diferença (min)', 'Variação (%)'],
    ...(comparison?.available ? [
      ['Atual', comparison.current_start_date, comparison.current_end_date, timezone, comparison.elapsed_days, comparison.current_studied_minutes, comparison.delta_minutes, comparison.change_percent],
      ['Anterior equivalente', comparison.previous_start_date, comparison.previous_end_date, timezone, comparison.elapsed_days, comparison.previous_studied_minutes, null, null],
    ] : []),
  ]);
}
