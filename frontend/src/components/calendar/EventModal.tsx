import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trash2, Repeat, Link2, Timer } from 'lucide-react';
import apiClient from '../../api/client';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CATEGORY_META, WEEKDAY_SHORT, toDatetimeLocalValue } from '../../lib/calendar';
import type { CalendarEventWithSubject, EventCategory, Subject } from '../../types';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onEditTask?: (taskId: number) => void;
  subjects: Subject[];
  initialDate?: Date | null;
  event?: CalendarEventWithSubject | null;
}

interface FormValues {
  title: string;
  category: EventCategory;
  subject_id: string;
  start: string;
  end: string;
  location: string;
}

const CATEGORIES: EventCategory[] = ['aula', 'prova', 'trabalho', 'estudo', 'evento'];

export const EventModal: React.FC<EventModalProps> = ({
  open,
  onClose,
  onSaved,
  onDeleted,
  onEditTask,
  subjects,
  initialDate,
  event,
}) => {
  const navigate = useNavigate();
  const isEditing = !!event;
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [until, setUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const mutationInFlight = useRef(false);
  const [confirmingDelete, setConfirmingDelete] = useState<'single' | 'series' | null>(null);

  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    setConfirmingDelete(null);
    if (event) {
      const start = new Date(event.start_datetime);
      reset({
        title: event.title,
        category: event.category,
        subject_id: event.subject_id ? String(event.subject_id) : '',
        start: toDatetimeLocalValue(start),
        end: event.end_datetime ? toDatetimeLocalValue(new Date(event.end_datetime)) : '',
        location: event.location || '',
      });
      setIsRecurring(false); // recorrência só se configura na criação
    } else {
      const base = initialDate ? new Date(initialDate) : new Date();
      if (!initialDate) base.setMinutes(0, 0, 0);
      const end = new Date(base.getTime() + 60 * 60 * 1000);
      reset({
        title: '',
        category: 'evento',
        subject_id: '',
        start: toDatetimeLocalValue(base),
        end: toDatetimeLocalValue(end),
        location: '',
      });
      setIsRecurring(false);
      setRecurrenceType('weekly');
      setSelectedDays([base.getDay() === 0 ? 6 : base.getDay() - 1]);
      setUntil('');
    }
  }, [open, event, initialDate, reset]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const onSubmit = handleSubmit(async (values) => {
    if (mutationInFlight.current) return;
    if (!values.title.trim()) { toast.error('Informe um título para o evento.'); return; }
    if (values.end && new Date(values.end) <= new Date(values.start)) {
      toast.error('O fim precisa ser depois do início.'); return;
    }
    if (isRecurring && recurrenceType === 'weekly' && selectedDays.length === 0) {
      toast.error('Selecione ao menos um dia da semana para a recorrência.');
      return;
    }
    if (isRecurring && !until) {
      toast.error('Defina até quando o evento deve se repetir.');
      return;
    }

    mutationInFlight.current = true;
    setSaving(true);
    try {
      const payload = {
        title: values.title.trim(),
        category: values.category,
        subject_id: values.subject_id ? Number(values.subject_id) : null,
        location: values.location || null,
        start_datetime: values.start,
        end_datetime: values.end || null,
      };

      if (isEditing) {
        await apiClient.put(`/calendar-events/${event!.id}`, payload);
        toast.success('Evento atualizado.');
      } else {
        await apiClient.post('/calendar-events/', {
          ...payload,
          recurrence: isRecurring
            ? { type: recurrenceType, days_of_week: recurrenceType === 'weekly' ? selectedDays : undefined, until }
            : null,
        });
        toast.success(isRecurring ? 'Série de eventos criada.' : 'Evento criado.');
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível salvar o evento.');
    } finally {
      mutationInFlight.current = false;
      setSaving(false);
    }
  });

  const handleDelete = async (scope: 'single' | 'series') => {
    if (!event || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setSaving(true);
    try {
      if (scope === 'series' && event.recurrence_group_id) {
        await apiClient.delete(`/calendar-events/series/${event.recurrence_group_id}`);
        toast.success('Série excluída.');
      } else {
        await apiClient.delete(`/calendar-events/${event.id}`);
        toast.success('Evento excluído.');
      }
      onDeleted();
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível excluir.');
    } finally {
      mutationInFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { if (!saving) onClose(); }} ariaLabel={isEditing ? 'Editar evento' : 'Novo evento'} panelClassName="max-w-lg">
      <form onSubmit={onSubmit} className="p-6">
        <h2 className="font-serif text-xl font-semibold text-ink mb-5">{isEditing ? 'Editar evento' : 'Novo evento'}</h2>

        <fieldset disabled={saving} className="space-y-4">
          <div>
            <label htmlFor="calendar-event-title" className="block text-sm font-medium text-graphite mb-1.5">Título</label>
            <input
              id="calendar-event-title"
              {...register('title', { required: true })}
              placeholder="Ex.: Aula de Cálculo"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="calendar-event-category" className="block text-sm font-medium text-graphite mb-1.5">Categoria</label>
              <select
                id="calendar-event-category"
                {...register('category')}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="calendar-event-subject" className="block text-sm font-medium text-graphite mb-1.5">Disciplina</label>
              <select
                id="calendar-event-subject"
                {...register('subject_id')}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                <option value="">Nenhuma</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="calendar-event-start" className="block text-sm font-medium text-graphite mb-1.5">Início</label>
              <input
                id="calendar-event-start"
                type="datetime-local"
                {...register('start', { required: true })}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="calendar-event-end" className="block text-sm font-medium text-graphite mb-1.5">Fim (opcional)</label>
              <input
                id="calendar-event-end"
                type="datetime-local"
                {...register('end')}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="calendar-event-location" className="block text-sm font-medium text-graphite mb-1.5">Local (opcional)</label>
            <input
              id="calendar-event-location"
              {...register('location')}
              placeholder="Ex.: Sala 204"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
          </div>

          {!isEditing && (
            <div className="pt-1 border-t border-border">
              <label className="flex items-center gap-2.5 py-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded accent-crimson cursor-pointer"
                />
                <Repeat size={15} className="text-graphite" />
                <span className="text-sm font-medium text-ink">Repetir evento</span>
              </label>

              {isRecurring && (
                <div className="space-y-3 pl-1 pb-1 animate-scale-in">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRecurrenceType('weekly')}
                      className={`flex-1 text-sm py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        recurrenceType === 'weekly' ? 'bg-navy text-white border-navy' : 'border-border text-graphite'
                      }`}
                    >
                      Semanal
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecurrenceType('daily')}
                      className={`flex-1 text-sm py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        recurrenceType === 'daily' ? 'bg-navy text-white border-navy' : 'border-border text-graphite'
                      }`}
                    >
                      Diária
                    </button>
                  </div>

                  {recurrenceType === 'weekly' && (
                    <div className="flex gap-1.5 flex-wrap">
                      {WEEKDAY_SHORT.map((label, i) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleDay(i)}
                          className={`w-10 h-9 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            selectedDays.includes(i)
                              ? 'bg-crimson text-white border-crimson'
                              : 'border-border text-graphite hover:bg-surface-muted'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <label htmlFor="calendar-event-until" className="block text-sm font-medium text-graphite mb-1.5">Repetir até</label>
                    <input
                      id="calendar-event-until"
                      type="date"
                      value={until}
                      onChange={(e) => setUntil(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {isEditing && event?.task_id && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted flex items-center gap-1.5">
                <Link2 size={12} /> {event.category === 'estudo' ? 'Sessão do objetivo' : 'Tarefa vinculada'}: <span className="text-graphite font-medium">{event.task_title}</span>
              </p>
              {onEditTask && <button type="button" onClick={() => onEditTask(event.task_id!)} className="text-xs font-medium text-crimson hover:text-crimson-dark cursor-pointer">Editar tarefa</button>}
              <button
                type="button"
                onClick={() => navigate(`/study/focus?task_id=${event.task_id}`)}
                className="text-xs font-medium text-crimson hover:text-crimson-dark inline-flex items-center gap-1 cursor-pointer"
              >
                <Timer size={12} /> Iniciar foco
              </button>
            </div>
          )}

          {isEditing && event?.recurrence_group_id && (
            <p className="text-xs text-muted flex items-center gap-1.5">
              <Repeat size={12} /> Parte de uma série recorrente.
            </p>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-border">
          <div>
            {isEditing &&
              (confirmingDelete ? (
                <div className="flex flex-wrap items-center gap-2" role="alert">
                  <span className="text-xs text-graphite">{confirmingDelete === 'series' ? 'Excluir todas as ocorrências desta série, incluindo passadas?' : 'Excluir apenas este evento?'} Esta ação não pode ser desfeita.</span>
                  {event?.task_id && <span className="text-xs text-muted">A tarefa vinculada e seu prazo serão preservados.</span>}
                  <button
                    type="button"
                    onClick={() => handleDelete(confirmingDelete)}
                    disabled={saving}
                    className="text-xs font-medium text-danger hover:text-danger/80 cursor-pointer"
                  >
                    Sim, excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(null)}
                    disabled={saving}
                    className="text-xs text-muted hover:text-graphite cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : event?.recurrence_group_id ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete('single')}
                    className="text-xs font-medium text-danger hover:text-danger/80 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Excluir esta
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete('series')}
                    className="text-xs font-medium text-danger hover:text-danger/80 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Excluir série
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete('single')}
                  className="text-xs font-medium text-danger hover:text-danger/80 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} /> Excluir
                </button>
              ))}
          </div>
          <div className="flex gap-2.5">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
