import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStudyPlanner } from '../api/studyPlanner';
import type { StudyPlannerData } from '../api/studyPlanner';

/** Mantém o último retrato consistente; uma falha de atualização não apaga dados. */
export function useStudyPlanner() {
  const [data, setData] = useState<StudyPlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchStudyPlanner(request.signal);
      if (!request.signal.aborted) setData(next);
    } catch {
      if (!request.signal.aborted) setError('Não foi possível atualizar seu planejamento. Tente novamente.');
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    return () => controller.current?.abort();
  }, [reload]);

  return { data, loading, error, reload };
}
