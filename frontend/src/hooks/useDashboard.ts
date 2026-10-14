import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardWorkspace, type DashboardWorkspace } from '../api/dashboard';
import { localDateKey } from '../lib/analytics';

export function useDashboard() {
  const [today, setToday] = useState(() => localDateKey(new Date()));
  const [data, setData] = useState<DashboardWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDateKey(new Date())), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const lastDay = new Date(`${today}T00:00:00`);
    lastDay.setDate(lastDay.getDate() + 14);
    setLoading(true);
    setError(false);
    fetchDashboardWorkspace(today, localDateKey(lastDay), controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [today, revision]);

  return { data, setData, loading, error, reload, today };
}
