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
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** Horas estimadas para concluir a tarefa — campo em destaque no Study Planner. */
  estimated_hours?: number | null;
  subject_id: number;
  created_at: string;
  updated_at: string;
}

/** Tarefa já com os dados da disciplina anexados (retornada por GET /tasks/). */
export interface TaskWithSubject extends Task {
  subject_name: string;
  subject_color?: string | null;
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

export type EventCategory = 'aula' | 'prova' | 'trabalho' | 'estudo' | 'evento';

export interface CalendarEventRecurrenceInput {
  type: 'daily' | 'weekly';
  /** 0 = segunda ... 6 = domingo. Obrigatório para 'weekly'. */
  days_of_week?: number[];
  until: string; // YYYY-MM-DD
}

export interface CalendarEventBase {
  title: string;
  description?: string | null;
  category: EventCategory;
  subject_id?: number | null;
  /** Preenchido quando este evento é a sessão agendada de um objetivo do Study Planner. */
  task_id?: number | null;
  location?: string | null;
  color?: string | null;
  start_datetime: string; // ISO 8601
  end_datetime?: string | null;
}

export interface CalendarEventCreateInput extends CalendarEventBase {
  recurrence?: CalendarEventRecurrenceInput | null;
}

export interface CalendarEvent extends CalendarEventBase {
  id: number;
  recurrence_group_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventWithSubject extends CalendarEvent {
  subject_name?: string | null;
  task_title?: string | null;
}

export type StudySessionStatus = 'em_andamento' | 'pausada' | 'concluida';

export interface StudySession {
  id: number;
  subject_id?: number | null;
  task_id?: number | null;
  status: StudySessionStatus;
  started_at: string;
  ended_at?: string | null;
  /** Tempo ativo total (segundos), já descontando pausas. Calculado no backend. */
  elapsed_seconds: number;
  pomodoro_cycles_completed: number;
  created_at: string;
  updated_at: string;
}

export interface StudySessionWithContext extends StudySession {
  subject_name?: string | null;
  task_title?: string | null;
}

export type MaterialCategory = 'pdf' | 'link' | 'artigo' | 'video' | 'documentacao' | 'github' | 'anotacao' | 'outro';
export type MaterialStatus = 'para_estudar' | 'estudando' | 'concluido';

export interface Material {
  id: number;
  title: string;
  category: MaterialCategory;
  status: MaterialStatus;
  url?: string | null;
  description?: string | null;
  subject_id: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialWithSubject extends Material {
  subject_name: string;
  subject_color?: string | null;
}
