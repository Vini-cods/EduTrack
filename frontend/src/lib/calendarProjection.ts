import type { CalendarEventWithSubject, TaskWithSubject } from '../types';

function localDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function validDeadline(value?: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) && localDay(parsed) === value;
}

/**
 * Agenda é uma projeção: criar/editar/excluir uma tarefa nunca cria cópias
 * de CalendarEvent. Apenas a identidade é deduplicada, preservando blocos
 * de estudo e ocorrências recorrentes, mesmo com títulos iguais.
 */
export function projectCalendarItems(
  events: CalendarEventWithSubject[],
  tasks: TaskWithSubject[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEventWithSubject[] {
  const startDay = localDay(rangeStart);
  const endDay = localDay(rangeEnd);
  const uniqueEvents = [...new Map(events.filter((event) => event.source !== 'task').map((event) => [event.id, event])).values()];
  const representedDeadlines = new Set(uniqueEvents
    .filter((event) => event.task_id && (event.category === 'trabalho' || event.category === 'prova'))
    .map((event) => `${event.task_id}:${localDay(new Date(event.start_datetime))}`));
  const uniqueTasks = [...new Map(tasks.map((task) => [task.id, task])).values()];
  const deadlines = uniqueTasks.flatMap((task): CalendarEventWithSubject[] => {
    if (!validDeadline(task.due_date) || task.due_date < startDay || task.due_date > endDay
      || representedDeadlines.has(`${task.id}:${task.due_date}`)) return [];
    return [{
      id: -task.id,
      title: task.title,
      description: task.description,
      category: 'trabalho',
      source: 'task',
      all_day: true,
      task_id: task.id,
      task_title: task.title,
      task_status: task.status,
      subject_id: task.subject_id,
      subject_name: task.subject_name,
      start_datetime: `${task.due_date}T00:00:00`,
      end_datetime: null,
      created_at: task.created_at,
      updated_at: task.updated_at,
    }];
  });
  return [...uniqueEvents, ...deadlines].sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
}

export function calendarItemKey(item: CalendarEventWithSubject): string {
  return `${item.source === 'task' ? 'task' : 'event'}:${item.id}`;
}
