import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { AnalyticsDay } from '../../types/analytics';
import { analyticsDateLabel } from '../../lib/analytics';
import { Card } from '../ui/Card';

export function DashboardDeadlinePressure({ days, today }: { days: AnalyticsDay[]; today: string }) {
  const total = days.reduce((sum, day) => sum + day.tasks_due, 0);
  const pending = days.reduce((sum, day) => sum + Math.max(0, day.tasks_due - day.tasks_completed), 0);
  const maximum = Math.max(1, ...days.map((day) => day.tasks_due));
  return <Card className="min-w-0 h-full" aria-labelledby="deadline-pressure-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="deadline-pressure-title" className="font-serif text-xl font-semibold text-ink">Prazos nesta semana</h2><p className="text-sm text-graphite mt-1">{pending} {pending === 1 ? 'aberto' : 'abertos'} de {total} · situação atual das tarefas por prazo.</p></div><Link to="/calendar" className="inline-flex items-center gap-1 min-h-11 text-xs font-medium text-crimson hover:underline">Calendário<ArrowRight size={13} aria-hidden="true" /></Link></div>
    <ol className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-5" aria-label="Distribuição semanal dos prazos">
      {days.map((day) => {
        const open = Math.max(0, day.tasks_due - day.tasks_completed);
        return <li key={day.date} className="min-w-0"><Link to={`/calendar?date=${day.date}`} className={`block rounded-md px-1.5 pt-2 pb-2 border text-center hover:bg-surface-muted ${day.date === today ? 'border-crimson/50 bg-crimson-soft/30' : 'border-transparent'}`} aria-label={`${analyticsDateLabel(day.date, true)}: ${open} abertas, ${day.tasks_completed} concluídas`}>
          <span className="flex flex-col-reverse justify-start h-16 mx-auto w-6 overflow-hidden rounded-sm bg-surface-muted" aria-hidden="true">
            <span className="w-full bg-crimson" style={{ height: `${open / maximum * 100}%` }} />
            <span className="w-full bg-navy/40" style={{ height: `${day.tasks_completed / maximum * 100}%` }} />
          </span>
          <span className="block mt-2 text-xs text-ink font-medium">{new Date(`${day.date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
          <span className="block mt-1 text-xs text-graphite tabular-nums">{open} abertas</span>
        </Link></li>;
      })}
    </ol>
    <div className="flex flex-wrap gap-4 mt-4 text-xs text-graphite"><span className="flex items-center gap-1.5"><i className="size-2 bg-crimson rounded-sm" aria-hidden="true" />Abertas</span><span className="flex items-center gap-1.5"><i className="size-2 bg-navy/40 rounded-sm" aria-hidden="true" />Concluídas</span></div>
    {!total && <p className="text-xs text-muted mt-3">Sem tarefas com prazo nesta semana. Prazos ainda não definidos aparecem no diagnóstico do planejamento.</p>}
  </Card>;
}
