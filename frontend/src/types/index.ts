export interface User {
  id: number;
  email: string;
  name: string;
  is_active?: boolean;
}

export interface Subject {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  total_tasks?: number;
  completed_tasks?: number;
  progress?: number;
}

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida';

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: TaskStatus;
  subject_id: number;
}

export interface SubjectProgress {
  subject_id: number;
  subject_name: string;
  total_tasks: number;
  completed_tasks: number;
  progress: number;
}

export interface DashboardData {
  total_subjects: number;
  total_tasks: number;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_completed: number;
  overall_progress: number;
  subjects_progress: SubjectProgress[];
}
