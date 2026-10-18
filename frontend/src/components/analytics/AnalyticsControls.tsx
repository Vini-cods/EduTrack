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
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex w-fit items-center gap-1 rounded-md border border-border p-1" role="group" aria-label="Período de análise">
        {(['week', 'month'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}
            className={`min-h-11 rounded px-3 py-1.5 text-sm font-medium transition-colors ${period === value ? 'bg-navy text-white' : 'text-graphite hover:bg-surface-muted'}`}>
            {value === 'week' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2" role="group" aria-label="Navegar entre períodos">
          <Button variant="outline" size="sm" className="h-11 w-11" aria-label="Período anterior" onClick={() => navigate(-1)} icon={<ChevronLeft size={16} aria-hidden="true" />} />
          <p className="min-w-0 text-center text-sm leading-snug text-graphite tabular-nums" aria-live="polite">{analyticsDateLabel(range.start)} – {analyticsDateLabel(range.end)} {range.end.slice(0, 4)}</p>
          <Button variant="outline" size="sm" className="h-11 w-11" aria-label="Próximo período" onClick={() => navigate(1)} icon={<ChevronRight size={16} aria-hidden="true" />} />
        </div>
        <Button variant="ghost" size="sm" className="min-h-11" onClick={goToday}>Hoje</Button>
      </div>
    </div>
  );
}
