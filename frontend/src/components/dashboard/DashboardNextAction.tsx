import { ArrowRight, CalendarClock, Compass, Focus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardRecommendation, TaskRecommendationReason } from '../../lib/dashboardRecommendation';
import { formatMinutes } from '../../lib/analytics';
import { formatShortDate } from '../../lib/date';
import { CATEGORY_META } from '../../lib/calendar';
import { Card } from '../ui/Card';

const reasons: Record<TaskRecommendationReason, string> = {
  overdue: 'O prazo já passou. Revise a entrega e reserve tempo para resolver a pendência.',
  today: 'Esta tarefa vence hoje e vem antes dos próximos prazos.',
  priority: 'Você marcou esta tarefa com prioridade alta ou urgente.',
  upcoming: 'Esta tarefa tem prazo definido e vem a seguir na ordenação de prioridades.',
  undated: 'Sem prazo definido: esclareça quando precisa concluir e planeje o trabalho.',
};
const clock = (value: string) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const primaryClass = 'inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-md bg-crimson text-white text-sm font-medium hover:bg-crimson-dark';

export function DashboardNextAction({ recommendation }: { recommendation: DashboardRecommendation }) {
  const task = recommendation.kind === 'task' ? recommendation.task : null;
  const event = recommendation.kind === 'event' ? recommendation.event : null;
  const focusHref = task ? `/study/focus?task_id=${task.id}` : event?.task_id ? `/study/focus?task_id=${event.task_id}` : event?.subject_id ? `/study/focus?subject_id=${event.subject_id}` : '/study/focus';
  const label = recommendation.kind === 'event' ? recommendation.phase === 'ongoing' ? 'Em andamento agora' : 'Seu próximo compromisso' : task ? 'Seu próximo passo' : 'Prepare o próximo passo';

  return <Card variant="accent" className="min-w-0 h-full" aria-labelledby="next-action-title">
    <p className="text-xs font-semibold uppercase tracking-wider text-crimson flex items-center gap-2"><Compass size={15} aria-hidden="true" />{label}</p>
    <h2 id="next-action-title" className="font-serif text-2xl font-semibold text-ink mt-3 break-words">{task?.title ?? event?.title ?? 'Dê um destino ao seu tempo'}</h2>
    <p className="text-sm text-graphite mt-2 leading-relaxed">{recommendation.kind === 'task' ? reasons[recommendation.reason] : recommendation.kind === 'event'
      ? `${CATEGORY_META[recommendation.event.category].label} · ${clock(recommendation.event.start_datetime)}${recommendation.event.end_datetime ? ` até ${clock(recommendation.event.end_datetime)}` : ''}${recommendation.phase === 'next' && recommendation.minutesUntil <= 30 ? ` · começa em ${recommendation.minutesUntil}min` : ''}`
      : 'Nenhuma tarefa aberta ou compromisso restante hoje. Planeje um bloco de estudo ou adicione o próximo objetivo.'}</p>
    {(task || event?.subject_name || event?.location) && <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-graphite mt-4">
      <span className="break-words">{task?.subject_name ?? event?.subject_name}</span>
      {task && <span>{task.due_date ? `Prazo ${formatShortDate(task.due_date)}` : 'Sem prazo'}</span>}
      {task?.estimated_hours != null && <span>{formatMinutes(task.estimated_hours * 60)} de estimativa total</span>}
      {event?.location && <span className="break-words">{event.location}</span>}
    </div>}
    {recommendation.kind === 'task' && recommendation.nextEvent && <p className="mt-4 text-xs text-muted break-words">Próximo compromisso às {clock(recommendation.nextEvent.start_datetime)}: {recommendation.nextEvent.title}.</p>}
    <div className="flex flex-wrap items-center gap-3 mt-5">
      {task || event?.category === 'estudo' ? <Link to={focusHref} className={primaryClass}><Focus size={16} aria-hidden="true" />Preparar Focus</Link>
        : event ? <Link to={`/calendar?date=${event.start_datetime.slice(0, 10)}`} className={primaryClass}><CalendarClock size={16} aria-hidden="true" />Abrir compromisso</Link>
        : <Link to="/study?new=1" className={primaryClass}>Planejar estudos<ArrowRight size={16} aria-hidden="true" /></Link>}
      {task && <Link to={`/tasks?highlight=${task.id}`} className="inline-flex items-center gap-1 min-h-11 text-sm font-medium text-crimson hover:underline">Revisar tarefa<ArrowRight size={14} aria-hidden="true" /></Link>}
    </div>
    <details className="mt-5 text-xs text-muted"><summary className="cursor-pointer min-h-8">Como a sugestão é escolhida</summary><p className="mt-2 leading-relaxed">Compromissos em andamento ou nos próximos 30 minutos vêm primeiro. Depois, tarefas atrasadas e de hoje, prioridade e próximos prazos. A sugestão não inicia sessões nem conclui tarefas automaticamente.</p></details>
  </Card>;
}
