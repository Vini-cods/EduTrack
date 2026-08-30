export interface User {
  id: number;
  email: string;
  nome: string;
}

export interface Subject {
  id: number;
  nome: string;
  descricao: string;
  progresso: number;
}

export interface Task {
  id: number;
  titulo: string;
  descricao?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  subject_id: number;
}

export interface DashboardData {
  total_subjects: number;
  total_tasks: number;
  completed_tasks: number;
  subjects_progress: { name: string; progress: number }[];
}
