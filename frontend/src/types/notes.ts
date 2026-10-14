export interface Note {
  id: number;
  title: string;
  content: string;
  tags: string[];
  subject_id: number | null;
  task_id: number | null;
  study_session_id: number | null;
  subject_name: string | null;
  subject_color: string | null;
  created_at: string;
  updated_at: string;
}
export interface NoteInput {
  title: string;
  content: string;
  tags: string[];
  subject_id: number | null;
  task_id: number | null;
  study_session_id: number | null;
}
