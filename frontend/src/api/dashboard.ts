import apiClient from './client';
import type { CalendarEventWithSubject, DashboardData, TaskWithSubject } from '../types';
import { toDatetimeLocalValue } from '../lib/calendar';

export interface DashboardWorkspace {
  summary: DashboardData;
  tasks: TaskWithSubject[];
  events: CalendarEventWithSubject[];
}

export async function fetchDashboardWorkspace(start: string, end: string, signal: AbortSignal): Promise<DashboardWorkspace> {
  const exclusiveEnd = new Date(`${end}T00:00:00`);
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
  const [summary, tasks, events] = await Promise.all([
    apiClient.get<DashboardData>('/dashboard/', { signal }),
    apiClient.get<TaskWithSubject[]>('/tasks/', { signal }),
    apiClient.get<CalendarEventWithSubject[]>('/calendar-events/', { signal, params: { start: `${start}T00:00:00`, end: toDatetimeLocalValue(exclusiveEnd) } }),
  ]);
  return { summary: summary.data, tasks: tasks.data, events: events.data };
}
