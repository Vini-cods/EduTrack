import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { analyticsWeekdays, studyIntensity } from '../../lib/advancedAnalytics';
import { formatMinutes } from '../../lib/analytics';
import type { AnalyticsSessionPatterns } from '../../types/analytics';
import { Card } from '../ui/Card';

const hourColors = ['bg-surface-muted', 'bg-crimson/10', 'bg-crimson/20', 'bg-crimson/35', 'bg-crimson text-white'];

export function StudyPatterns({ patterns }: { patterns?: AnalyticsSessionPatterns }) {
  return <Card className="min-w-0">
    <h2 className="font-serif text-xl font-semibold text-ink">Quando você costuma estudar</h2>
    <p className="text-sm text-graphite mt-1">Padrões das sessões concluídas no intervalo selecionado.</p>
    {!patterns ? <p className="text-sm text-muted mt-5">Padrões de sessões indisponíveis nesta versão da API.</p> : !patterns.completed_sessions ? <div className="py-8"><p className="text-sm text-graphite">Nenhuma sessão concluída neste período. Use o Focus para começar a registrar seu ritmo.</p><Link to="/study/focus" className="inline-flex items-center gap-1 text-sm font-medium text-crimson hover:underline mt-3">Iniciar uma sessão <ArrowRight size={14} aria-hidden="true" /></Link></div> : <>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-border py-4 mt-5">
        {[['Sessões', String(patterns.completed_sessions)], ['Duração média', formatMinutes(patterns.average_session_minutes)], ['Duração mediana', formatMinutes(patterns.median_session_minutes)], ['Maior sessão', formatMinutes(patterns.longest_session_minutes)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="text-lg font-semibold text-ink tabular-nums mt-1">{value}</dd></div>)}
      </dl>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-5">
        <div>
          <h3 className="text-sm font-medium text-ink mb-3">Por dia de início</h3>
          <ul className="space-y-3">{Array.from({ length: 7 }, (_, weekday) => {
            const item = patterns.weekday_distribution.find((entry) => entry.weekday === weekday);
            const minutes = item?.studied_minutes ?? 0;
            const sessions = item?.completed_sessions ?? 0;
            const maximum = Math.max(0, ...patterns.weekday_distribution.map((entry) => entry.studied_minutes));
            return <li key={weekday}><div className="flex items-center justify-between gap-3 text-xs mb-1.5"><span className="font-medium text-ink">{analyticsWeekdays[weekday]}</span><span className="text-graphite tabular-nums">{formatMinutes(minutes)} · {sessions} {sessions === 1 ? 'sessão' : 'sessões'}</span></div><div className="h-1.5 rounded-full bg-surface-muted" aria-hidden="true"><div className="h-full rounded-full bg-navy" style={{ width: `${maximum > 0 ? minutes / maximum * 100 : 0}%` }} /></div></li>;
          })}</ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-ink mb-3">Por hora de início</h3>
          <ul className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-6 xl:grid-cols-8 gap-1.5">{Array.from({ length: 24 }, (_, hour) => {
            const item = patterns.hourly_distribution.find((entry) => entry.hour === hour);
            const minutes = item?.studied_minutes ?? 0;
            const sessions = item?.completed_sessions ?? 0;
            const label = `${String(hour).padStart(2, '0')}h: ${formatMinutes(minutes)} em ${sessions} ${sessions === 1 ? 'sessão' : 'sessões'}`;
            const maximum = Math.max(0, ...patterns.hourly_distribution.map((entry) => entry.studied_minutes));
            return <li key={hour} title={label} aria-label={label} className={`min-w-0 rounded px-1 py-2 text-center ${hourColors[studyIntensity(minutes, maximum)]}`}><span aria-hidden="true" className="block text-xs font-medium tabular-nums">{String(hour).padStart(2, '0')}h</span><span aria-hidden="true" className="block text-[10px] tabular-nums mt-0.5">{sessions}×</span></li>;
          })}</ul>
          <p className="text-xs text-muted leading-relaxed mt-3">Mais intensidade = mais minutos associados à hora de início. Os números indicam sessões.</p>
          <details className="mt-4 text-sm text-graphite"><summary className="cursor-pointer">Ver minutos por hora</summary><div className="overflow-x-auto mt-2"><table className="w-full text-xs text-left"><caption className="sr-only">Sessões e minutos por hora local de início</caption><thead><tr className="border-b border-border"><th scope="col" className="py-2 pr-3">Hora</th><th scope="col" className="py-2 pr-3">Sessões</th><th scope="col" className="py-2">Minutos</th></tr></thead><tbody>{patterns.hourly_distribution.map((item) => <tr key={item.hour} className="border-b border-border last:border-0"><th scope="row" className="py-1.5 pr-3 font-normal">{String(item.hour).padStart(2, '0')}h</th><td className="py-1.5 pr-3 tabular-nums">{item.completed_sessions}</td><td className="py-1.5 tabular-nums">{item.studied_minutes}</td></tr>)}</tbody></table></div></details>
        </div>
      </div>
      <p className="text-xs text-muted leading-relaxed mt-5 pt-4 border-t border-border">O tempo inteiro de cada sessão é atribuído ao dia e à hora em que ela começou, no fuso do relatório. Não indica o melhor horário para aprender. A média e a mediana incluem sessões concluídas com zero minuto.</p>
    </>}
  </Card>;
}
