import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import type { CalendarEventWithSubject } from '../../types';
import { CATEGORY_META } from '../../lib/calendar';
import { Card } from '../ui/Card';

function eventTime(value: string): string {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function TodayAgenda({ events, today }: { events: CalendarEventWithSubject[]; today: string }) {
  return <Card>
    <div className="flex flex-wrap justify-between items-center gap-3 mb-1"><h2 className="font-serif text-xl font-semibold text-ink">Agenda de hoje</h2><Link to={`/calendar?date=${today}`} className="text-sm text-graphite hover:text-crimson inline-flex items-center gap-1">Calendário <ArrowRight size={14} /></Link></div>
    <p className="text-sm text-graphite mb-5">Aulas, provas e blocos com horário reservado.</p>
    {events.length ? <ol className="divide-y divide-border">{events.map((event) => {
      const category = CATEGORY_META[event.category];
      const beginsBeforeToday = event.start_datetime.slice(0, 10) < today;
      return <li key={event.id} className="py-4 first:pt-0 last:pb-0 flex gap-4"><div className="w-14 shrink-0"><p className="text-sm font-medium text-ink tabular-nums">{beginsBeforeToday ? 'Em curso' : eventTime(event.start_datetime)}</p>{event.end_datetime && <p className="text-xs text-muted tabular-nums mt-1">até {eventTime(event.end_datetime)}</p>}</div><div className="min-w-0 flex-1 border-l-2 pl-4" style={{ borderColor: category.color }}><Link to={`/calendar?date=${today}`} className="text-sm font-medium text-ink hover:text-crimson break-words">{event.title}</Link><p className="text-xs text-muted mt-1">{category.label}{event.subject_name ? ` · ${event.subject_name}` : ''}</p>{event.location && <p className="text-xs text-graphite mt-1 break-words">{event.location}</p>}{event.category === 'estudo' && <Link to={`/study/focus${event.task_id ? `?task_id=${event.task_id}` : event.subject_id ? `?subject_id=${event.subject_id}` : ''}`} className="inline-flex text-xs text-crimson font-medium mt-2 hover:underline">Iniciar Focus <ArrowRight size={12} className="ml-1" /></Link>}</div></li>;
    })}</ol> : <div className="py-5"><CalendarDays size={22} className="text-muted mb-3" aria-hidden="true" /><p className="text-sm text-graphite">Nenhum compromisso com horário hoje.</p><Link to={`/calendar?new=1&date=${today}`} className="inline-flex mt-3 text-sm text-crimson font-medium hover:underline">Reservar um horário</Link></div>}
  </Card>;
}
