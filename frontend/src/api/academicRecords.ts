import apiClient from './client';
import type { Assessment, AssessmentInput, AssessmentList, SubjectSyllabus, SubjectSyllabusInput } from '../types/academicRecords';

export const academicRecordsApi = {
  getSyllabus: async (subjectId: number, signal?: AbortSignal): Promise<SubjectSyllabus> =>
    (await apiClient.get<SubjectSyllabus>(`/subjects/${subjectId}/syllabus`, { signal, timeout: 15_000 })).data,
  saveSyllabus: async (subjectId: number, input: SubjectSyllabusInput): Promise<SubjectSyllabus> =>
    (await apiClient.put<SubjectSyllabus>(`/subjects/${subjectId}/syllabus`, input)).data,
  getAssessments: async (subjectId: number, signal?: AbortSignal): Promise<AssessmentList> =>
    (await apiClient.get<AssessmentList>(`/subjects/${subjectId}/assessments`, { signal, timeout: 15_000 })).data,
  createAssessment: async (subjectId: number, input: AssessmentInput): Promise<Assessment> =>
    (await apiClient.post<Assessment>(`/subjects/${subjectId}/assessments`, input)).data,
  updateAssessment: async (subjectId: number, assessmentId: number, input: AssessmentInput): Promise<Assessment> =>
    (await apiClient.put<Assessment>(`/subjects/${subjectId}/assessments/${assessmentId}`, input)).data,
  removeAssessment: async (subjectId: number, assessmentId: number): Promise<void> => {
    await apiClient.delete(`/subjects/${subjectId}/assessments/${assessmentId}`);
  },
};
