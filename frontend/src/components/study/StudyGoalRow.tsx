import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, CheckCircle2, Circle, Pencil, Timer, Trash2 } from 'lucide-react';
import type { CalendarEventWithSubject, TaskWithSubject } from '../../types';
import { PRIORITY_META } from '../../lib/tasks';
import { formatShortDate, getDueDateStatus, DUE_DATE_TEXT_CLASS } from '../../lib/date';
import { formatStudyDuration } from '../../lib/studyPlanner';
import { toDatetimeLocalValue } from '../../lib/calendar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const StudyGoalRow: React.FC<{
  task: TaskWithSubject;
  blocks: CalendarEventWithSubject[];
  busy: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onSchedule: () => void;
  onDelete: () => void;
}> = ({ task, blocks, busy, onComplete, onEdit, onSchedule, onDelete }) => {
  const completed = task.status === 'concluida';
  const next = blocks[0];
  return (
    <li className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <button onClick={onComplete} disabled={busy} aria-pressed={completed}
          aria-label={`${completed ? 'Reabrir' : 'Concluir'} objetivo: ${task.title}`}
          className={`shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center rounded-md cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-crimson ${completed ? 'text-success' : 'text-muted hover:text-success'}`}>
          {completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <h3 className={`text-sm font-semibold break-words ${completed ? 'line-through text-muted' : 'text-ink'}`}>{task.title}</h3>
          {task.description && <p className="text-sm text-graphite mt-1 break-words whitespace-pre-line">{task.description}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            <Badge tone="neutral" size="sm">{task.subject_name}</Badge>
            <Badge tone={PRIORITY_META[task.priority].tone} size="sm">{PRIORITY_META[task.priority].label}</Badge>
            {task.status === 'em_andamento' && <Badge tone="navy" size="sm">Em andamento</Badge>}
            <span className="text-graphite">{formatStudyDuration((task.estimated_hours || 0) * 3600)} estimadas</span>
            <span className={completed ? 'text-muted' : DUE_DATE_TEXT_CLASS[getDueDateStatus(task.due_date)]}>
              {task.due_date ? `Prazo: ${formatShortDate(task.due_date)}` : 'Sem prazo'}
            </span>
          </div>
          {next && <Link to={`/calendar?date=${toDatetimeLocalValue(new Date(next.start_datetime)).slice(0, 10)}`}
            className="inline-block text-xs text-navy underline underline-offset-2 mt-3 py-1">
            Próximo bloco: {new Date(next.start_datetime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            {blocks.length > 1 ? ` · +${blocks.length - 1} agendado${blocks.length > 2 ? 's' : ''}` : ''}
          </Link>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:pl-14 mt-3">
        {!completed && <>
          <Link to={`/study/focus?task_id=${task.id}`} className="min-h-11 inline-flex items-center gap-1.5 px-3 rounded-md text-sm font-medium text-crimson hover:bg-crimson/5 focus-visible:outline-2 focus-visible:outline-crimson"><Timer size={15} /> Focar</Link>
          <Button variant="ghost" icon={<CalendarPlus size={15} />} onClick={onSchedule} disabled={busy}>{next ? 'Adicionar bloco' : 'Agendar'}</Button>
        </>}
        <Button variant="ghost" icon={<Pencil size={15} />} onClick={onEdit} disabled={busy} aria-label={`Editar objetivo: ${task.title}`}>Editar</Button>
        <Button variant="ghost" icon={<Trash2 size={15} />} onClick={onDelete} disabled={busy} aria-label={`Excluir objetivo: ${task.title}`}>Excluir</Button>
      </div>
    </li>
  );
};
