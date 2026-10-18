import { ArrowRight, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { analyticsDateLabel, formatMinutes } from '../../lib/analytics';
import { analyticsActionLinks } from '../../lib/advancedAnalytics';
import type { AnalyticsInsight, AnalyticsPlanningDiagnostics } from '../../types/analytics';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

export function PlanningDiagnostics({ diagnostics, insights, compact = false }: { diagnostics?: AnalyticsPlanningDiagnostics; insights: AnalyticsInsight[]; compact?: boolean }) {
  const displayedInsights = compact ? insights.slice(0, 2) : insights;
  return <Card className="min-w-0">
    <h2 className={compact ? 'text-base font-semibold text-ink' : 'font-serif text-xl font-semibold text-ink'}>Do diagnóstico à ação</h2>
    <p className="text-sm text-graphite mt-1">Ajustes concretos a partir do seu planejamento.</p>
    {!diagnostics ? <p className="text-sm text-muted mt-4">Métricas avançadas indisponíveis nesta versão da API. As observações existentes continuam abaixo.</p> : <>
      <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5' : 'grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5'}>
        <div>
          <p className="text-xs text-muted">Esforço restante com bloco</p>
          <p className="text-2xl font-semibold text-ink tabular-nums mt-1">{diagnostics.planning_coverage_percent === null ? '—' : `${Math.round(diagnostics.planning_coverage_percent)}%`}</p>
          <div aria-hidden="true"><ProgressBar value={diagnostics.planning_coverage_percent ?? 0} size="sm" tone="navy" /></div>
          <p className="text-xs text-graphite mt-2 leading-relaxed">{diagnostics.remaining_task_minutes > 0 ? `${formatMinutes(diagnostics.covered_task_minutes)} de ${formatMinutes(diagnostics.remaining_task_minutes)} com blocos futuros vinculados às tarefas.` : 'Sem esforço restante estimado para distribuir neste período.'}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Dias acima da capacidade</p>
          <p className={`text-2xl font-semibold tabular-nums mt-1 ${diagnostics.overloaded_days > 0 ? 'text-danger' : 'text-ink'}`}>{diagnostics.overloaded_days}</p>
          <p className="text-xs text-graphite mt-2 leading-relaxed">{diagnostics.overloaded_days > 0 ? `${formatMinutes(diagnostics.excess_load_minutes)} excedentes no período.` : 'Nenhum dia excede sua capacidade configurada.'}</p>
          {!compact && diagnostics.peak_date && <p className="text-xs text-muted mt-2">Pico: {analyticsDateLabel(diagnostics.peak_date)} · {Math.round(diagnostics.peak_load_percent)}% de ocupação.</p>}
        </div>
        {!compact && <div>
          <p className="text-xs text-muted">Lacunas no cadastro</p>
          <p className="text-2xl font-semibold text-ink tabular-nums mt-1">{diagnostics.tasks_without_estimates}<span className="text-sm font-normal text-graphite"> sem estimativa</span></p>
          <p className="text-xs text-graphite mt-2 leading-relaxed">{diagnostics.undated_tasks} sem prazo. Contagem de todas as tarefas abertas, inclusive fora do período.</p>
          <Link to="/tasks" className="inline-flex items-center gap-1 text-xs font-medium text-crimson hover:underline mt-2">Completar tarefas <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>}
      </div>
      {!compact && <p className="text-xs text-muted leading-relaxed mt-4">{diagnostics.estimated_tasks} tarefas estimadas com esforço atribuído ao período, incluindo atrasos quando aplicável. Cobertura considera o esforço ainda não executado e blocos futuros vinculados, mesmo quando agendados fora deste intervalo.</p>}
    </>}
    {displayedInsights.length ? <ul className="divide-y divide-border mt-5 border-t border-border">{displayedInsights.map((insight) => {
      const action = insight.action ? analyticsActionLinks[insight.action] : undefined;
      return <li key={insight.id} className="py-4 last:pb-0"><div className="flex gap-2 items-start">
        <Lightbulb size={16} className={`shrink-0 mt-0.5 ${insight.tone === 'warning' ? 'text-warning' : insight.tone === 'success' ? 'text-success' : 'text-navy'}`} aria-hidden="true" />
        <div><h3 className="text-sm font-medium text-ink">{insight.title}</h3><p className="text-sm text-graphite leading-relaxed mt-1">{insight.description}</p>{action && <Link to={action.to} className="inline-flex items-center gap-1 text-sm font-medium text-crimson hover:underline mt-2">{action.label}<ArrowRight size={14} aria-hidden="true" /></Link>}</div>
      </div></li>;
    })}</ul> : <p className="text-sm text-muted mt-5">Ainda não há registros suficientes para sugerir ajustes. Planeje uma tarefa ou conclua uma sessão para começar.</p>}
  </Card>;
}
