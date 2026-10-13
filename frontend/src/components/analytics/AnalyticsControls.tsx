import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { analyticsDateLabel } from '../../lib/analytics';
import type { AnalyticsPeriod } from '../../types/analytics';

interface AnalyticsControlsProps {
  period: AnalyticsPeriod;
  setPeriod: (period: AnalyticsPeriod) => void;
  range: { start: string; end: string };
  navigate: (direction: number) => void;
  goToday: () => void;
}

export function AnalyticsControls({ period, setPeriod, range, navigate, goToday }: AnalyticsControlsProps) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 rounded-md border border-border p-1" aria-label="Período de análise">
        {(['week', 'month'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${period === value ? 'bg-navy text-white' : 'text-graphite hover:bg-surface-muted'}`}>
            {value === 'week' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" aria-label="Período anterior" onClick={() => navigate(-1)} icon={<ChevronLeft size={16} />} />
        <p className="text-sm text-graphite tabular-nums" aria-live="polite">{analyticsDateLabel(range.start)} – {analyticsDateLabel(range.end)} {range.end.slice(0, 4)}</p>
        <Button variant="outline" size="sm" aria-label="Próximo período" onClick={() => navigate(1)} icon={<ChevronRight size={16} />} />
        <Button variant="ghost" size="sm" onClick={goToday}>Hoje</Button>
      </div>
    </div>
  );
}
