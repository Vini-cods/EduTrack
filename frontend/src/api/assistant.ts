import apiClient from './client';
import type { AssistantReply, AssistantRequest, AssistantStatus } from '../lib/assistant';

export const assistantApi = {
  status: async (signal: AbortSignal): Promise<AssistantStatus> => (
    await apiClient.get<AssistantStatus>('/assistant/status', { signal, timeout: 10000 })
  ).data,
  chat: async (data: AssistantRequest, signal: AbortSignal): Promise<AssistantReply> => (
    await apiClient.post<AssistantReply>('/assistant/chat', data, { signal, timeout: 70000 })
  ).data,
};
