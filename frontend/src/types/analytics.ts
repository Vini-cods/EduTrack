export type AnalyticsPeriod = 'week' | 'month';

export type AnalyticsAction = 'planner' | 'tasks' | 'focus' | 'academic_load';

export interface AnalyticsInsight {
  id: string;
  tone: 'info' | 'warning' | 'success';
  title: string;
  description: string;
  action?: AnalyticsAction | null;
}

export interface AnalyticsComparison {
  available: boolean;
  elapsed_days: number;
  current_start_date: string | null;
  current_end_date: string | null;
  previous_start_date: string | null;
  previous_end_date: string | null;
  current_studied_minutes: number;
  previous_studied_minutes: number;
  delta_minutes: number;
  change_percent: number | null;
}

export interface AnalyticsSessionPatterns {
  completed_sessions: number;
  average_session_minutes: number;
  median_session_minutes: number;
  longest_session_minutes: number;
  current_streak_days: number;
  longest_streak_days: number;
  weekday_distribution: { weekday: number; studied_minutes: number; completed_sessions: number }[];
  hourly_distribution: { hour: number; studied_minutes: number; completed_sessions: number }[];
}

export interface AnalyticsPlanningDiagnostics {
  overloaded_days: number;
  excess_load_minutes: number;
  peak_date: string | null;
  peak_load_percent: number;
  remaining_task_minutes: number;
  covered_task_minutes: number;
  planning_coverage_percent: number | null;
  estimated_tasks: number;
  tasks_without_estimates: number;
  undated_tasks: number;
}

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
  comparison?: AnalyticsComparison;
  session_patterns?: AnalyticsSessionPatterns;
  planning_diagnostics?: AnalyticsPlanningDiagnostics;
  insights: AnalyticsInsight[];
  methodology: string[];
}
