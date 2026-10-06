import React from 'react';
import { getMonthGrid, eventsOnDay, isSameDay, CATEGORY_META, WEEKDAY_SHORT } from '../../lib/calendar';
import type { CalendarEventWithSubject } from '../../types';

interface MonthViewProps {
  monthDate: Date;
  events: CalendarEventWithSubject[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEventWithSubject) => void;
  onShowMore: (day: Date) => void;
}

const MAX_VISIBLE = 3;

export const MonthView: React.FC<MonthViewProps> = ({ monthDate, events, onDayClick, onEventClick, onShowMore }) => {
  const grid = getMonthGrid(monthDate);
  const today = new Date();
  const currentMonth = monthDate.getMonth();

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted">
        {WEEKDAY_SHORT.map((label) => (
          <div key={label} className="py-2.5 text-center text-xs font-medium text-graphite">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.map((day, i) => {
          const dayEvents = eventsOnDay(events, day).sort(
            (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          );
          const isCurrentMonth = day.getMonth() === currentMonth;
          const isToday = isSameDay(day, today);
          const visible = dayEvents.slice(0, MAX_VISIBLE);
          const overflow = dayEvents.length - visible.length;

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`min-h-[104px] p-1.5 text-left border-b border-r border-border last:border-r-0 [&:nth-child(7n)]:border-r-0 flex flex-col gap-1 transition-colors hover:bg-surface-muted/60 cursor-pointer ${
                isCurrentMonth ? '' : 'bg-surface-muted/30'
              }`}
            >
              <span
                className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium shrink-0 ${
                  isToday
                    ? 'bg-crimson text-white'
                    : isCurrentMonth
                    ? 'text-ink'
                    : 'text-muted'
                }`}
              >
                {day.getDate()}
              </span>

              <div className="space-y-1 min-w-0">
                {visible.map((event) => {
                  const meta = CATEGORY_META[event.category];
                  return (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className="flex items-center gap-1.5 text-[11px] px-1.5 py-0.5 rounded-md truncate hover:brightness-95"
                      style={{ backgroundColor: meta.soft }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                      <span className="truncate text-ink">{event.title}</span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowMore(day);
                    }}
                    className="text-[11px] text-muted hover:text-graphite pl-1.5 cursor-pointer"
                  >
                    +{overflow} mais
                  </button>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
