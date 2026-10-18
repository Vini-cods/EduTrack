import { Link } from 'react-router-dom';
import { ArrowRight, Check, Circle, Loader2 } from 'lucide-react';
import type { TaskWithSubject } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatMinutes } from '../../lib/analytics';
import { formatShortDate } from '../../lib/date';
import { PRIORITY_META } from '../../lib/tasks';

interface PriorityTasksProps {
  tasks: TaskWithSubject[];
  today: string;
  completing: ReadonlySet<number>;
  onComplete: (id: number) => void;
}

export function PriorityTasks({ tasks, today, completing, onComplete }: PriorityTasksProps) {
  return <Card variant="accent" id="priorities">
    <div className="flex flex-wrap justify-between items-center gap-3 mb-1"><h2 className="font-serif text-xl font-semibold text-ink">Comece por aqui</h2><Link to="/tasks" className="text-sm text-graphite hover:text-crimson inline-flex items-center gap-1">Todas as tarefas <ArrowRight size={14} /></Link></div>
    <p className="text-sm text-graphite mb-5">Prazos vencidos e de hoje primeiro; depois, prioridade e próximos prazos.</p>
    {!tasks.length ? <div className="py-5"><Check size={22} className="text-success mb-3" aria-hidden="true" /><p className="text-ink font-medium">Nenhuma tarefa pendente.</p><p className="text-sm text-graphite mt-1">Reserve um bloco de estudo ou organize seus próximos objetivos.</p><Link to="/study" className="inline-flex mt-4 text-sm font-medium text-crimson hover:underline">Planejar meus estudos</Link></div> : <ul className="divide-y divide-border">
      {tasks.slice(0, 5).map((task) => {
        const overdue = !!task.due_date && task.due_date < today;
        const dueToday = task.due_date === today;
        const priority = PRIORITY_META[task.priority];
        return <li key={task.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
          <button type="button" disabled={completing.has(task.id)} onClick={() => onComplete(task.id)} aria-label={`Concluir ${task.title}`} className="shrink-0 -mt-1 min-w-11 min-h-11 inline-flex items-center justify-center rounded text-muted hover:text-success disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson/40">{completing.has(task.id) ? <Loader2 size={20} className="animate-spin" /> : <Circle size={20} />}</button>
          <div className="min-w-0 flex-1"><Link to={`/tasks?highlight=${task.id}`} className="text-sm text-ink font-medium break-words hover:text-crimson hover:underline">{task.title}</Link><p className="text-xs text-muted mt-1 break-words">{task.subject_name}{task.estimated_hours ? ` · ${formatMinutes(task.estimated_hours * 60)} estimadas` : ''}</p><div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 items-center"><span className={`text-xs ${overdue ? 'text-danger' : dueToday ? 'text-warning' : 'text-graphite'}`}>{overdue ? `Atrasada · ${formatShortDate(task.due_date!)}` : dueToday ? 'Entrega hoje' : task.due_date ? `Entrega ${formatShortDate(task.due_date)}` : 'Sem prazo definido'}</span><Badge tone={priority.tone} size="sm">{priority.label}</Badge><Link to={`/study/focus?task_id=${task.id}`} className="inline-flex items-center min-h-8 text-xs font-medium text-crimson hover:underline" aria-label={`Preparar Focus para ${task.title}`}>Focar<ArrowRight size={12} className="ml-1" aria-hidden="true" /></Link></div></div>
        </li>;
      })}
    </ul>}
    {tasks.length > 5 && <p className="text-xs text-muted mt-5 pt-4 border-t border-border">Mais {tasks.length - 5} tarefas pendentes em <Link to="/tasks" className="underline hover:text-ink">Tarefas</Link>.</p>}
  </Card>;
}
