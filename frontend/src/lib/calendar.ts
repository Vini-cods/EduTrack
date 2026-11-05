import type { CalendarEventWithSubject, EventCategory } from '../types';
import { startOfWeek } from './date.ts';

export const CATEGORY_META: Record<EventCategory, { label: string; color: string; soft: string }> = {
  aula: { label: 'Aula', color: 'var(--color-navy)', soft: 'var(--color-navy-soft)' },
  prova: { label: 'Prova', color: 'var(--color-crimson)', soft: 'var(--color-crimson-soft)' },
  trabalho: { label: 'Trabalho', color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
  estudo: { label: 'Estudo', color: 'var(--color-success)', soft: 'var(--color-success-soft)' },
  evento: { label: 'Evento', color: 'var(--color-graphite)', soft: 'var(--color-surface-muted)' },
};

export const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** Avança o período local sem deixar dias 29–31 saltarem o mês de destino. */
export function shiftCalendarPeriod(anchor: Date, view: 'month' | 'week' | 'day', direction: 1 | -1): Date {
  const next = new Date(anchor);
  if (view === 'month') {
    const targetMonth = next.getMonth() + direction;
    const lastDay = new Date(next);
    lastDay.setMonth(targetMonth + 1, 0);
    next.setMonth(targetMonth, Math.min(anchor.getDate(), lastDay.getDate()));
  } else {
    next.setDate(next.getDate() + direction * (view === 'week' ? 7 : 1));
  }
  return next;
}

/** Grade completa do mês (42 dias = 6 semanas), incluindo dias de meses vizinhos para preencher a grade. */
export function getMonthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = segunda
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Os 7 dias (segunda a domingo) da semana que contém `date`. */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function eventsOnDay(events: CalendarEventWithSubject[], day: Date): CalendarEventWithSubject[] {
  const startOfDay = new Date(day);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  return events.filter((event) => {
    const start = new Date(event.start_datetime);
    if (event.all_day || !event.end_datetime) return isSameDay(start, day);
    // Intervalos [início, fim): terminar à meia-noite não ocupa o dia seguinte.
    return start < endOfDay && new Date(event.end_datetime) > startOfDay;
  });
}

// --- Visões de tempo (semana/dia): posicionamento por hora ---

export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 23;
export const HOUR_HEIGHT = 48; // px por hora

/** Eventos reais fora da grade recebem uma lista com horário, não uma hora inventada. */
export function isOutsideTimeGrid(event: CalendarEventWithSubject, day: Date): boolean {
  const gridStart = new Date(day);
  gridStart.setHours(GRID_START_HOUR, 0, 0, 0);
  return event.end_datetime
    ? new Date(event.end_datetime) <= gridStart
    : new Date(event.start_datetime) < gridStart;
}

/** Posição vertical (em px) correspondente a um horário, relativa ao topo da grade. */
export function timeToY(d: Date): number {
  const hours = d.getHours() + d.getMinutes() / 60;
  return (hours - GRID_START_HOUR) * HOUR_HEIGHT;
}

export interface PositionedEvent {
  event: CalendarEventWithSubject;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
}

/**
 * Layout de eventos num único dia: agrupa os retângulos que compartilham
 * espaço visual, incluindo a altura mínima dos blocos curtos. Dentro de
 * cada grupo, atribui colunas por um algoritmo guloso para que os botões
 * não se cubram. A altura visual não altera os horários reais do evento.
 *
 * Eventos sem `end_datetime` recebem 1h de duração visual por padrão.
 */
export function layoutDayEvents(events: CalendarEventWithSubject[], day?: Date): PositionedEvent[] {
  const gridStart = day ? new Date(day) : null;
  gridStart?.setHours(GRID_START_HOUR, 0, 0, 0);
  const gridEnd = day ? new Date(day) : null;
  gridEnd?.setHours(24, 0, 0, 0);
  const items = events
    .filter((event) => !event.all_day && (!day || !isOutsideTimeGrid(event, day)))
    .map((event) => {
      const start = new Date(event.start_datetime);
      const end = event.end_datetime ? new Date(event.end_datetime) : new Date(start.getTime() + 60 * 60 * 1000);
      return { event,
        start: gridStart && start < gridStart ? gridStart : start,
        end: gridEnd && end > gridEnd ? gridEnd : end };
    })
    .filter((item) => item.end > item.start)
    .map((item) => {
      const top = timeToY(item.start);
      const height = Math.max((item.end.getTime() - item.start.getTime()) / 3_600_000 * HOUR_HEIGHT, 22);
      return { ...item, top, height, bottom: top + height };
    })
    .sort((a, b) => a.top - b.top || a.start.getTime() - b.start.getTime());

  const clusters: (typeof items)[] = [];
  let current: typeof items = [];
  let clusterBottom = -Infinity;
  for (const item of items) {
    if (current.length === 0 || item.top < clusterBottom) {
      current.push(item);
      clusterBottom = Math.max(clusterBottom, item.bottom);
    } else {
      clusters.push(current);
      current = [item];
      clusterBottom = item.bottom;
    }
  }
  if (current.length) clusters.push(current);

  const result: PositionedEvent[] = [];
  for (const cluster of clusters) {
    const columnBottoms: number[] = [];
    for (const item of cluster) {
      let col = columnBottoms.findIndex((bottom) => bottom <= item.top);
      if (col === -1) {
        col = columnBottoms.length;
        columnBottoms.push(item.bottom);
      } else {
        columnBottoms[col] = item.bottom;
      }
      result.push({
        event: item.event,
        top: item.top,
        height: item.height,
        column: col,
        totalColumns: 0, // preenchido abaixo, depois que sabemos o total do cluster
      });
    }
    const totalColumns = columnBottoms.length;
    for (let i = result.length - cluster.length; i < result.length; i++) {
      result[i].totalColumns = totalColumns;
    }
  }
  return result;
}

/** Converte um Date local em string "YYYY-MM-DDTHH:mm" para inputs datetime-local. */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
