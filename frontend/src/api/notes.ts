import apiClient from './client';
import type { Note, NoteInput } from '../types/notes';
import type { Page } from '../types/pagination';

export interface NoteSearchItem { id: number; title: string; excerpt: string; tags: string[]; subject_name: string | null }

export const notesApi = {
  page: async (query: string, subjectId: string, page: number, signal?: AbortSignal): Promise<Page<Note>> => (
    await apiClient.get<Page<Note>>('/notes/page', { params: { q: query || undefined, subject_id: subjectId || undefined, limit: 20, offset: page * 20 }, signal })
  ).data,
  search: async (query: string, signal?: AbortSignal): Promise<Page<NoteSearchItem>> => (
    await apiClient.get<Page<NoteSearchItem>>('/notes/search', { params: { q: query, limit: 5 }, signal })
  ).data,
  get: async (id: number, signal?: AbortSignal): Promise<Note> => (await apiClient.get<Note>(`/notes/${id}`, { signal })).data,
  list: async (query: string, subjectId: string, signal?: AbortSignal): Promise<Note[]> => {
    const response = await apiClient.get<Note[]>('/notes/', { params: { q: query || undefined, subject_id: subjectId || undefined }, signal });
    return response.data;
  },
  create: async (data: NoteInput): Promise<Note> => (await apiClient.post<Note>('/notes/', data)).data,
  update: async (id: number, data: NoteInput): Promise<Note> => (await apiClient.put<Note>(`/notes/${id}`, data)).data,
  remove: async (id: number): Promise<void> => { await apiClient.delete(`/notes/${id}`); },
};
