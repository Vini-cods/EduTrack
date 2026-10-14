import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { CalendarEventWithSubject } from '../../types';
import { Card } from '../ui/Card';
import { analyticsDateLabel } from '../../lib/analytics';

export function UpcomingDeadlines({ events }: { events: CalendarEventWithSubject[] }) {
  return <Card><div className="flex flex-wrap justify-between items-center gap-3 mb-1"><h2 className="font-serif text-xl font-semibold text-ink">No horizonte</h2><Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-graphite hover:text-crimson">Ver calendário <ArrowRight size={14} /></Link></div><p className="text-sm text-graphite mb-5">Entregas e provas a partir de amanhã, nos próximos 14 dias.</p>
    {events.length ? <ol className="divide-y divide-border">{events.slice(0, 6).map((event) => <li key={event.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-4"><p className="w-16 shrink-0 text-xs text-muted pt-0.5">{analyticsDateLabel(event.start_datetime.slice(0, 10))}</p><div className="min-w-0"><Link to={event.source === 'task' ? `/tasks?highlight=${event.task_id}` : `/calendar?date=${event.start_datetime.slice(0, 10)}`} className="text-sm text-ink font-medium break-words hover:text-crimson">{event.title}</Link><p className="text-xs text-muted mt-1">{event.category === 'prova' ? 'Prova' : 'Entrega'}{event.subject_name ? ` · ${event.subject_name}` : ''}</p></div></li>)}</ol> : <p className="text-sm text-muted py-3">Nenhuma entrega ou prova nos próximos 14 dias.</p>}
    {events.length > 6 && <Link to="/calendar" className="block text-xs text-crimson mt-4 hover:underline">Ver mais {events.length - 6} prazos no calendário</Link>}
  </Card>;
}
