import type { Task } from '../../types';
import { SyllabusCard } from './SyllabusCard';
import { AssessmentsCard } from './AssessmentsCard';

export function SubjectAcademicRecords({ subjectId, tasks }: { subjectId: number; tasks: Task[] }) {
  return <div className="mt-6 space-y-6"><SyllabusCard subjectId={subjectId} /><AssessmentsCard subjectId={subjectId} tasks={tasks} /></div>;
}
