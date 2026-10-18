import { Link } from 'react-router-dom';
import { analyticsDateLabel, formatMinutes } from '../../lib/analytics';
import { analyticsWeekdays, consistencyCalendar, reportDateKey, studyIntensity } from '../../lib/advancedAnalytics';
import type { AnalyticsDay, AnalyticsSessionPatterns } from '../../types/analytics';
import { Card } from '../ui/Card';

const intensityClasses = [
  'bg-surface-muted text-muted',
  'bg-crimson/10 text-ink',
  'bg-crimson/20 text-ink',
  'bg-crimson/35 text-ink',
  'bg-crimson text-white',
];

export function StudyConsistency({ days, asOf, timezone, patterns }: { days: AnalyticsDay[]; asOf: string; timezone: string; patterns?: AnalyticsSessionPatterns }) {
  const today = reportDateKey(asOf, timezone);
  const maximum = Math.max(0, ...days.map((day) => day.studied_minutes));
  const cells = consistencyCalendar(days);
  return <Card className="min-w-0">
    <h2 className="font-serif text-xl font-semibold text-ink">Consistência, um dia de cada vez</h2>
    <p className="text-sm text-graphite mt-1">Tempo registrado no Focus. Abra um dia para rever sua agenda.</p>
    {patterns && <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-xs text-graphite"><p><strong className="text-lg text-ink tabular-nums">{patterns.longest_streak_days}</strong> {patterns.longest_streak_days === 1 ? 'dia' : 'dias'} na maior sequência</p><p><strong className="text-lg text-ink tabular-nums">{patterns.current_streak_days}</strong> na sequência ao fim do intervalo</p></div>}
    {!cells.length ? <p className="text-sm text-muted py-8">Não há dias disponíveis neste intervalo.</p> : <>
      <div className="grid grid-cols-7 gap-1.5 mt-5" aria-hidden="true">{analyticsWeekdays.map((weekday) => <span key={weekday} className="text-center text-[11px] text-muted pb-1">{weekday}</span>)}</div>
      <div className="grid grid-cols-7 gap-1.5" aria-label="Calendário de estudo no período">{cells.map((day, index) => {
        if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;
        const future = day.date > today;
        const label = `${analyticsDateLabel(day.date, true)}: ${future ? 'dia futuro' : `${formatMinutes(day.studied_minutes)} estudados`}`;
        return <Link key={day.date} to={`/calendar?date=${day.date}`} title={label} aria-label={label}
          className={`min-h-14 min-w-0 rounded border flex flex-col items-center justify-center gap-0.5 transition-colors hover:border-crimson focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-1 ${future ? 'border-dashed border-border text-muted bg-surface' : `border-transparent ${intensityClasses[studyIntensity(day.studied_minutes, maximum)]}`}`}>
          <span className="text-sm font-medium tabular-nums">{Number(day.date.slice(-2))}</span><span className="text-[10px] tabular-nums">{future ? '—' : formatMinutes(day.studied_minutes)}</span>
        </Link>;
      })}</div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted mt-3" aria-hidden="true"><span className="mr-1">Menos tempo</span>{intensityClasses.map((classes) => <span key={classes} className={`h-3 w-3 rounded-sm border border-border ${classes}`} />)}<span className="ml-1">Mais tempo</span></div>
    </>}
    <p className="text-xs text-muted leading-relaxed mt-4">Os tons são relativos ao dia mais estudado neste período. Dias futuros ficam tracejados e não contam como faltas. As sequências se limitam ao intervalo e aos dias transcorridos; na janela atual, a sequência ao fim pode terminar ontem quando hoje ainda não há estudo.</p>
  </Card>;
}
