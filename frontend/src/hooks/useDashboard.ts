import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardWorkspace, type DashboardWorkspace } from '../api/dashboard';
import { localDateKey } from '../lib/analytics';

export function useDashboard() {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const today = localDateKey(currentTime);
  const [data, setData] = useState<DashboardWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const update = () => { if (!document.hidden) setCurrentTime(new Date()); };
    const timer = window.setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
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

  return { data, setData, loading, error, reload, today, currentTime };
}
