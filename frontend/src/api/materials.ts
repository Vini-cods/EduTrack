import apiClient from './client';
import type { MaterialCategory, MaterialStatus, MaterialWithSubject } from '../types';
import type { Page } from '../types/pagination';

export interface MaterialPage extends Page<MaterialWithSubject> { status_counts: Record<string, number> }
interface MaterialFilters { q?: string; subject_id?: string; category?: MaterialCategory; status?: MaterialStatus; material_id?: number; limit?: number; offset?: number }

export const materialsApi = {
  page: async (filters: MaterialFilters, signal?: AbortSignal): Promise<MaterialPage> => (
    await apiClient.get<MaterialPage>('/materials/page', { params: { limit: 20, ...filters }, signal, timeout: 15_000 })
  ).data,
};
