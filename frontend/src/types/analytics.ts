export type AnalyticsPeriod = 'week' | 'month';

export interface AnalyticsDay {
  date: string;
  studied_minutes: number;
  planned_study_minutes: number;
  scheduled_minutes: number;
  unallocated_task_minutes: number;
  total_load_minutes: number;
  capacity_minutes: number;
  load_percent: number;
  tasks_due: number;
  tasks_completed: number;
}

export interface AnalyticsSubject {
  subject_id: number | null;
  subject_name: string;
  subject_color: string | null;
  studied_minutes: number;
  planned_study_minutes: number;
  scheduled_minutes: number;
  unallocated_task_minutes: number;
  total_load_minutes: number;
  tasks_due: number;
  tasks_completed: number;
  completion_rate: number;
}

export interface AcademicAnalytics {
  period: {
    start_date: string;
    end_date: string;
    timezone: string;
    daily_capacity_hours: number;
    as_of: string;
  };
  summary: {
    studied_minutes: number;
    completed_sessions: number;
    active_days: number;
    consistency_percent: number;
    planned_study_minutes: number;
    scheduled_minutes: number;
    unallocated_task_minutes: number;
    total_load_minutes: number;
    capacity_minutes: number;
    load_percent: number;
    tasks_due: number;
    tasks_completed: number;
    completion_rate: number;
    open_tasks: number;
    overdue_tasks: number;
    unknown_estimate_tasks: number;
  };
  daily: AnalyticsDay[];
  subjects: AnalyticsSubject[];
  insights: { id: string; tone: 'info' | 'warning' | 'success'; title: string; description: string }[];
  methodology: string[];
}
