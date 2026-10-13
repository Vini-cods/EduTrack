import { useMemo, useState } from 'react';
import { analyticsRange, shiftAnalyticsPeriod } from '../lib/analytics';
import type { AnalyticsPeriod } from '../types/analytics';

export function useAnalyticsPeriod() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const range = useMemo(() => analyticsRange(period, anchor), [period, anchor]);
  const navigate = (direction: number) => setAnchor((value) => shiftAnalyticsPeriod(value, period, direction));
  const goToday = () => setAnchor(new Date());
  return { period, setPeriod, range, navigate, goToday };
}
