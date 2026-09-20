import type { CalendarEventWithSubject, EventCategory } from '../types';
import { startOfWeek } from './date';

export const CATEGORY_META: Record<EventCategory, { label: string; color: string; soft: string }> = {
  aula: { label: 'Aula', color: 'var(--color-navy)', soft: 'var(--color-navy-soft)' },
  prova: { label: 'Prova', color: 'var(--color-crimson)', soft: 'var(--color-crimson-soft)' },
  trabalho: { label: 'Trabalho', color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
  estudo: { label: 'Estudo', color: 'var(--color-success)', soft: 'var(--color-success-soft)' },
  evento: { label: 'Evento', color: 'var(--color-graphite)', soft: 'var(--color-surface-muted)' },
};

export const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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
  return events.filter((e) => isSameDay(new Date(e.start_datetime), day));
}

// --- Visões de tempo (semana/dia): posicionamento por hora ---

export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 23;
export const HOUR_HEIGHT = 48; // px por hora

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
 * Layout de eventos sobrepostos num único dia: agrupa eventos que se
 * sobrepõem no tempo em "clusters" e, dentro de cada cluster, atribui
 * colunas por um algoritmo guloso (mesma ideia usada por calendários como o
 * Google Calendar) — evita que dois eventos no mesmo horário se sobreponham
 * visualmente, sem precisar de uma biblioteca de layout.
 *
 * Eventos sem `end_datetime` recebem 1h de duração visual por padrão.
 */
export function layoutDayEvents(events: CalendarEventWithSubject[]): PositionedEvent[] {
  const items = events
    .map((event) => {
      const start = new Date(event.start_datetime);
      const end = event.end_datetime ? new Date(event.end_datetime) : new Date(start.getTime() + 60 * 60 * 1000);
      return { event, start, end };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const clusters: (typeof items)[] = [];
  let current: typeof items = [];
  let clusterEnd = -Infinity;
  for (const item of items) {
    if (current.length === 0 || item.start.getTime() < clusterEnd) {
      current.push(item);
      clusterEnd = Math.max(clusterEnd, item.end.getTime());
    } else {
      clusters.push(current);
      current = [item];
      clusterEnd = item.end.getTime();
    }
  }
  if (current.length) clusters.push(current);

  const result: PositionedEvent[] = [];
  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    for (const item of cluster) {
      let col = columnEnds.findIndex((end) => end <= item.start.getTime());
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.end.getTime());
      } else {
        columnEnds[col] = item.end.getTime();
      }
      result.push({
        event: item.event,
        top: timeToY(item.start),
        height: Math.max(timeToY(item.end) - timeToY(item.start), 22),
        column: col,
        totalColumns: 0, // preenchido abaixo, depois que sabemos o total do cluster
      });
    }
    const totalColumns = columnEnds.length;
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
