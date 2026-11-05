import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { assistantApi } from '../api/assistant';
import { ASSISTANT_MESSAGE_LIMIT, assistantErrorMessage, assistantHistory, assistantTimezone } from '../lib/assistant';
import type { AssistantMessage, AssistantStatus } from '../lib/assistant';

/** The parent keys this hook's component by account/session; no conversation is persisted. */
export function useAssistant(active: boolean) {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [includeContext, setIncludeContext] = useState(true);
  const [pendingMessage, setPendingMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const nextId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; controller.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!active) return;
    const request = new AbortController();
    setStatusLoading(true);
    setStatusError(false);
    assistantApi.status(request.signal).then(value => {
      if (!request.signal.aborted) setStatus(value);
    }).catch(() => {
      if (!request.signal.aborted) { setStatus(null); setStatusError(true); }
    }).finally(() => { if (!request.signal.aborted) setStatusLoading(false); });
    return () => request.abort();
  }, [active, revision]);

  const cancel = useCallback(() => {
    generation.current++;
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setPendingMessage('');
    setError('');
  }, []);

  const clear = useCallback(() => { cancel(); setMessages([]); }, [cancel]);
  const changeContext = useCallback((value: boolean) => {
    // Older replies may contain academic data. Never forward them after opting out.
    clear();
    setIncludeContext(value);
  }, [clear]);

  const send = async (text: string): Promise<boolean> => {
    const content = text.trim();
    if (controller.current || !status?.configured || !content || content.length > ASSISTANT_MESSAGE_LIMIT) return false;
    const request = new AbortController();
    controller.current = request;
    const version = ++generation.current;
    setPendingMessage(content);
    setError('');
    setBusy(true);
    try {
      const response = await assistantApi.chat({
        message: content,
        history: assistantHistory(messages),
        timezone: assistantTimezone(),
        include_context: includeContext,
      }, request.signal);
      if (!mounted.current || request.signal.aborted || version !== generation.current) return false;
      const userId = ++nextId.current;
      const replyId = ++nextId.current;
      setMessages(previous => [...previous,
        { id: userId, role: 'user', content },
        { id: replyId, role: 'assistant', content: response.reply, sources: response.sources, context: response.context },
      ]);
      setPendingMessage('');
      return true;
    } catch (failure: unknown) {
      if (mounted.current && !request.signal.aborted && version === generation.current) {
        setError(assistantErrorMessage(isAxiosError(failure) ? failure.response?.status : undefined));
      }
      return false;
    } finally {
      if (mounted.current && version === generation.current) { controller.current = null; setBusy(false); }
    }
  };

  return {
    status, statusLoading, statusError, messages, includeContext, pendingMessage, busy, error,
    send, cancel, clear, changeContext,
    refreshStatus: () => setRevision(value => value + 1),
  };
}
