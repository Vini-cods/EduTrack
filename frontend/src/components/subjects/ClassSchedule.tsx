import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, Repeat } from 'lucide-react';
import apiClient from '../../api/client';
import type { CalendarEventWithSubject, Subject } from '../../types';
import { CLASS_WEEKDAYS, localDateKey, scheduleWeek } from '../../lib/classSchedule';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EventModal } from '../calendar/EventModal';
import { ClassScheduleFormModal } from './ClassScheduleFormModal';

interface Props { subjects: Subject[]; subjectId?: number }
const timeLabel = (value: string) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** As aulas são CalendarEvents; esta tela é apenas uma visão semanal e uma entrada de grade. */
export const ClassSchedule: React.FC<Props> = ({ subjects, subjectId }) => {
  const [weekDate, setWeekDate] = useState(() => new Date());
  const [revision, setRevision] = useState(0);
  const [events, setEvents] = useState<CalendarEventWithSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarEventWithSubject | null>(null);
  const days = scheduleWeek(weekDate);
  const startKey = localDateKey(days[0]);
  const end = new Date(days[6]); end.setDate(end.getDate() + 1);
  const endKey = localDateKey(end);
  const todayKey = localDateKey(new Date());
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    apiClient.get<CalendarEventWithSubject[]>('/calendar-events/', { signal: controller.signal, params: {
      category: 'aula', subject_id: subjectId, start: `${startKey}T00:00:00`, end: `${endKey}T00:00:00`,
    } }).then(response => { if (!controller.signal.aborted) setEvents(response.data.filter(event => event.category === 'aula' && (!subjectId || event.subject_id === subjectId))); })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível carregar as aulas desta semana.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [startKey, endKey, subjectId, revision]);
  const refresh = () => { setSelected(null); setFormOpen(false); setRevision(value => value + 1); };
  const moveWeek = (direction: number) => { const next = new Date(weekDate); next.setDate(next.getDate() + direction * 7); setWeekDate(next); };
  return <Card padding="none" className="mt-8">
    <div className="p-4 sm:p-5 border-b border-border">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div><h2 className="font-serif text-xl font-semibold text-ink flex items-center gap-2"><CalendarDays size={20} className="text-crimson" />Cronograma de aulas</h2><p className="text-sm text-graphite mt-1">Seus horários por dia da semana, sincronizados com o calendário.</p></div>
        <Button size="sm" className="min-h-11" icon={<Plus size={16} />} disabled={!subjects.length} onClick={() => setFormOpen(true)}>Adicionar horários</Button>
      </div>
      <div className="mt-4 flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-1"><button type="button" aria-label="Semana anterior" onClick={() => moveWeek(-1)} className="min-h-11 min-w-11 rounded-md text-graphite hover:bg-surface-muted cursor-pointer"><ChevronLeft size={18} className="mx-auto" /></button><p className="text-sm font-medium text-ink">{days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – {days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p><button type="button" aria-label="Próxima semana" onClick={() => moveWeek(1)} className="min-h-11 min-w-11 rounded-md text-graphite hover:bg-surface-muted cursor-pointer"><ChevronRight size={18} className="mx-auto" /></button><Button variant="ghost" size="sm" className="min-h-11" onClick={() => setWeekDate(new Date())}>Hoje</Button></div>
        <Link to="/calendar?view=week&category=aula" className="min-h-11 inline-flex items-center text-sm font-medium text-crimson hover:underline">Abrir no calendário</Link>
      </div>
    </div>
    {loading ? <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Carregando cronograma">{[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-36" />)}</div> : error ? <div className="p-5"><p role="alert" className="text-sm text-danger mb-3">{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Tentar novamente</Button></div> : <>
      {!events.length && <p className="px-5 pt-4 text-sm text-graphite">Nenhuma aula nesta semana. Adicione seus dias e horários ou navegue para outra semana do período letivo.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5">{days.map((day, index) => {
        const key = localDateKey(day);
        const dayEvents = events.filter(event => localDateKey(new Date(event.start_datetime)) === key).sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
        return <section key={key} aria-label={`Aulas de ${CLASS_WEEKDAYS[index]}`} className={`border rounded-md overflow-hidden ${key === todayKey ? 'border-crimson' : 'border-border'}`}>
          <h3 className={`px-3 py-2 text-sm font-semibold flex justify-between ${key === todayKey ? 'bg-crimson-soft text-ink' : 'bg-surface-muted text-graphite'}`}><span>{CLASS_WEEKDAYS[index]}</span><span className="font-normal">{day.getDate()}</span></h3>
          <div className="p-2 space-y-2">{dayEvents.length ? dayEvents.map(event => <button type="button" key={event.id} onClick={() => setSelected(event)} aria-label={`Editar aula ${event.subject_name || event.title}, ${timeLabel(event.start_datetime)}`} className="block w-full text-left px-2 py-3 border-l-2 border-crimson bg-surface hover:bg-surface-muted rounded-r-sm transition-colors cursor-pointer">
            <span className="block text-xs font-semibold text-crimson tabular-nums">{timeLabel(event.start_datetime)}{event.end_datetime ? ` – ${timeLabel(event.end_datetime)}` : ''}</span>
            <span className="block text-sm font-medium text-ink mt-1 break-words">{event.subject_name || event.title}</span>
            {event.location && <span className="flex items-start gap-1 text-xs text-graphite mt-1"><MapPin size={12} className="mt-0.5 shrink-0" />{event.location}</span>}
            {event.recurrence_group_id && <span className="flex items-center gap-1 mt-2 text-xs text-muted"><Repeat size={11} />Série semanal</span>}
          </button>) : <p className="text-xs text-muted px-2 py-3">Sem aulas</p>}</div>
        </section>;
      })}</div>
      <p className="px-5 pb-5 text-xs text-graphite">Selecione uma aula para editar apenas aquela ocorrência ou excluir a série inteira. Provas e estudos aparecem no calendário completo.</p>
    </>}
    <ClassScheduleFormModal open={formOpen} subjects={subjects} subjectId={subjectId} onClose={() => setFormOpen(false)} onSaved={firstDate => { setWeekDate(new Date(`${firstDate}T12:00:00`)); refresh(); }} />
    <EventModal open={!!selected} event={selected} subjects={subjects} onClose={() => setSelected(null)} onSaved={refresh} onDeleted={refresh} />
  </Card>;
};
