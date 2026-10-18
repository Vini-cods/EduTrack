import { Card } from '../ui/Card';
import { analyticsDateLabel, formatMinutes } from '../../lib/analytics';
import type { AcademicAnalytics } from '../../types/analytics';

export function CompletionHistory({ data }: { data: AcademicAnalytics }) {
  const entries = data.daily.filter((day) => (day.completion_events ?? 0) > 0 || (day.reopened_events ?? 0) > 0);
  return <Card className="mt-6 min-w-0">
    <h2 className="font-serif text-xl font-semibold text-ink">Histórico de conclusões</h2>
    <p className="text-sm text-graphite mt-1">{data.summary.completion_events ?? 0} conclusões e {data.summary.reopened_events ?? 0} reaberturas registradas neste período, pela data em que aconteceram.</p>
    {!entries.length ? <p className="text-sm text-muted mt-4">As próximas mudanças de status formarão seu histórico. Conclusões antigas sem data conhecida continuam no progresso das disciplinas.</p> : <div className="overflow-x-auto mt-4"><table className="w-full text-left text-sm">
      <caption className="sr-only">Conclusões e reaberturas por dia no fuso do relatório</caption>
      <thead><tr className="border-b border-border"><th scope="col" className="py-2 pr-4">Data</th><th scope="col" className="py-2 pr-4">Conclusões</th><th scope="col" className="py-2">Reaberturas</th></tr></thead>
      <tbody>{entries.map((day) => <tr key={day.date} className="border-b border-border last:border-0"><th scope="row" className="py-2 pr-4 font-normal">{analyticsDateLabel(day.date, true)}</th><td className="py-2 pr-4 tabular-nums">{day.completion_events ?? 0}</td><td className="py-2 tabular-nums">{day.reopened_events ?? 0}</td></tr>)}</tbody>
    </table></div>}
    <p className="text-xs text-muted mt-4">Reabrir e concluir novamente conta outra conclusão. Excluir uma tarefa remove também seus eventos de status.</p>
    {(data.summary.legacy_studied_minutes ?? 0) > 0 && <p className="text-xs text-muted mt-3">{formatMinutes(data.summary.legacy_studied_minutes ?? 0)} de estudo legado sem intervalos conhecidos permanece no dia de início. Novos intervalos ativos são distribuídos entre os dias, descontando pausas.</p>}
  </Card>;
}
