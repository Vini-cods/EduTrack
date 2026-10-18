import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { analyticsDateLabel, formatMinutes } from '../../lib/analytics';
import type { AnalyticsComparison } from '../../types/analytics';
import { Card } from '../ui/Card';

export function PeriodComparison({ comparison, compact = false }: { comparison?: AnalyticsComparison; compact?: boolean }) {
  const period = (start: string | null, end: string | null) => start && end ? `${analyticsDateLabel(start)} – ${analyticsDateLabel(end)} ${end.slice(0, 4)}` : 'Sem intervalo disponível';
  const delta = comparison?.delta_minutes ?? 0;
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  return <Card className="min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className={compact ? 'text-base font-semibold text-ink' : 'font-serif text-xl font-semibold text-ink'}>Evolução do tempo estudado</h2><p className="text-xs text-graphite mt-1">Comparação com o intervalo anterior equivalente.</p></div>
      {compact && <Link to="/insights" aria-label="Ver análise completa de estudo" className="text-crimson p-1 hover:bg-surface-muted rounded"><ArrowRight size={18} aria-hidden="true" /></Link>}
    </div>
    {!comparison ? <p className="text-sm text-muted mt-4">Comparação indisponível nesta versão da API.</p> : !comparison.available ? <p className="text-sm text-graphite mt-4">A comparação estará disponível quando houver dias transcorridos neste período.</p> : <>
      <div className="grid grid-cols-2 gap-4 mt-5">
        <div><p className="text-xs text-muted">Intervalo atual</p><p className="text-2xl font-semibold text-ink tabular-nums mt-1">{formatMinutes(comparison.current_studied_minutes)}</p><p className="text-xs text-graphite mt-1">{period(comparison.current_start_date, comparison.current_end_date)}</p></div>
        <div><p className="text-xs text-muted">Anterior equivalente</p><p className="text-2xl font-semibold text-graphite tabular-nums mt-1">{formatMinutes(comparison.previous_studied_minutes)}</p><p className="text-xs text-graphite mt-1">{period(comparison.previous_start_date, comparison.previous_end_date)}</p></div>
      </div>
      <p className="flex items-start gap-2 text-sm text-ink mt-5 pt-4 border-t border-border"><Icon size={17} className="shrink-0 mt-0.5 text-crimson" aria-hidden="true" /><span>{delta === 0 ? 'Mesmo tempo registrado nos dois intervalos.' : `${formatMinutes(Math.abs(delta))} a ${delta > 0 ? 'mais' : 'menos'}`}{delta !== 0 && comparison.change_percent !== null && ` (${Math.abs(comparison.change_percent).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`}{comparison.change_percent === null && ' · sem base anterior para calcular variação percentual.'}</span></p>
      <p className="text-xs text-muted leading-relaxed mt-3">{comparison.elapsed_days} {comparison.elapsed_days === 1 ? 'dia comparável em cada intervalo' : 'dias comparáveis em cada intervalo'}. O dia atual, quando incluído, ainda é parcial.{!compact && ' Mais tempo registrado não significa, por si só, melhor aprendizagem.'}</p>
    </>}
  </Card>;
}
