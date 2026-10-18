import type { CalendarEventWithSubject, TaskWithSubject } from '../types';
import { localDateKey } from './analytics.ts';
import { dashboardAgenda, dashboardPriorities } from './dashboard.ts';

export type TaskRecommendationReason = 'overdue' | 'today' | 'priority' | 'upcoming' | 'undated';
export type DashboardRecommendation =
  | { kind: 'event'; event: CalendarEventWithSubject; phase: 'ongoing' | 'next'; minutesUntil: number }
  | { kind: 'task'; task: TaskWithSubject; reason: TaskRecommendationReason; nextEvent: CalendarEventWithSubject | null }
  | { kind: 'plan' };

const eventRank = (event: CalendarEventWithSubject) => event.category === 'prova' ? 0 : event.category === 'aula' ? 1 : event.category === 'estudo' ? 3 : 2;

/** Explainable triage: attend live/near appointments, then use existing task priorities. */
export function dashboardRecommendation(tasks: TaskWithSubject[], events: CalendarEventWithSubject[], now: Date): DashboardRecommendation {
  const agenda = dashboardAgenda(events, now);
  const timestamp = now.getTime();
  const ongoing = agenda.filter((event) => event.end_datetime
    && new Date(event.start_datetime).getTime() <= timestamp
    && new Date(event.end_datetime).getTime() > timestamp)
    .sort((a, b) => eventRank(a) - eventRank(b) || a.start_datetime.localeCompare(b.start_datetime))[0];
  if (ongoing) return { kind: 'event', event: ongoing, phase: 'ongoing', minutesUntil: 0 };

  const next = agenda.find((event) => new Date(event.start_datetime).getTime() >= timestamp) ?? null;
  const minutesUntil = next ? Math.ceil((new Date(next.start_datetime).getTime() - timestamp) / 60000) : 0;
  if (next && minutesUntil <= 30) return { kind: 'event', event: next, phase: 'next', minutesUntil };

  const task = dashboardPriorities(tasks, now)[0];
  if (task) {
    const today = localDateKey(now);
    const reason: TaskRecommendationReason = task.due_date && task.due_date < today ? 'overdue'
      : task.due_date === today ? 'today'
      : task.priority === 'urgente' || task.priority === 'alta' ? 'priority'
      : task.due_date ? 'upcoming' : 'undated';
    return { kind: 'task', task, reason, nextEvent: next };
  }
  if (next) return { kind: 'event', event: next, phase: 'next', minutesUntil };
  return { kind: 'plan' };
}
