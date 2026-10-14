import type { CalendarEventWithSubject, TaskWithSubject } from '../types';
import { localDateKey } from './analytics.ts';

const PRIORITY_WEIGHT = { urgente: 3, alta: 2, media: 1, baixa: 0 } as const;

/** Choose one actionable row per task, with deadlines preceding general priority. */
export function dashboardPriorities(tasks: TaskWithSubject[], now: Date): TaskWithSubject[] {
  const today = localDateKey(now);
  const upcoming = new Date(now);
  upcoming.setDate(upcoming.getDate() + 7);
  const horizon = localDateKey(upcoming);
  const bucket = (task: TaskWithSubject) => {
    if (task.due_date && task.due_date < today) return 0;
    if (task.due_date === today) return 1;
    if (task.priority === 'urgente' || task.priority === 'alta') return 2;
    if (task.due_date && task.due_date <= horizon) return 3;
    return task.due_date ? 5 : 4;
  };
  return [...new Map(tasks.map((task) => [task.id, task])).values()]
    .filter((task) => task.status !== 'concluida')
    .sort((a, b) => bucket(a) - bucket(b)
      || PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
      || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.id - b.id);
}

/** Include ongoing appointments across midnight; projected deadlines belong to tasks. */
export function dashboardAgenda(events: CalendarEventWithSubject[], now: Date): CalendarEventWithSubject[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [...new Map(events.map((event) => [event.id, event])).values()]
    .filter((event) => {
      if (event.source === 'task') return false;
      const eventStart = new Date(event.start_datetime);
      const eventEnd = event.end_datetime ? new Date(event.end_datetime) : eventStart;
      return eventStart < end && (eventEnd > start || eventStart >= start);
    })
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime) || a.id - b.id);
}

/** Calendar projection already merges linked deadlines; preserve separate study blocks. */
export function dashboardDeadlines(items: CalendarEventWithSubject[], now: Date): CalendarEventWithSubject[] {
  const today = localDateKey(now);
  const horizonDate = new Date(now);
  horizonDate.setDate(horizonDate.getDate() + 14);
  const horizon = localDateKey(horizonDate);
  return [...new Map(items.map((item) => [item.id, item])).values()]
    .filter((item) => item.start_datetime.slice(0, 10) > today
      && item.start_datetime.slice(0, 10) <= horizon
      && (item.source === 'task' ? item.task_status !== 'concluida' : item.category === 'prova' || item.category === 'trabalho'))
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime) || a.id - b.id);
}
