import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import apiClient from '../api/client';
import type { CalendarEventWithSubject, Subject, TaskWithSubject } from '../types';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import { DayView } from '../components/calendar/DayView';
import { EventModal } from '../components/calendar/EventModal';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { getMonthGrid, getWeekDays, CATEGORY_META, shiftCalendarPeriod, toDatetimeLocalValue } from '../lib/calendar';
import { projectCalendarItems } from '../lib/calendarProjection';
import type { EventCategory } from '../types';

type ViewMode = 'month' | 'week' | 'day';

const CATEGORIES: EventCategory[] = ['aula', 'prova', 'trabalho', 'estudo', 'evento'];

function periodLabel(view: ViewMode, date: Date): string {
  if (view === 'month') {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  if (view === 'day') {
    const s = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const days = getWeekDays(date);
  const start = days[0];
  const end = days[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString('pt-BR', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endStr = end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

export const Calendar: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('month');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventWithSubject[] | null>(null);
  const [eventsError, setEventsError] = useState(false);
  const eventsRequest = useRef<AbortController | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<TaskWithSubject[]>([]);
  const [editingTask, setEditingTask] = useState<TaskWithSubject | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithSubject | null>(null);
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const visibleEvents = useMemo(() => events?.filter((event) => categoryFilter === 'all' || event.category === categoryFilter) ?? [], [events, categoryFilter]);

  const [rangeStart, rangeEnd] = useMemo<[Date, Date]>(() => {
    if (view === 'month') {
      const grid = getMonthGrid(currentDate);
      return [grid[0], grid[grid.length - 1]];
    }
    if (view === 'week') {
      const days = getWeekDays(currentDate);
      return [days[0], days[6]];
    }
    return [currentDate, currentDate];
  }, [view, currentDate]);

  const loadEvents = useCallback(() => {
    eventsRequest.current?.abort();
    const request = new AbortController();
    eventsRequest.current = request;
    setEvents(null);
    setEventsError(false);
    const start = new Date(rangeStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(24, 0, 0, 0);
    Promise.all([
      apiClient.get<CalendarEventWithSubject[]>('/calendar-events/', { signal: request.signal,
        params: { start: toDatetimeLocalValue(start), end: toDatetimeLocalValue(end) } }),
      apiClient.get<TaskWithSubject[]>('/tasks/', { signal: request.signal }),
    ])
      .then(([eventResponse, taskResponse]) => {
        if (request.signal.aborted) return;
        setTasks(taskResponse.data);
        setEvents(projectCalendarItems(eventResponse.data, taskResponse.data, start, rangeEnd));
      })
      .catch(() => { if (!request.signal.aborted) setEventsError(true); });
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    loadEvents();
    return () => eventsRequest.current?.abort();
  }, [loadEvents]);

  useEffect(() => {
    apiClient.get('/subjects/').then((res) => setSubjects(res.data)).catch(console.error);
  }, []);

  // "Novo evento" vindo do Command Palette (?new=1), ou navegação direta
  // para uma data específica vinda de outra página (?date=YYYY-MM-DD, ex.:
  // link "Ver no calendário" do Study Planner).
  useEffect(() => {
    const viewParam = searchParams.get('view');
    const categoryParam = searchParams.get('category');
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
        setView('day');
      }
    }
    if (searchParams.get('new') === '1') {
      const parsed = dateParam ? new Date(dateParam + 'T00:00:00') : null;
      setEditingEvent(null);
      setInitialDate(parsed && !isNaN(parsed.getTime()) ? parsed : null);
      setModalOpen(true);
    }
    if (viewParam === 'month' || viewParam === 'week' || viewParam === 'day') setView(viewParam);
    if (categoryParam === 'all' || CATEGORIES.includes(categoryParam as EventCategory)) setCategoryFilter(categoryParam as EventCategory | 'all');
    if (dateParam || searchParams.get('new') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('date');
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openCreateModal = (date: Date | null) => {
    setEditingEvent(null);
    setInitialDate(date);
    setModalOpen(true);
  };

  const openEditModal = (event: CalendarEventWithSubject) => {
    if (event.source === 'task') {
      setEditingTask(tasks.find((task) => task.id === event.task_id) ?? null);
      return;
    }
    setEditingEvent(event);
    setInitialDate(null);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSaved = () => {
    setModalOpen(false);
    loadEvents();
  };

  const navigate = (direction: 1 | -1) => {
    setCurrentDate((date) => shiftCalendarPeriod(date, view, direction));
  };

  const goToday = () => setCurrentDate(new Date());

  const showDay = (day: Date) => {
    setCurrentDate(day);
    changeView('day');
  };

  const changeView = (value: ViewMode) => {
    setView(value);
    setSearchParams((current) => { const next = new URLSearchParams(current); next.set('view', value); return next; }, { replace: true });
  };
  const changeCategory = (value: EventCategory | 'all') => {
    setCategoryFilter(value);
    setSearchParams((current) => { const next = new URLSearchParams(current); next.set('category', value); return next; }, { replace: true });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Calendário</h1>
          <p className="text-graphite mt-1 capitalize">{periodLabel(view, currentDate)}</p>
          <p className="text-xs text-muted mt-2">Aulas, sessões e eventos. Tarefas com data aparecem automaticamente como prazos.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => openCreateModal(view === 'day' ? currentDate : null)}>
          Novo evento
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-graphite hover:bg-surface-muted transition-colors cursor-pointer"
            aria-label="Período anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-graphite hover:bg-surface-muted transition-colors cursor-pointer"
            aria-label="Próximo período"
          >
            <ChevronRight size={16} />
          </button>
          <Button variant="outline" size="sm" onClick={goToday} className="ml-1">
            Hoje
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
        <label><span className="sr-only">Tipo de atividade</span><select value={categoryFilter} onChange={(event) => changeCategory(event.target.value as EventCategory | 'all')} className="min-h-11 rounded-md border border-border bg-surface text-ink text-sm px-3 py-2"><option value="all">Todas as atividades</option>{CATEGORIES.map(category => <option value={category} key={category}>{CATEGORY_META[category].label}</option>)}</select></label>
        <Tabs
          value={view}
          onChange={(v) => changeView(v as ViewMode)}
          tabs={[
            { key: 'month', label: 'Mês' },
            { key: 'week', label: 'Semana' },
            { key: 'day', label: 'Dia' },
          ]}
        />
        </div>
      </div>

      {/* Legenda de categorias */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-5">
        <span className="flex items-center gap-1.5 text-xs text-graphite">
          <span className="w-2 h-2 border border-crimson" /> Prazo de tarefa (sem horário)
        </span>
        {CATEGORIES.map((c) => (
          <span key={c} className="flex items-center gap-1.5 text-xs text-graphite">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_META[c].color }} />
            {CATEGORY_META[c].label}
          </span>
        ))}
      </div>

      {eventsError && <div role="alert" className="mt-5 p-4 border border-danger/30 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-danger">Não foi possível carregar o calendário.</p>
        <Button variant="outline" onClick={loadEvents}>Tentar novamente</Button>
      </div>}
      <div className="mt-5" aria-busy={events === null && !eventsError}>
        {events === null ? (
          eventsError ? null : <Skeleton className="h-[500px] w-full rounded-xl" />
        ) : view === 'month' ? (
          <MonthView
            monthDate={currentDate}
            events={visibleEvents}
            onDayClick={(day) => openCreateModal(day)}
            onEventClick={openEditModal}
            onShowMore={showDay}
          />
        ) : view === 'week' ? (
          <WeekView currentDate={currentDate} events={visibleEvents} onSlotClick={openCreateModal} onEventClick={openEditModal} />
        ) : (
          <DayView currentDate={currentDate} events={visibleEvents} onSlotClick={openCreateModal} onEventClick={openEditModal} />
        )}
      </div>

      <EventModal
        open={modalOpen}
        onClose={closeModal}
        onSaved={handleSaved}
        onDeleted={handleSaved}
        onEditTask={(taskId) => {
          setModalOpen(false);
          setEditingTask(tasks.find((task) => task.id === taskId) ?? null);
        }}
        subjects={subjects}
        initialDate={initialDate}
        event={editingEvent}
      />
      <TaskFormModal
        task={editingTask}
        subjects={subjects}
        onClose={() => setEditingTask(null)}
        onSaved={() => { setEditingTask(null); loadEvents(); }}
      />
    </div>
  );
};
