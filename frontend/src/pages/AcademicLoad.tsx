import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, CalendarClock, Info } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AnalyticsControls } from '../components/analytics/AnalyticsControls';
import { AnalyticsError, AnalyticsLoading } from '../components/analytics/AnalyticsState';
import { AnalyticsMethodology } from '../components/analytics/AnalyticsMethodology';
import { AcademicLoadChart } from '../components/analytics/AcademicLoadChart';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAnalyticsPeriod } from '../hooks/useAnalyticsPeriod';
import { useAcademicCapacity } from '../hooks/useAcademicCapacity';
import { analyticsDateLabel, analyticsTimezone, formatMinutes, validDailyCapacity } from '../lib/analytics';

export function AcademicLoad() {
  const periodState = useAnalyticsPeriod();
  const { capacity, saveCapacity } = useAcademicCapacity();
  const [capacityInput, setCapacityInput] = useState(String(capacity));
  const [capacityError, setCapacityError] = useState('');
  useEffect(() => { setCapacityInput(String(capacity)); }, [capacity]);
  const { data, loading, error, reload } = useAnalytics({ ...periodState.range, timezone: analyticsTimezone(), capacity });

  const handleCapacity = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(capacityInput);
    if (!validDailyCapacity(value)) { setCapacityError('Informe de 0,5 a 24 horas por dia.'); return; }
    setCapacityError('');
    const persisted = saveCapacity(value);
    toast.success(persisted ? 'Capacidade salva neste navegador.' : 'Capacidade aplicada nesta visita. O navegador não permitiu salvar.');
  };

  return <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
    <SectionHeader eyebrow="Planejamento sustentável" title="Carga acadêmica" description="Compare seus compromissos e o esforço restante com o tempo que você tem disponível."
      action={<Link to="/study" className="inline-flex items-center gap-1.5 text-sm text-crimson font-medium hover:underline">Ajustar planejamento <ArrowRight size={15} /></Link>} />
    <AnalyticsControls {...periodState} />
    <form onSubmit={handleCapacity} className="flex flex-wrap items-end gap-3 mt-5 p-4 border border-border bg-surface rounded-lg">
      <div><label htmlFor="daily-capacity" className="block text-sm font-medium text-ink mb-1.5">Tempo disponível por dia</label><div className="flex items-center gap-2"><input id="daily-capacity" type="number" inputMode="decimal" step="0.25" min="0.5" max="24" required value={capacityInput} onChange={(event) => { setCapacityInput(event.target.value); setCapacityError(''); }} aria-invalid={!!capacityError} aria-describedby={capacityError ? 'capacity-error capacity-help' : 'capacity-help'} className="w-24 border border-border-strong rounded-md px-3 py-2 bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-crimson/30" /><span className="text-sm text-graphite">horas</span></div></div>
      <Button type="submit" variant="outline">Aplicar</Button>
      <p id="capacity-help" className="text-xs text-muted max-w-sm pb-1">Inclua aulas e estudo. A preferência fica salva para sua conta neste navegador e é aplicada a todos os dias do período.</p>
      {capacityError && <p id="capacity-error" role="alert" className="w-full text-sm text-danger">{capacityError}</p>}
    </form>
    {loading ? <AnalyticsLoading /> : error || !data ? <AnalyticsError reload={reload} /> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 py-6 mt-6 border-y border-border">
        <Metric value={formatMinutes(data.summary.total_load_minutes)} label="Carga prevista" detail="Agenda + estimativa ainda sem bloco" />
        <Metric value={formatMinutes(data.summary.capacity_minutes)} label="Capacidade do período" detail={`${capacity.toLocaleString('pt-BR')}h disponíveis por dia`} />
        <Metric value={`${Math.round(data.summary.load_percent)}%`} label="Ocupação prevista" detail={data.summary.load_percent > 100 ? 'Acima da capacidade configurada' : 'Em relação ao tempo disponível'} alert={data.summary.load_percent > 100} />
        <Metric value={formatMinutes(data.summary.studied_minutes)} label="Estudo realizado" detail="Tempo ativo no Focus, mostrado separadamente" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <Card className="xl:col-span-2 min-w-0"><h2 className="font-serif text-xl font-semibold text-ink">Como a carga se distribui</h2><p className="text-sm text-graphite mt-1">Identifique dias cheios antes de assumir mais compromissos.</p><AcademicLoadChart days={data.daily} /></Card>
        <Card className="min-w-0"><div className="flex gap-2 items-center mb-5"><CalendarClock size={20} className="text-crimson" aria-hidden="true" /><h2 className="font-serif text-xl font-semibold text-ink">Dias que pedem ajuste</h2></div>
          {data.daily.some((day) => day.load_percent > 100) ? <ul className="divide-y divide-border">{data.daily.filter((day) => day.load_percent > 100).sort((a, b) => b.load_percent - a.load_percent).slice(0, 5).map((day) => <li key={day.date} className="py-3 first:pt-0 last:pb-0"><div className="flex justify-between gap-3 text-sm"><Link to={`/calendar?date=${day.date}`} className="font-medium text-ink hover:text-crimson hover:underline">{analyticsDateLabel(day.date, true)}</Link><span className="text-danger tabular-nums">{Math.round(day.load_percent)}%</span></div><p className="text-xs text-graphite mt-1">{formatMinutes(day.total_load_minutes)} previstos · {formatMinutes(day.total_load_minutes - day.capacity_minutes)} acima da capacidade</p></li>)}</ul> : <p className="text-sm text-graphite leading-relaxed">Nenhum dia ultrapassa a capacidade configurada. As estimativas dependem das tarefas e horários que você cadastrou.</p>}
          <div className="flex items-start gap-2 mt-5 pt-4 border-t border-border text-xs text-muted leading-relaxed"><Info size={15} className="shrink-0 mt-0.5" aria-hidden="true" /><p>{data.summary.unknown_estimate_tasks > 0 ? `${data.summary.unknown_estimate_tasks} tarefas abertas não têm estimativa e não entram no cálculo de esforço. Defina o tempo necessário para uma previsão mais fiel.` : 'A previsão considera os registros disponíveis. Compromissos sem duração não acrescentam horas à carga.'}</p></div>
        </Card>
      </div>
      <Card className="mt-6"><h2 className="font-serif text-xl font-semibold text-ink mb-1">De onde vem o esforço</h2><p className="text-sm text-graphite mb-5">Os blocos de estudo já fazem parte da agenda. Eles não são somados novamente à estimativa da mesma tarefa.</p>
        {data.subjects.length ? <div className="space-y-5">{[...data.subjects].sort((a, b) => b.total_load_minutes - a.total_load_minutes).map((subject) => <div key={subject.subject_id ?? 'unassigned'}><div className="flex flex-wrap justify-between gap-2 mb-2"><p className="text-sm font-medium text-ink">{subject.subject_id === null ? subject.subject_name : <Link to={`/subjects/${subject.subject_id}`} className="hover:text-crimson hover:underline">{subject.subject_name}</Link>}</p><span className="text-sm text-ink tabular-nums">{formatMinutes(subject.total_load_minutes)}</span></div><ProgressBar value={data.summary.total_load_minutes ? subject.total_load_minutes / data.summary.total_load_minutes * 100 : 0} tone="navy" size="sm" /><p className="text-xs text-muted mt-1.5">{formatMinutes(subject.scheduled_minutes)} na agenda · {formatMinutes(subject.unallocated_task_minutes)} de estimativa sem bloco · {formatMinutes(subject.studied_minutes)} estudados</p></div>)}</div> : <p className="text-sm text-muted py-4">Ainda não há carga neste período. Adicione tarefas com estimativas e compromissos com horários para planejar.</p>}
      </Card>
      <AnalyticsMethodology methodology={data.methodology} timezone={data.period.timezone} />
    </>}
  </div>;
}

function Metric({ value, label, detail, alert = false }: { value: string; label: string; detail: string; alert?: boolean }) {
  return <div className="min-w-0"><p className={`font-serif text-3xl sm:text-4xl font-semibold tabular-nums ${alert ? 'text-danger' : 'text-ink'}`}>{value}</p><p className="text-sm text-ink font-medium mt-1">{label}</p><p className="text-xs text-muted mt-1 leading-relaxed">{detail}</p></div>;
}
