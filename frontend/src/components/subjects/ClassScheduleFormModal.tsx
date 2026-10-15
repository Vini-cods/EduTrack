import React, { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import type { CalendarEventWithSubject, Subject } from '../../types';
import { CLASS_WEEKDAYS, buildClassSchedulePayload, classOccurrenceDates, duplicateClassDates, localDateKey, validateClassSchedule } from '../../lib/classSchedule';
import type { ClassScheduleDraft } from '../../lib/classSchedule';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props { open: boolean; subjects: Subject[]; subjectId?: number; onClose: () => void; onSaved: (firstDate: string) => void }
const fieldClass = 'w-full min-h-11 px-3 py-2.5 border border-border rounded-md bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-crimson/30';
const labelClass = 'block text-sm text-graphite font-medium mb-1.5';
const emptyDraft: ClassScheduleDraft = { subjectId: 0, days: [], startDate: '', endDate: '', startTime: '19:00', endTime: '20:40', location: '' };

export const ClassScheduleFormModal: React.FC<Props> = ({ open, subjects, subjectId, onClose, onSaved }) => {
  const [draft, setDraft] = useState<ClassScheduleDraft>(emptyDraft);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    const subject = subjects.find(item => item.id === subjectId);
    const start = subject?.start_date || localDateKey(new Date());
    const until = new Date(`${start}T12:00:00`); until.setDate(until.getDate() + 112);
    setDraft({ ...emptyDraft, subjectId: subject?.id || 0, startDate: start, endDate: subject?.end_date || localDateKey(until) });
    setError('');
    // Os dados iniciais são aplicados apenas quando o diálogo é aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subjectId]);
  const update = (patch: Partial<ClassScheduleDraft>) => { setDraft(previous => ({ ...previous, ...patch })); setError(''); };
  const validation = validateClassSchedule(draft);
  const dates = validation ? [] : classOccurrenceDates(draft);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) return;
    const validationError = validateClassSchedule(draft);
    if (validationError) { setError(validationError); return; }
    const subject = subjects.find(item => item.id === draft.subjectId);
    if (!subject) { setError('Selecione uma disciplina disponível.'); return; }
    busyRef.current = true; setBusy(true); setError('');
    try {
      const afterEnd = new Date(`${draft.endDate}T12:00:00`); afterEnd.setDate(afterEnd.getDate() + 1);
      const response = await apiClient.get<CalendarEventWithSubject[]>('/calendar-events/', { params: {
        subject_id: draft.subjectId, category: 'aula', start: `${draft.startDate}T00:00:00`, end: `${localDateKey(afterEnd)}T00:00:00`,
      } });
      const duplicates = duplicateClassDates(draft, response.data);
      if (duplicates.length) {
        setError(`${duplicates.length} aula(s) com esta disciplina e horário já existem no período. Ajuste os dias ou as datas para não criar repetições.`);
        return;
      }
      await apiClient.post('/calendar-events/', buildClassSchedulePayload(draft, subject.name));
      toast.success(`${dates.length} aulas adicionadas ao cronograma e ao calendário.`);
      onSaved(dates[0]);
    } catch (reason) {
      const detail = isAxiosError(reason) ? reason.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Não foi possível criar a grade. Seus dados continuam no formulário.');
    } finally { busyRef.current = false; setBusy(false); }
  };
  return <Modal open={open} onClose={() => { if (!busyRef.current) onClose(); }} ariaLabel="Adicionar horários de aula" panelClassName="max-w-xl">
    <form onSubmit={submit} className="p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-ink">Adicionar horários de aula</h2>
      <p className="mt-1 mb-5 text-sm text-graphite">Uma grade repete o mesmo horário nos dias escolhidos. Para horários diferentes, adicione outra grade.</p>
      <fieldset disabled={busy} className="space-y-4">
        <div><label htmlFor="class-subject" className={labelClass}>Disciplina</label><select id="class-subject" required disabled={subjectId !== undefined || busy} value={draft.subjectId || ''} onChange={event => {
          const selected = subjects.find(subject => subject.id === Number(event.target.value));
          update({ subjectId: Number(event.target.value), ...(selected?.start_date ? { startDate: selected.start_date } : {}), ...(selected?.end_date ? { endDate: selected.end_date } : {}) });
        }} className={fieldClass}><option value="">Selecione uma disciplina</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
        <fieldset><legend className={labelClass}>Dias da semana</legend><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{CLASS_WEEKDAYS.map((day, index) => <label key={day} className={`min-h-11 inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm cursor-pointer ${draft.days.includes(index) ? 'border-crimson bg-crimson-soft text-ink' : 'border-border text-graphite'}`}>
          <input type="checkbox" checked={draft.days.includes(index)} onChange={event => update({ days: event.target.checked ? [...draft.days, index].sort((a, b) => a - b) : draft.days.filter(day => day !== index) })} className="accent-crimson w-4 h-4" />{day}</label>)}</div></fieldset>
        <div className="grid grid-cols-2 gap-3"><div><label htmlFor="class-start-time" className={labelClass}>Início da aula</label><input id="class-start-time" type="time" required value={draft.startTime} onChange={event => update({ startTime: event.target.value })} className={fieldClass} /></div><div><label htmlFor="class-end-time" className={labelClass}>Fim da aula</label><input id="class-end-time" type="time" required value={draft.endTime} onChange={event => update({ endTime: event.target.value })} className={fieldClass} /></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label htmlFor="class-start-date" className={labelClass}>Início do período letivo</label><input id="class-start-date" type="date" required value={draft.startDate} onChange={event => update({ startDate: event.target.value })} className={fieldClass} /></div><div><label htmlFor="class-end-date" className={labelClass}>Último dia do período</label><input id="class-end-date" type="date" required min={draft.startDate || undefined} value={draft.endDate} onChange={event => update({ endDate: event.target.value })} className={fieldClass} /></div></div>
        <div><label htmlFor="class-location" className={labelClass}>Local (opcional)</label><input id="class-location" maxLength={255} value={draft.location} onChange={event => update({ location: event.target.value })} placeholder="Ex.: Bloco B · sala 204 ou aula online" className={fieldClass} /></div>
        <p className="text-xs text-graphite">Limite de 366 dias e 260 aulas por grade. Feriados não são removidos automaticamente; exclua ou ajuste a ocorrência no calendário.</p>
      </fieldset>
      {dates.length > 0 && <p aria-live="polite" className="mt-4 p-3 border border-border bg-surface-muted rounded-md text-sm text-ink"><strong>{dates.length} aulas</strong> serão criadas. Primeira em {new Date(`${dates[0]}T12:00:00`).toLocaleDateString('pt-BR')}, última em {new Date(`${dates[dates.length - 1]}T12:00:00`).toLocaleDateString('pt-BR')}.</p>}
      {error && <p role="alert" className="text-danger text-sm mt-4">{error}</p>}
      <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" loading={busy}>Criar grade de aulas</Button></div>
    </form>
  </Modal>;
};
