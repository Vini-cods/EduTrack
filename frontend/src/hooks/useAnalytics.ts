import { useCallback, useEffect, useState } from 'react';
import { fetchAnalytics, type AnalyticsQuery } from '../api/analytics';
import type { AcademicAnalytics } from '../types/analytics';

export function useAnalytics({ start, end, timezone, capacity }: AnalyticsQuery) {
  const [data, setData] = useState<AcademicAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((previous) => previous + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setData(null);
    fetchAnalytics({ start, end, timezone, capacity }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [start, end, timezone, capacity, revision]);

  return { data, loading, error, reload };
}
