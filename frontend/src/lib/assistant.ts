export type AssistantRole = 'user' | 'assistant';
export interface AssistantHistoryItem { role: AssistantRole; content: string }
export interface AssistantSource { kind: 'task' | 'event' | 'subject' | 'session'; id: number; label: string }
export interface AssistantContext {
  as_of: string;
  timezone: string;
  pending_tasks: number;
  tasks_included: number;
  events_included: number;
  subjects_included: number;
  truncated: boolean;
}
export interface AssistantReply { reply: string; sources: AssistantSource[]; context: AssistantContext | null }
export interface AssistantMessage extends AssistantHistoryItem {
  id: number;
  sources?: AssistantSource[];
  context?: AssistantContext | null;
}
export interface AssistantStatus { configured: boolean; provider: 'openai'; model: string | null }
export interface AssistantRequest {
  message: string;
  history: AssistantHistoryItem[];
  timezone: string;
  include_context: boolean;
}

export const ASSISTANT_MESSAGE_LIMIT = 2000;
export const ASSISTANT_HISTORY_LIMIT = 10;

/** Keep complete recent turns, and never send presentation metadata as instructions. */
export function assistantHistory(messages: AssistantHistoryItem[]): AssistantHistoryItem[] {
  return messages.slice(-ASSISTANT_HISTORY_LIMIT).map(({ role, content }) => ({ role, content: Array.from(content).slice(0, 4000).join('') }));
}

export function assistantSourcePath(source: AssistantSource): string | null {
  if (!Number.isSafeInteger(source.id) || source.id < 1) return null;
  switch (source.kind) {
    case 'task': return `/tasks?highlight=${source.id}`;
    case 'subject': return `/subjects/${source.id}`;
    case 'event': return '/calendar';
    case 'session': return '/study';
    default: return null;
  }
}

export function assistantErrorMessage(status?: number): string {
  if (status === 401) return 'Sua sessão expirou. Entre novamente para conversar com a Morgana.';
  if (status === 422) return 'Não foi possível atender a essa mensagem. Reformule a pergunta e tente novamente.';
  if (status === 429) return 'A Morgana recebeu muitas solicitações. Aguarde um pouco e tente novamente.';
  if (status === 503) return 'A IA ainda não está disponível. Confira a configuração do backend e verifique a conexão novamente.';
  if (status === 504) return 'A resposta demorou mais que o esperado. Você pode tentar novamente.';
  return 'Não foi possível receber a resposta. Verifique sua conexão e tente novamente.';
}

export function assistantTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}
