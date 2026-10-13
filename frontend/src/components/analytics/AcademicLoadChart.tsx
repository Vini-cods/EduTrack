import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { analyticsDateLabel, formatMinutes } from '../../lib/analytics';
import type { AnalyticsDay } from '../../types/analytics';
import { analyticsTooltipStyle } from './StudyTrendChart';

export function AcademicLoadChart({ days }: { days: AnalyticsDay[] }) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return <>
    <div className="h-64 min-w-0 mt-5" role="img" aria-label="Carga por dia dividida entre agenda e estimativa restante. Linha pontilhada representa sua capacidade. Valores disponíveis na tabela abaixo.">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={days} accessibilityLayer margin={{ top: 8, right: 5, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => analyticsDateLabel(value)} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
          <YAxis tickFormatter={(value: number) => `${Math.round(value / 60 * 10) / 10}h`} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip contentStyle={analyticsTooltipStyle} labelFormatter={(label) => analyticsDateLabel(String(label), true)} formatter={(value, name) => [formatMinutes(Number(value)), name]} cursor={{ fill: 'var(--color-surface-muted)' }} />
          <Bar dataKey="scheduled_minutes" name="Na agenda" stackId="load" fill="var(--color-navy)" maxBarSize={30} isAnimationActive={!reduceMotion} />
          <Bar dataKey="unallocated_task_minutes" name="Estimativa sem bloco" stackId="load" fill="var(--color-crimson)" radius={[3, 3, 0, 0]} maxBarSize={30} isAnimationActive={!reduceMotion} />
          <Line dataKey="capacity_minutes" name="Capacidade" stroke="var(--color-muted)" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={!reduceMotion} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-graphite mt-3"><span className="flex gap-2 items-center"><i className="w-2.5 h-2.5 bg-navy rounded-sm" />Na agenda</span><span className="flex gap-2 items-center"><i className="w-2.5 h-2.5 bg-crimson rounded-sm" />Estimativa sem bloco</span><span className="flex gap-2 items-center"><i className="w-4 border-t-2 border-dashed border-muted" />Capacidade</span></div>
    <details className="mt-4 text-sm text-graphite"><summary className="cursor-pointer">Ver carga e estudo por dia</summary><div className="overflow-x-auto mt-3"><table className="w-full text-left text-xs"><caption className="sr-only">Carga prevista e estudo realizado por dia. O estudo realizado é separado da carga prevista.</caption><thead><tr className="border-b border-border">{['Data', 'Agenda', 'Sem bloco', 'Carga total', 'Capacidade', 'Estudado'].map((label) => <th key={label} scope="col" className="py-2 pr-4 whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{days.map((day) => <tr key={day.date} className="border-b border-border last:border-0"><th scope="row" className="py-2 pr-4 font-normal whitespace-nowrap">{analyticsDateLabel(day.date, true)}</th>{[day.scheduled_minutes, day.unallocated_task_minutes, day.total_load_minutes, day.capacity_minutes, day.studied_minutes].map((value, index) => <td key={index} className={`py-2 pr-4 whitespace-nowrap ${index === 2 && day.load_percent > 100 ? 'text-danger font-medium' : ''}`}>{formatMinutes(value)}</td>)}</tr>)}</tbody></table></div></details>
  </>;
}
