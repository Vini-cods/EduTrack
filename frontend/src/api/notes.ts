import apiClient from './client';
import type { Note, NoteInput } from '../types/notes';

export const notesApi = {
  list: async (query: string, subjectId: string, signal?: AbortSignal): Promise<Note[]> => {
    const response = await apiClient.get<Note[]>('/notes/', { params: { q: query || undefined, subject_id: subjectId || undefined }, signal });
    return response.data;
  },
  create: async (data: NoteInput): Promise<Note> => (await apiClient.post<Note>('/notes/', data)).data,
  update: async (id: number, data: NoteInput): Promise<Note> => (await apiClient.put<Note>(`/notes/${id}`, data)).data,
  remove: async (id: number): Promise<void> => { await apiClient.delete(`/notes/${id}`); },
};
