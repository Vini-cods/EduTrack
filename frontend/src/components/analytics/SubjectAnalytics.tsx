import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatMinutes } from '../../lib/analytics';
import type { AnalyticsSubject } from '../../types/analytics';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

type SubjectSort = 'studied_minutes' | 'total_load_minutes' | 'unallocated_task_minutes';

export function SubjectAnalytics({ subjects }: { subjects: AnalyticsSubject[] }) {
  const [sort, setSort] = useState<SubjectSort>('total_load_minutes');
  const totals = subjects.reduce((total, subject) => ({ studied: total.studied + subject.studied_minutes, load: total.load + subject.total_load_minutes }), { studied: 0, load: 0 });
  const ordered = [...subjects].sort((a, b) => b[sort] - a[sort] || a.subject_name.localeCompare(b.subject_name, 'pt-BR'));
  return <Card className="min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="font-serif text-xl font-semibold text-ink">Onde estão seu tempo e sua carga</h2><p className="text-sm text-graphite mt-1 max-w-3xl">Compare o estudo registrado com a carga prevista por disciplina. São medidas diferentes, não uma avaliação de desempenho.</p></div>
      {!!subjects.length && <div><label htmlFor="subject-analytics-sort" className="block text-xs font-medium text-graphite mb-1.5">Ordenar disciplinas por</label><select id="subject-analytics-sort" value={sort} onChange={(event) => setSort(event.target.value as SubjectSort)} className="max-w-full rounded-md border border-border-strong bg-surface text-ink text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crimson/30"><option value="total_load_minutes">Maior carga prevista</option><option value="studied_minutes">Mais tempo estudado</option><option value="unallocated_task_minutes">Mais esforço sem bloco</option></select></div>}
    </div>
    {!subjects.length ? <div className="py-8"><p className="text-sm text-graphite">Ainda não há disciplinas ou atividade neste período. Organize uma tarefa e reserve tempo para começar.</p><Link to="/study" className="inline-flex items-center gap-1 text-sm font-medium text-crimson hover:underline mt-3">Planejar estudos <ArrowRight size={14} aria-hidden="true" /></Link></div> : <>
      <p className="text-xs text-muted mt-5 mb-3">Deslize a tabela para consultar todas as medidas em telas menores.</p>
      <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson/30 rounded-sm" tabIndex={0} role="region" aria-label="Tabela de medidas por disciplina, com rolagem horizontal"><table className="w-full text-sm text-left">
        <caption className="sr-only">Comparação por disciplina de estudo realizado, blocos de estudo, esforço sem bloco, carga total e tarefas concluídas</caption>
        <thead><tr className="text-xs text-muted border-b border-border">
          <th scope="col" className="pb-3 pr-6 font-medium min-w-40">Disciplina</th><th scope="col" className="pb-3 pr-6 font-medium min-w-32">Estudo realizado</th><th scope="col" className="pb-3 pr-6 font-medium min-w-28">Estudo agendado</th><th scope="col" className="pb-3 pr-6 font-medium min-w-32">Esforço sem bloco</th><th scope="col" className="pb-3 pr-6 font-medium min-w-32">Carga prevista</th><th scope="col" className="pb-3 font-medium min-w-36">Entregas concluídas</th>
        </tr></thead>
        <tbody>{ordered.map((subject) => {
          const studiedShare = totals.studied > 0 ? subject.studied_minutes / totals.studied * 100 : 0;
          const loadShare = totals.load > 0 ? subject.total_load_minutes / totals.load * 100 : 0;
          return <tr key={subject.subject_id ?? 'unassigned'} className="border-b border-border last:border-0">
            <th scope="row" className="py-4 pr-6 font-medium text-ink">{subject.subject_id === null ? subject.subject_name : <Link to={`/subjects/${subject.subject_id}`} className="hover:text-crimson hover:underline">{subject.subject_name}</Link>}</th>
            <td className="py-4 pr-6 text-ink tabular-nums"><p className="whitespace-nowrap">{formatMinutes(subject.studied_minutes)}</p><p className="text-xs text-muted mt-1">{totals.studied > 0 ? `${studiedShare.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do estudo` : 'Sem estudo registrado'}</p></td>
            <td className="py-4 pr-6 text-graphite tabular-nums whitespace-nowrap">{formatMinutes(subject.planned_study_minutes)}</td>
            <td className="py-4 pr-6 text-graphite tabular-nums whitespace-nowrap">{formatMinutes(subject.unallocated_task_minutes)}</td>
            <td className="py-4 pr-6 text-ink tabular-nums"><p className="whitespace-nowrap mb-1.5">{formatMinutes(subject.total_load_minutes)}</p><div aria-hidden="true"><ProgressBar value={loadShare} size="sm" tone="navy" /></div><p className="text-xs text-muted mt-1">{totals.load > 0 ? `${loadShare.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da carga` : 'Sem carga prevista'}</p></td>
            <td className="py-4"><p className="text-xs text-graphite">{subject.tasks_due > 0 ? `${subject.tasks_completed} de ${subject.tasks_due} · ${Math.round(subject.completion_rate)}%` : 'Sem prazo no período'}</p>{subject.tasks_due > 0 && <div className="mt-1.5" aria-hidden="true"><ProgressBar value={subject.completion_rate} size="sm" tone="navy" /></div>}</td>
          </tr>;
        })}</tbody>
      </table></div>
      <p className="text-xs text-muted leading-relaxed mt-4">Carga = agenda total + esforço restante sem bloco. O estudo agendado já integra a agenda; não é somado de novo. Os percentuais de participação comparam apenas os registros deste período.</p>
    </>}
  </Card>;
}
