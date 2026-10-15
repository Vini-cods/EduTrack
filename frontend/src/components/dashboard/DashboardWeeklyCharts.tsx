import { ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AcademicLoadChart } from '../analytics/AcademicLoadChart';
import { StudyTrendChart } from '../analytics/StudyTrendChart';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { analyticsDateLabel, formatMinutes } from '../../lib/analytics';
import type { AcademicAnalytics } from '../../types/analytics';

interface DashboardWeeklyChartsProps {
  data: AcademicAnalytics | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/** Reuses the dashboard's weekly response and the same charts as Insights/Academic Load. */
export function DashboardWeeklyCharts({ data, loading, error, reload }: DashboardWeeklyChartsProps) {
  return <section className="mt-8 pt-7 border-t border-border" aria-labelledby="dashboard-weekly-charts-title" aria-busy={loading}>
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 id="dashboard-weekly-charts-title" className="font-serif text-2xl font-semibold text-ink">Seu ritmo nesta semana</h2>
        <p className="text-sm text-graphite mt-1">
          {data ? `${analyticsDateLabel(data.period.start_date)} a ${analyticsDateLabel(data.period.end_date)} · ` : ''}
          Compare o que foi reservado com o tempo estudado e veja os dias mais carregados.
        </p>
      </div>
      <Link to="/insights" className="inline-flex items-center gap-1.5 min-h-11 text-sm font-medium text-crimson hover:underline">
        Explorar Insights <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>

    {loading ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" role="status" aria-label="Carregando gráficos da semana">
      {[0, 1].map((item) => <Card key={item} className="min-w-0"><Skeleton className="h-5 w-48 mb-3" /><Skeleton className="h-4 w-64 max-w-full mb-5" /><Skeleton className="h-64 w-full" /></Card>)}
      <span className="sr-only">Carregando estudo e carga acadêmica.</span>
    </div> : error || !data ? <Card>
      <div role="alert"><h3 className="text-ink font-medium">Os gráficos da semana estão indisponíveis</h3><p className="mt-2 mb-4 text-sm text-graphite">Tente carregar novamente para comparar seu planejamento com as sessões concluídas.</p></div>
      <Button variant="outline" onClick={reload} icon={<RefreshCw size={16} />}>Recarregar gráficos</Button>
    </Card> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="min-w-0" aria-labelledby="dashboard-study-chart-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 id="dashboard-study-chart-title" className="font-serif text-xl font-semibold text-ink">Planejamento e estudo</h3><p className="text-sm text-graphite mt-1">Blocos de estudo agendados × sessões concluídas.</p></div>
          <Link to="/study" className="inline-flex items-center gap-1 min-h-11 text-sm text-crimson font-medium hover:underline">Planner <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 mt-5 text-sm">
          <div><dt className="text-graphite">Agendado</dt><dd className="text-ink font-semibold tabular-nums mt-1">{formatMinutes(data.summary.planned_study_minutes)}</dd></div>
          <div><dt className="text-graphite">Realizado</dt><dd className="text-ink font-semibold tabular-nums mt-1">{formatMinutes(data.summary.studied_minutes)}</dd></div>
        </dl>
        <StudyTrendChart days={data.daily} />
        <p className="text-xs text-muted mt-4 leading-relaxed">O realizado considera apenas tempo ativo de sessões concluídas. Dias futuros mostram somente o planejamento.</p>
      </Card>

      <Card className="min-w-0" aria-labelledby="dashboard-load-chart-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 id="dashboard-load-chart-title" className="font-serif text-xl font-semibold text-ink">Carga por dia</h3><p className="text-sm text-graphite mt-1">Agenda, estimativas restantes e sua capacidade.</p></div>
          <Link to="/academic-load" className="inline-flex items-center gap-1 min-h-11 text-sm text-crimson font-medium hover:underline">Ajustar carga <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 mt-5 text-sm">
          <div><dt className="text-graphite">Carga prevista</dt><dd className="text-ink font-semibold tabular-nums mt-1">{formatMinutes(data.summary.total_load_minutes)}</dd></div>
          <div><dt className="text-graphite">Capacidade</dt><dd className="text-ink font-semibold tabular-nums mt-1">{formatMinutes(data.summary.capacity_minutes)}</dd></div>
        </dl>
        <AcademicLoadChart days={data.daily} />
        <p className="text-xs text-muted mt-4 leading-relaxed">Estimativas já cobertas por blocos de estudo entram uma única vez na carga.
          {data.summary.unknown_estimate_tasks > 0 ? ` Há ${data.summary.unknown_estimate_tasks} tarefas abertas sem estimativa; a carga pode estar subestimada.` : ''}
        </p>
      </Card>
    </div>}
  </section>;
}
