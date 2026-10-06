import React from 'react';
import {
  eventsOnDay,
  isSameDay,
  layoutDayEvents,
  timeToY,
  CATEGORY_META,
  WEEKDAY_SHORT,
  GRID_START_HOUR,
  GRID_END_HOUR,
  HOUR_HEIGHT,
} from '../../lib/calendar';
import type { CalendarEventWithSubject } from '../../types';

interface TimeGridProps {
  days: Date[];
  events: CalendarEventWithSubject[];
  onSlotClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithSubject) => void;
}

const HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i);
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;

function formatTimeRange(event: CalendarEventWithSubject): string {
  const start = new Date(event.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (!event.end_datetime) return start;
  const end = new Date(event.end_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${start} – ${end}`;
}

/**
 * Compartilhado por WeekView (7 colunas) e DayView (1 coluna). O layout de
 * sobreposição é calculado por dia (`layoutDayEvents` por coluna), nunca
 * para a semana inteira de uma vez — assim, ocorrências de séries
 * recorrentes em dias diferentes nunca disputam a mesma coluna.
 */
export const TimeGrid: React.FC<TimeGridProps> = ({ days, events, onSlotClick, onEventClick }) => {
  const today = new Date();
  const now = new Date();
  const nowY = timeToY(now);
  const showNowLine = now.getHours() >= GRID_START_HOUR && now.getHours() < GRID_END_HOUR;

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      {/* Cabeçalho com os dias — fica fixo enquanto as horas rolam abaixo */}
      <div className="flex border-b border-border">
        <div className="w-14 shrink-0" />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="flex-1 min-w-0 text-center py-2.5 border-l border-border first:border-l-0">
              <p className="text-xs text-muted">{WEEKDAY_SHORT[(day.getDay() + 6) % 7]}</p>
              <p
                className={`text-sm font-semibold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${
                  isToday ? 'bg-crimson text-white' : 'text-ink'
                }`}
              >
                {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Grade de horas, rolável */}
      <div className="flex relative overflow-y-auto" style={{ maxHeight: 600 }}>
        <div className="w-14 shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 text-right pr-2 text-[11px] text-muted -translate-y-1/2"
              style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT }}
            >
              {h}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const positioned = layoutDayEvents(eventsOnDay(events, day));
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className="flex-1 min-w-0 relative border-l border-border first:border-l-0"
              style={{ height: TOTAL_HEIGHT }}
            >
              {HOURS.map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(h, 0, 0, 0);
                    onSlotClick(d);
                  }}
                  className="absolute left-0 right-0 border-t border-border/70 hover:bg-surface-muted/40 transition-colors cursor-pointer"
                  style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  aria-label={`Criar evento às ${h}:00`}
                />
              ))}

              {isToday && showNowLine && (
                <div className="absolute left-0 right-0 h-px bg-crimson z-10 pointer-events-none" style={{ top: nowY }}>
                  <span className="absolute -left-[3px] -top-[3px] w-[7px] h-[7px] rounded-full bg-crimson" />
                </div>
              )}

              {positioned.map(({ event, top, height, column, totalColumns }) => {
                const meta = CATEGORY_META[event.category];
                const widthPct = 100 / totalColumns;
                return (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="absolute rounded-md px-1.5 py-1 text-left overflow-hidden border-l-2 hover:brightness-95 transition-[filter] cursor-pointer z-[1]"
                    style={{
                      top,
                      height,
                      left: `${column * widthPct}%`,
                      width: `calc(${widthPct}% - 2px)`,
                      backgroundColor: meta.soft,
                      borderLeftColor: meta.color,
                    }}
                  >
                    <p className="text-[11px] font-medium text-ink truncate leading-tight">{event.title}</p>
                    {height > 32 && <p className="text-[10px] text-graphite truncate">{formatTimeRange(event)}</p>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
