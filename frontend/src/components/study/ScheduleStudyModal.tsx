import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { scheduleStudyBlock } from '../../api/studyPlanner';
import { buildStudyBlock, conflictingEvents, studyBlockPastDeadline } from '../../lib/studyPlanner';
import { toDatetimeLocalValue } from '../../lib/calendar';
import type { CalendarEventWithSubject, Task } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

export const ScheduleStudyModal: React.FC<{
  task: Task | null;
  events: CalendarEventWithSubject[];
  ready: boolean;
  onClose: () => void;
  onScheduled: () => void;
}> = ({ task, events, ready, onClose, onScheduled }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [minutes, setMinutes] = useState('60');
  const [saving, setSaving] = useState(false);
  const [allowConflict, setAllowConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    const today = toDatetimeLocalValue(new Date()).slice(0, 10);
    setDate(task.due_date && task.due_date >= today ? task.due_date : today);
    setTime('19:00');
    setMinutes(String(Math.max(5, Math.min(120, Math.round((task.estimated_hours || 1) * 60)))));
    setError(null);
  }, [task]);

  useEffect(() => { setAllowConflict(false); }, [date, time, minutes, task]);

  const { preview, validationError } = useMemo(() => {
    if (!task) return { preview: null, validationError: null };
    try { return { preview: buildStudyBlock(task, date, time, Number(minutes)), validationError: null }; }
    catch (cause) { return { preview: null, validationError: cause instanceof Error ? cause.message : 'Confira os dados do bloco de estudo.' }; }
  }, [task, date, time, minutes]);
  const conflicts = preview ? conflictingEvents(events, preview.start_datetime, preview.end_datetime) : [];
  const afterDeadline = !!preview && studyBlockPastDeadline(task?.due_date, preview.end_datetime);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !ready) return;
    if (!preview) { setError(validationError || 'Informe data, horário e duração entre 5 e 720 minutos.'); return; }
    if (conflicts.length && !allowConflict) { setError('Revise o conflito de horário antes de agendar.'); return; }
    setSaving(true);
    setError(null);
    try {
      await scheduleStudyBlock(preview);
      toast.success('Bloco de estudo agendado.');
      onScheduled();
      onClose();
    } catch {
      setError('Não foi possível agendar. Seus dados foram mantidos para tentar novamente.');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={!!task} onClose={() => { if (!saving) onClose(); }} ariaLabel="Agendar bloco de estudo" panelClassName="max-w-md">
      <form onSubmit={onSubmit} className="p-5 sm:p-6">
        <h2 className="font-serif text-xl font-semibold text-ink">Agendar bloco de estudo</h2>
        <p className="text-sm text-graphite mt-2 mb-5 break-words">{task?.title}</p>
        <fieldset disabled={saving} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="study-date" className="block text-sm font-medium text-graphite mb-1.5">Data</label>
              <TextField id="study-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="study-time" className="block text-sm font-medium text-graphite mb-1.5">Horário</label>
              <TextField id="study-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
            </div>
          </div>
          <div>
            <label htmlFor="study-duration" className="block text-sm font-medium text-graphite mb-1.5">Duração do bloco (minutos)</label>
            <TextField id="study-duration" type="number" min="5" max="720" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} required aria-describedby="study-duration-help" />
            <p id="study-duration-help" className="text-xs text-muted mt-1.5">Divida um objetivo em quantos blocos precisar. A estimativa total permanece no objetivo.</p>
          </div>
          {afterDeadline && <p className="text-sm text-warning" role="status">Este bloco acontece depois do prazo do objetivo.</p>}
          {!!conflicts.length && (
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
              <p className="font-medium text-ink">Conflito com {conflicts.length} {conflicts.length === 1 ? 'evento' : 'eventos'}</p>
              <ul className="mt-1 list-disc pl-5 text-graphite">{conflicts.map((event) => <li key={event.id} className="break-words">{event.title}</li>)}</ul>
              <label className="flex items-start gap-2 mt-3 cursor-pointer text-ink">
                <input type="checkbox" checked={allowConflict} onChange={(event) => { setAllowConflict(event.target.checked); setError(null); }} className="mt-1 accent-crimson" />
                Agendar mesmo com sobreposição
              </label>
            </div>
          )}
        </fieldset>
        {error && <p className="text-sm text-danger mt-4" role="alert">{error}</p>}
        {!ready && <p className="text-sm text-graphite mt-4" role="status">Aguarde a atualização da agenda para verificar conflitos.</p>}
        <div className="flex justify-end gap-2.5 mt-6 pt-5 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" loading={saving} disabled={!ready || (!!conflicts.length && !allowConflict)}>Agendar</Button>
        </div>
      </form>
    </Modal>
  );
};
