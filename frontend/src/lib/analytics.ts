import type { AnalyticsPeriod } from '../types/analytics.ts';

export const DEFAULT_DAILY_CAPACITY = 6;

export function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Calendar arithmetic preserves local dates across DST and month boundaries. */
export function analyticsRange(period: AnalyticsPeriod, anchor: Date): { start: string; end: string } {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const end = new Date(start);
  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  } else {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }
  return { start: localDateKey(start), end: localDateKey(end) };
}

export function shiftAnalyticsPeriod(anchor: Date, period: AnalyticsPeriod, direction: number): Date {
  const next = new Date(anchor);
  if (period === 'week') next.setDate(next.getDate() + direction * 7);
  else next.setMonth(next.getMonth() + direction, 1);
  return next;
}

export function formatMinutes(value: number): string {
  const minutes = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes}min`;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

export function validDailyCapacity(value: number): boolean {
  return Number.isFinite(value) && value >= 0.5 && value <= 24;
}

export function capacityStorageKey(userId: number): string {
  return `edutrack:daily-capacity:${userId}`;
}

export function readDailyCapacity(userId: number | undefined): number {
  if (userId === undefined) return DEFAULT_DAILY_CAPACITY;
  try {
    const stored = localStorage.getItem(capacityStorageKey(userId));
    const parsed = stored === null ? NaN : Number(stored);
    return validDailyCapacity(parsed) ? parsed : DEFAULT_DAILY_CAPACITY;
  } catch {
    return DEFAULT_DAILY_CAPACITY;
  }
}

export function analyticsTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
}

export function analyticsDateLabel(date: string, withWeekday = false): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    ...(withWeekday ? { weekday: 'short' as const } : {}), day: '2-digit', month: 'short',
  });
}
