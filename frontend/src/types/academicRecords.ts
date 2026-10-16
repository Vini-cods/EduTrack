export interface SubjectSyllabusInput {
  objectives: string;
  topics: string;
  bibliography: string;
}

export interface SubjectSyllabus extends SubjectSyllabusInput {
  updated_at: string | null;
}

export interface AssessmentInput {
  name: string;
  score: number | null;
  max_score: number;
  weight: number;
  task_id: number | null;
}

export interface Assessment extends AssessmentInput {
  id: number;
  subject_id: number;
  task_title: string | null;
  due_date: string | null;
}

export interface GradeSummary {
  total_count: number;
  graded_count: number;
  total_weight: number;
  graded_weight: number;
  coverage_percent: number;
  partial_average: number | null;
}

export interface AssessmentList {
  items: Assessment[];
  summary: GradeSummary;
}
