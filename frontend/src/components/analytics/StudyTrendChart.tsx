import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { analyticsDateLabel, formatMinutes } from '../../lib/analytics';
import type { AnalyticsDay } from '../../types/analytics';

export const analyticsTooltipStyle = {
  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px',
  color: 'var(--color-ink)', fontSize: '13px',
};

export function StudyTrendChart({ days }: { days: AnalyticsDay[] }) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const hasData = days.some((day) => day.studied_minutes > 0 || day.planned_study_minutes > 0);
  if (!hasData) return <p className="flex min-h-56 items-center justify-center text-sm text-muted text-center px-4">Agende blocos no Planner ou conclua sessões no Focus para acompanhar seu ritmo.</p>;
  return <>
    <div className="h-64 min-w-0 mt-5" role="img" aria-label="Estudo agendado e realizado por dia. Os valores também estão disponíveis na tabela abaixo.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} accessibilityLayer barGap={3} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => analyticsDateLabel(value)} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
          <YAxis tickFormatter={(value: number) => `${Math.round(value / 60 * 10) / 10}h`} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip contentStyle={analyticsTooltipStyle} labelFormatter={(label) => analyticsDateLabel(String(label), true)} formatter={(value, name) => [formatMinutes(Number(value)), name]} cursor={{ fill: 'var(--color-surface-muted)' }} />
          <Bar dataKey="planned_study_minutes" name="Agendado" fill="var(--color-navy)" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={!reduceMotion} />
          <Bar dataKey="studied_minutes" name="Realizado" fill="var(--color-crimson)" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={!reduceMotion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="flex flex-wrap items-center gap-5 text-xs text-graphite mt-3"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-navy)' }} />Agendado no calendário</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-crimson)' }} />Realizado no Focus</span></div>
    <details className="mt-4 text-sm text-graphite"><summary className="cursor-pointer">Ver dados por dia</summary><div className="overflow-x-auto mt-3"><table className="w-full text-left text-xs"><caption className="sr-only">Minutos agendados e estudados por data</caption><thead><tr className="border-b border-border"><th scope="col" className="py-2 pr-4">Data</th><th scope="col" className="py-2 pr-4">Agendado</th><th scope="col" className="py-2">Realizado</th></tr></thead><tbody>{days.map((day) => <tr key={day.date} className="border-b border-border last:border-0"><th scope="row" className="py-2 pr-4 font-normal">{analyticsDateLabel(day.date, true)}</th><td className="py-2 pr-4">{formatMinutes(day.planned_study_minutes)}</td><td className="py-2">{formatMinutes(day.studied_minutes)}</td></tr>)}</tbody></table></div></details>
  </>;
}
