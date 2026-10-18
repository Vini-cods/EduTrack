import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, ChartNoAxesCombined, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { AnalyticsControls } from '../components/analytics/AnalyticsControls';
import { AnalyticsError, AnalyticsLoading } from '../components/analytics/AnalyticsState';
import { AnalyticsMethodology } from '../components/analytics/AnalyticsMethodology';
import { StudyTrendChart } from '../components/analytics/StudyTrendChart';
import { AcademicMetric as Metric } from '../components/analytics/AcademicMetric';
import { PeriodComparison } from '../components/analytics/PeriodComparison';
import { PlanningDiagnostics } from '../components/analytics/PlanningDiagnostics';
import { StudyConsistency } from '../components/analytics/StudyConsistency';
import { StudyPatterns } from '../components/analytics/StudyPatterns';
import { SubjectAnalytics } from '../components/analytics/SubjectAnalytics';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAnalyticsPeriod } from '../hooks/useAnalyticsPeriod';
import { useAcademicCapacity } from '../hooks/useAcademicCapacity';
import { analyticsTimezone, formatMinutes } from '../lib/analytics';
import { analyticsCsv, type AnalyticsExport } from '../lib/advancedAnalytics';

export function Insights() {
  const periodState = useAnalyticsPeriod();
  const { capacity } = useAcademicCapacity();
  const { data, loading, error, reload } = useAnalytics({ ...periodState.range, timezone: analyticsTimezone(), capacity });
  const [exportKind, setExportKind] = useState<AnalyticsExport>('daily');

  const exportReport = () => {
    if (!data || loading || error || (exportKind === 'comparison' && !data.comparison?.available)) return;
    let url: string | undefined;
    try {
      const csv = analyticsCsv(data, exportKind);
      url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `edutrack-${exportKind}-${data.period.start_date}-${data.period.end_date}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast.success('CSV preparado com os dados deste período.');
    } catch {
      toast.error('Não foi possível preparar o CSV. Tente novamente.');
    } finally {
      if (url) {
        const exportedUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(exportedUrl), 1000);
      }
    }
  };

  return <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
    <SectionHeader eyebrow="Progresso acadêmico" title="Insights" description="Entenda seu ritmo, identifique lacunas no planejamento e escolha o próximo ajuste."
      action={<Link to="/academic-load" className="inline-flex items-center gap-1.5 text-sm text-crimson font-medium hover:underline">Ver carga acadêmica <ArrowRight size={15} aria-hidden="true" /></Link>} />
    <AnalyticsControls {...periodState} />
    {loading ? <AnalyticsLoading /> : error || !data ? <AnalyticsError reload={reload} /> : <>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-5">
        <p className="text-xs text-muted max-w-lg leading-relaxed">Registros agrupados no fuso {data.period.timezone.replaceAll('_', ' ')}. Navegue por semanas ou meses para investigar seu histórico.</p>
        <div className="flex flex-wrap items-end gap-2">
          <div><label htmlFor="analytics-export" className="block text-xs font-medium text-graphite mb-1.5">Dados para exportar</label><select id="analytics-export" value={exportKind} onChange={(event) => setExportKind(event.target.value as AnalyticsExport)} className="rounded-md border border-border-strong bg-surface text-ink text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crimson/30"><option value="daily">Dados por dia</option><option value="subjects">Dados por disciplina</option><option value="comparison" disabled={!data.comparison?.available}>Comparação de intervalos</option></select></div>
          <Button variant="outline" size="sm" onClick={exportReport} disabled={exportKind === 'comparison' && !data.comparison?.available} icon={<Download size={16} aria-hidden="true" />} className="min-h-10">Baixar CSV</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 py-6 mt-6 border-y border-border" aria-label="Resumo do período">
        <Metric value={formatMinutes(data.summary.studied_minutes)} label="Estudo realizado" detail={`${data.summary.completed_sessions} sessões concluídas no Focus`} />
        <Metric value={`${data.summary.active_days}`} label="Dias com estudo" detail={`${Math.round(data.summary.consistency_percent)}% dos dias transcorridos no período`} />
        <Metric value={data.summary.tasks_due ? `${Math.round(data.summary.completion_rate)}%` : '—'} label="Entregas concluídas" detail={`${data.summary.tasks_completed} de ${data.summary.tasks_due} tarefas com prazo no período`} />
        <Metric value={formatMinutes(data.summary.unallocated_task_minutes)} label="Esforço sem bloco" detail="Estimativa restante ainda sem tempo reservado" alert={data.summary.unallocated_task_minutes > 0} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <Card className="xl:col-span-2 min-w-0">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-xl font-semibold text-ink">Seu ritmo de estudo</h2><p className="text-sm text-graphite mt-1">Agendamento e tempo ativo de sessões concluídas, dia a dia.</p></div><ChartNoAxesCombined size={20} className="shrink-0 text-navy mt-1" aria-hidden="true" /></div>
          <StudyTrendChart days={data.daily} />
        </Card>
        <PeriodComparison comparison={data.comparison} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <StudyConsistency days={data.daily} asOf={data.period.as_of} timezone={data.period.timezone} patterns={data.session_patterns} />
        <PlanningDiagnostics diagnostics={data.planning_diagnostics} insights={data.insights} />
      </div>
      <div className="mt-6"><StudyPatterns patterns={data.session_patterns} /></div>
      <div className="mt-6"><SubjectAnalytics subjects={data.subjects} /></div>
      <AnalyticsMethodology methodology={data.methodology} timezone={data.period.timezone} />
    </>}
  </div>;
}
