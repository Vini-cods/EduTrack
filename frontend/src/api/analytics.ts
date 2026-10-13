import apiClient from './client';
import type { AcademicAnalytics } from '../types/analytics';

export interface AnalyticsQuery {
  start: string;
  end: string;
  timezone: string;
  capacity: number;
}

export async function fetchAnalytics(query: AnalyticsQuery, signal: AbortSignal): Promise<AcademicAnalytics> {
  const response = await apiClient.get<AcademicAnalytics>('/analytics/', {
    signal,
    params: {
      start_date: query.start,
      end_date: query.end,
      timezone: query.timezone,
      daily_capacity_hours: query.capacity,
    },
  });
  return response.data;
}
