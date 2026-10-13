import type { CalendarEventWithSubject, StudySessionWithContext, Task, TaskWithSubject } from '../types/index.ts';
import { parseDateOnly, startOfWeek } from './date.ts';
import { PRIORITY_META } from './tasks.ts';
import { toDatetimeLocalValue } from './calendar.ts';

export type GoalFilter = 'active' | 'week' | 'overdue' | 'unscheduled' | 'completed' | 'all';
export type GoalSort = 'priority' | 'deadline';

export function isStudyGoal(task: Task): boolean {
  return Number.isFinite(task.estimated_hours) && (task.estimated_hours ?? 0) > 0;
}

/** Apenas blocos de estudo futuros ou em curso, sem confundir prova/aula com estudo. */
export function upcomingStudyBlocks(events: CalendarEventWithSubject[], now: Date): CalendarEventWithSubject[] {
  return events.filter((event) => event.category === 'estudo' &&
    new Date(event.end_datetime || event.start_datetime).getTime() > now.getTime())
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime() || a.id - b.id);
}

export function filterStudyGoals(tasks: TaskWithSubject[], events: CalendarEventWithSubject[], filter: GoalFilter,
  subjectId: string, sort: GoalSort, now: Date): TaskWithSubject[] {
  const scheduled = new Set(upcomingStudyBlocks(events, now).map((event) => event.task_id));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return tasks.filter((task) => {
    if (!isStudyGoal(task) || (subjectId && task.subject_id !== Number(subjectId))) return false;
    const completed = task.status === 'concluida';
    const due = task.due_date ? parseDateOnly(task.due_date) : null;
    switch (filter) {
      case 'active': return !completed;
      case 'completed': return completed;
      case 'overdue': return !completed && due !== null && due < today;
      case 'week': return !completed && due !== null && due >= weekStart && due < weekEnd;
      case 'unscheduled': return !completed && !scheduled.has(task.id);
      default: return true;
    }
  }).sort((a, b) => {
    const priority = PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
    const deadline = (a.due_date || '9999').localeCompare(b.due_date || '9999');
    return (sort === 'priority' ? priority || deadline : deadline || priority) || a.id - b.id;
  });
}

/** Estimativa, agenda e execução são métricas distintas; nenhuma conclui outra automaticamente. */
export function studyWeekSummary(tasks: TaskWithSubject[], events: CalendarEventWithSubject[],
  sessions: StudySessionWithContext[], now: Date) {
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const goals = filterStudyGoals(tasks, events, 'week', '', 'priority', now);
  const scheduledSeconds = events.reduce((total, event) => {
    if (event.category !== 'estudo' || !event.end_datetime) return total;
    const overlap = Math.min(new Date(event.end_datetime).getTime(), end.getTime()) -
      Math.max(new Date(event.start_datetime).getTime(), start.getTime());
    return total + Math.max(0, overlap / 1000);
  }, 0);
  // O contrato atual não armazena segmentos por dia. Atribuímos cada sessão
  // concluída à semana do início, sem fingir precisão na virada de semana.
  const studiedSeconds = sessions.reduce((total, session) => {
    const started = new Date(session.started_at.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(session.started_at)
      ? session.started_at : `${session.started_at}Z`);
    return session.status === 'concluida' && started >= start && started < end
      ? total + session.elapsed_seconds : total;
  }, 0);
  return { count: goals.length, estimatedSeconds: goals.reduce((sum, task) => sum + (task.estimated_hours ?? 0) * 3600, 0),
    scheduledSeconds, studiedSeconds };
}

export function formatStudyDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const remainder = minutes % 60;
  return `${Math.floor(minutes / 60)}h${remainder ? ` ${remainder}min` : ''}`;
}

export function buildStudyBlock(task: Task, date: string, time: string, minutes: number) {
  const start = new Date(`${date}T${time}`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(minutes) || minutes < 5 || minutes > 720) {
    throw new Error('Informe data, horário e duração entre 5 e 720 minutos.');
  }
  const end = new Date(start.getTime() + minutes * 60_000);
  return { title: task.title, category: 'estudo' as const, subject_id: task.subject_id, task_id: task.id,
    start_datetime: toDatetimeLocalValue(start), end_datetime: toDatetimeLocalValue(end) };
}

export function conflictingEvents(events: CalendarEventWithSubject[], start: string, end: string): CalendarEventWithSubject[] {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  return events.filter((event) => {
    const eventStart = new Date(event.start_datetime).getTime();
    const eventEnd = new Date(event.end_datetime || event.start_datetime).getTime();
    return eventEnd > eventStart ? eventStart < to && eventEnd > from : eventStart >= from && eventStart < to;
  });
}

export function studyBlockPastDeadline(dueDate: string | null | undefined, endDatetime: string): boolean {
  if (!dueDate) return false;
  const limit = parseDateOnly(dueDate);
  limit.setDate(limit.getDate() + 1);
  return new Date(endDatetime).getTime() > limit.getTime();
}
