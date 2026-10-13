import apiClient from './client';
import type { CalendarEventCreateInput, CalendarEventWithSubject, StudySessionWithContext, Subject, TaskStatus, TaskWithSubject } from '../types';

export interface StudyPlannerData {
  tasks: TaskWithSubject[];
  subjects: Subject[];
  events: CalendarEventWithSubject[];
  sessions: StudySessionWithContext[];
}

export async function fetchStudyPlanner(signal: AbortSignal): Promise<StudyPlannerData> {
  const [tasks, subjects, events, sessions] = await Promise.all([
    apiClient.get<TaskWithSubject[]>('/tasks/', { signal }),
    apiClient.get<Subject[]>('/subjects/', { signal }),
    apiClient.get<CalendarEventWithSubject[]>('/calendar-events/', { signal }),
    apiClient.get<StudySessionWithContext[]>('/study-sessions/', { signal }),
  ]);
  return { tasks: tasks.data, subjects: subjects.data, events: events.data, sessions: sessions.data };
}

export async function setGoalStatus(id: number, status: TaskStatus): Promise<void> {
  await apiClient.patch(`/tasks/${id}/status`, { status });
}

export async function deleteGoal(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}`);
}

export async function scheduleStudyBlock(payload: CalendarEventCreateInput): Promise<void> {
  await apiClient.post('/calendar-events/', payload);
}
