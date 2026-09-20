import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import apiClient from '../api/client';
import type { CalendarEventWithSubject, Subject } from '../types';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import { DayView } from '../components/calendar/DayView';
import { EventModal } from '../components/calendar/EventModal';
import { getMonthGrid, getWeekDays, CATEGORY_META } from '../lib/calendar';
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventWithSubject[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithSubject | null>(null);
  const [initialDate, setInitialDate] = useState<Date | null>(null);

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
    const start = new Date(rangeStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(23, 59, 59, 999);
    apiClient
      .get('/calendar-events/', { params: { start: start.toISOString(), end: end.toISOString() } })
      .then((res) => setEvents(res.data))
      .catch(console.error);
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    apiClient.get('/subjects/').then((res) => setSubjects(res.data)).catch(console.error);
  }, []);

  // "Novo evento" vindo do Command Palette (?new=1), ou navegação direta
  // para uma data específica vinda de outra página (?date=YYYY-MM-DD, ex.:
  // link "Ver no calendário" do Study Planner).
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
        setView('day');
      }
    }
    if (searchParams.get('new') === '1') {
      openCreateModal(dateParam ? new Date(dateParam + 'T00:00:00') : null);
    }
    if (dateParam || searchParams.get('new') === '1') {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = (date: Date | null) => {
    setEditingEvent(null);
    setInitialDate(date);
    setModalOpen(true);
  };

  const openEditModal = (event: CalendarEventWithSubject) => {
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
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + direction);
    else if (view === 'week') d.setDate(d.getDate() + 7 * direction);
    else d.setDate(d.getDate() + direction);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const showDay = (day: Date) => {
    setCurrentDate(day);
    setView('day');
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Calendário</h1>
          <p className="text-graphite mt-1 capitalize">{periodLabel(view, currentDate)}</p>
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

        <Tabs
          value={view}
          onChange={(v) => setView(v as ViewMode)}
          tabs={[
            { key: 'month', label: 'Mês' },
            { key: 'week', label: 'Semana' },
            { key: 'day', label: 'Dia' },
          ]}
        />
      </div>

      {/* Legenda de categorias */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-5">
        {CATEGORIES.map((c) => (
          <span key={c} className="flex items-center gap-1.5 text-xs text-graphite">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_META[c].color }} />
            {CATEGORY_META[c].label}
          </span>
        ))}
      </div>

      <div className="mt-5">
        {events === null ? (
          <Skeleton className="h-[500px] w-full rounded-xl" />
        ) : view === 'month' ? (
          <MonthView
            monthDate={currentDate}
            events={events}
            onDayClick={(day) => openCreateModal(day)}
            onEventClick={openEditModal}
            onShowMore={showDay}
          />
        ) : view === 'week' ? (
          <WeekView currentDate={currentDate} events={events} onSlotClick={openCreateModal} onEventClick={openEditModal} />
        ) : (
          <DayView currentDate={currentDate} events={events} onSlotClick={openCreateModal} onEventClick={openEditModal} />
        )}
      </div>

      <EventModal
        open={modalOpen}
        onClose={closeModal}
        onSaved={handleSaved}
        onDeleted={handleSaved}
        subjects={subjects}
        initialDate={initialDate}
        event={editingEvent}
      />
    </div>
  );
};
