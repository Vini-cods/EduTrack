import { Link } from 'react-router-dom';
import { ArrowRight, ChartNoAxesCombined, CheckCircle2, Lightbulb } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { AnalyticsControls } from '../components/analytics/AnalyticsControls';
import { AnalyticsError, AnalyticsLoading } from '../components/analytics/AnalyticsState';
import { AnalyticsMethodology } from '../components/analytics/AnalyticsMethodology';
import { StudyTrendChart } from '../components/analytics/StudyTrendChart';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAnalyticsPeriod } from '../hooks/useAnalyticsPeriod';
import { useAcademicCapacity } from '../hooks/useAcademicCapacity';
import { analyticsTimezone, formatMinutes } from '../lib/analytics';

export function Insights() {
  const periodState = useAnalyticsPeriod();
  const { capacity } = useAcademicCapacity();
  const { data, loading, error, reload } = useAnalytics({ ...periodState.range, timezone: analyticsTimezone(), capacity });

  return <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
    <SectionHeader eyebrow="Progresso acadêmico" title="Insights" description="Entenda seu ritmo, compare intenção e execução e ajuste a próxima semana."
      action={<Link to="/academic-load" className="inline-flex items-center gap-1.5 text-sm text-crimson font-medium hover:underline">Ver carga acadêmica <ArrowRight size={15} /></Link>} />
    <AnalyticsControls {...periodState} />
    {loading ? <AnalyticsLoading /> : error || !data ? <AnalyticsError reload={reload} /> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 py-6 mt-6 border-y border-border" aria-label="Resumo do período">
        <Metric value={formatMinutes(data.summary.studied_minutes)} label="Estudo realizado" detail={`${data.summary.completed_sessions} sessões concluídas no Focus`} />
        <Metric value={`${data.summary.active_days}`} label="Dias com estudo" detail={`${Math.round(data.summary.consistency_percent)}% dos dias transcorridos no período`} />
        <Metric value={formatMinutes(data.summary.planned_study_minutes)} label="Estudo agendado" detail="Blocos do Study Planner e calendário" />
        <Metric value={data.summary.tasks_due ? `${Math.round(data.summary.completion_rate)}%` : '—'} label="Entregas concluídas" detail={`${data.summary.tasks_completed} de ${data.summary.tasks_due} tarefas com prazo no período`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <Card className="xl:col-span-2 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-serif text-xl font-semibold text-ink">Seu ritmo de estudo</h2><p className="text-sm text-graphite mt-1">Agendamento e tempo ativo de sessões concluídas, dia a dia.</p></div>
            <ChartNoAxesCombined size={20} className="shrink-0 text-navy mt-1" aria-hidden="true" />
          </div>
          <StudyTrendChart days={data.daily} />
        </Card>
        <Card className="min-w-0">
          <h2 className="font-serif text-xl font-semibold text-ink">Atenção ao próximo passo</h2>
          <p className="text-sm text-graphite mt-1 mb-5">Observações calculadas a partir dos seus registros.</p>
          {data.insights.length ? <ul className="divide-y divide-border">{data.insights.map((insight) => <li key={insight.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex gap-2 items-start"><Lightbulb size={16} className={`shrink-0 mt-0.5 ${insight.tone === 'warning' ? 'text-warning' : insight.tone === 'success' ? 'text-success' : 'text-navy'}`} aria-hidden="true" /><div><h3 className="text-sm font-medium text-ink">{insight.title}</h3><p className="text-sm text-graphite leading-relaxed mt-1">{insight.description}</p></div></div>
          </li>)}</ul> : <p className="text-sm text-muted leading-relaxed">Ainda não há registros suficientes para sugerir ajustes neste período. Conclua uma sessão ou planeje uma tarefa para começar.</p>}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><div><h2 className="font-serif text-xl font-semibold text-ink">Distribuição por disciplina</h2><p className="text-sm text-graphite mt-1">Veja onde seu tempo foi investido e o estado das entregas previstas.</p></div><CheckCircle2 size={20} className="text-navy" aria-hidden="true" /></div>
        {!data.subjects.length ? <EmptyState icon={ChartNoAxesCombined} title="Seu histórico começa aqui" description="Cadastre disciplinas e use o Planner e o Focus para construir uma visão do seu progresso." action={{ label: 'Planejar estudos', onClick: () => { window.location.href = '/study'; } }} /> : <div className="overflow-x-auto">
          <table className="w-full text-sm text-left"><caption className="sr-only">Estudo realizado, estudo agendado e entregas por disciplina no período selecionado</caption><thead><tr className="text-xs text-muted border-b border-border"><th scope="col" className="pb-3 pr-6 font-medium min-w-40">Disciplina</th><th scope="col" className="pb-3 pr-6 font-medium whitespace-nowrap">Realizado</th><th scope="col" className="pb-3 pr-6 font-medium whitespace-nowrap">Agendado</th><th scope="col" className="pb-3 font-medium min-w-36">Entregas concluídas</th></tr></thead><tbody>{[...data.subjects].sort((a, b) => b.studied_minutes - a.studied_minutes).map((subject) => <tr key={subject.subject_id ?? 'unassigned'} className="border-b border-border last:border-0">
            <th scope="row" className="py-4 pr-6 font-medium text-ink">{subject.subject_id === null ? subject.subject_name : <Link to={`/subjects/${subject.subject_id}`} className="hover:text-crimson hover:underline">{subject.subject_name}</Link>}</th>
            <td className="py-4 pr-6 text-ink tabular-nums whitespace-nowrap">{formatMinutes(subject.studied_minutes)}</td><td className="py-4 pr-6 text-graphite tabular-nums whitespace-nowrap">{formatMinutes(subject.planned_study_minutes)}</td>
            <td className="py-4"><p className="text-xs text-graphite mb-1.5">{subject.tasks_completed} de {subject.tasks_due}{!subject.tasks_due && ' · sem prazo no período'}</p><ProgressBar value={subject.completion_rate} size="sm" tone="navy" /></td>
          </tr>)}</tbody></table>
        </div>}
      </Card>
      <AnalyticsMethodology methodology={data.methodology} timezone={data.period.timezone} />
    </>}
  </div>;
}

function Metric({ value, label, detail }: { value: string; label: string; detail: string }) {
  return <div className="min-w-0"><p className="font-serif text-3xl sm:text-4xl text-ink font-semibold tabular-nums">{value}</p><p className="text-sm text-ink font-medium mt-1">{label}</p><p className="text-xs text-muted mt-1 leading-relaxed">{detail}</p></div>;
}
