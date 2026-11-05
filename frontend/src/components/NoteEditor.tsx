import { useRef, useState } from 'react';
import axios from 'axios';
import { Save, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { parseNoteTags, validateNoteInput } from '../lib/notes';
import { notesApi } from '../api/notes';
import type { Note, NoteInput } from '../types/notes';
import type { Subject, TaskWithSubject, StudySessionWithContext } from '../types';

interface NoteEditorProps {
  note?: Note;
  subjects: Subject[];
  tasks: TaskWithSubject[];
  sessions: StudySessionWithContext[];
  onClose: () => void;
  onSaved: (note: Note) => void;
}
const selectClass = 'w-full min-h-11 px-3 py-2 border border-border rounded-md bg-surface text-ink text-sm';

export function NoteEditor({ note, subjects, tasks, sessions, onClose, onSaved }: NoteEditorProps) {
  const initialOrigin = note?.study_session_id ? `session:${note.study_session_id}` : note?.task_id ? `task:${note.task_id}` : '';
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState(note?.tags.join(', ') || '');
  const [subjectId, setSubjectId] = useState(note?.subject_id?.toString() || '');
  const [origin, setOrigin] = useState(initialOrigin);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const dirty = title !== (note?.title || '') || content !== (note?.content || '') || tags !== (note?.tags.join(', ') || '') || subjectId !== (note?.subject_id?.toString() || '') || origin !== initialOrigin;
  const close = () => { if (lock.current) return; if (dirty) setDiscard(true); else onClose(); };
  const changeOrigin = (value: string) => {
    setOrigin(value);
    const [kind, rawId] = value.split(':');
    const linkedSubject = kind === 'task' ? tasks.find(task => task.id === Number(rawId))?.subject_id : kind === 'session' ? sessions.find(session => session.id === Number(rawId))?.subject_id : null;
    setSubjectId(linkedSubject?.toString() || '');
  };
  const linkedSession = origin.startsWith('session:') ? sessions.find(session => session.id === Number(origin.split(':')[1])) : undefined;
  const sourceId = origin ? Number(origin.split(':')[1]) : null;
  const lockedSubject = origin.startsWith('task:') || (origin.startsWith('session:')
    && Boolean(linkedSession?.subject_id || (origin === initialOrigin && note?.subject_id)));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    const data: NoteInput = {
      title: title.trim(), content, tags: parseNoteTags(tags), subject_id: subjectId ? Number(subjectId) : null,
      task_id: origin.startsWith('task:') ? sourceId : linkedSession?.task_id ?? (origin === initialOrigin ? note?.task_id ?? null : null),
      study_session_id: origin.startsWith('session:') ? sourceId : null,
    };
    const validation = validateNoteInput(data);
    if (validation) { setError(validation); return; }
    lock.current = true; setSaving(true); setError('');
    try { const saved = note ? await notesApi.update(note.id, data) : await notesApi.create(data); onSaved(saved); }
    catch (cause) {
      const detail = axios.isAxiosError<{ detail?: unknown }>(cause) ? cause.response?.data.detail : undefined;
      setError(typeof detail === 'string' ? detail : 'Não foi possível salvar. Seu texto foi mantido para tentar novamente.');
    } finally { lock.current = false; setSaving(false); }
  };
  return (
    <Modal open onClose={close} ariaLabel={note ? 'Editar nota' : 'Nova nota'} panelClassName="max-w-3xl">
      <div className="flex items-center justify-between p-5 border-b border-border"><h2 className="font-serif text-xl text-ink">{note ? 'Editar nota' : 'Nova nota'}</h2><button type="button" disabled={saving} onClick={close} aria-label="Fechar editor" className="h-11 w-11 flex items-center justify-center text-graphite rounded-md hover:bg-surface-muted"><X size={20} /></button></div>
      {discard ? <div className="p-6 space-y-5"><p className="text-ink">Descartar as alterações que ainda não foram salvas?</p><div className="flex flex-wrap gap-3 justify-end"><Button variant="outline" onClick={() => setDiscard(false)}>Continuar editando</Button><Button variant="danger" onClick={onClose}>Descartar alterações</Button></div></div> : (
        <form onSubmit={submit} className="p-5 space-y-5">
          {error && <p role="alert" className="p-3 bg-danger-soft text-danger rounded-md text-sm">{error}</p>}
          <fieldset disabled={saving} className="space-y-5">
            <div><label htmlFor="note-title" className="block text-sm text-ink font-medium mb-2">Título</label><TextField id="note-title" value={title} maxLength={255} required onChange={event => setTitle(event.target.value)} placeholder="O que você aprendeu?" /></div>
            <div><label htmlFor="note-content" className="block text-sm text-ink font-medium mb-2">Anotação</label><textarea id="note-content" value={content} maxLength={100000} onChange={event => setContent(event.target.value)} placeholder="Registre conceitos, dúvidas, resumos e próximos passos." className="w-full min-h-64 resize-y p-4 rounded-md border border-border bg-paper text-ink leading-relaxed" /><p className="text-xs text-graphite mt-1">Texto simples · {content.length.toLocaleString('pt-BR')} / 100.000 caracteres</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="note-origin" className="block text-sm text-ink font-medium mb-2">Vincular a</label><select id="note-origin" value={origin} onChange={event => changeOrigin(event.target.value)} className={selectClass}><option value="">Nenhuma tarefa ou sessão</option>{origin === initialOrigin && origin && !(origin.startsWith('task:') ? tasks.some(task => task.id === sourceId) : sessions.some(session => session.id === sourceId)) && <option value={origin}>Vínculo existente #{sourceId}</option>}<optgroup label="Tarefas">{tasks.map(task => <option key={task.id} value={`task:${task.id}`}>{task.title}</option>)}</optgroup><optgroup label="Sessões de estudo">{sessions.map(session => <option key={session.id} value={`session:${session.id}`}>{session.task_title || session.subject_name || 'Estudo livre'} · {new Date(session.started_at).toLocaleDateString('pt-BR')}</option>)}</optgroup></select></div>
              <div><label htmlFor="note-subject" className="block text-sm text-ink font-medium mb-2">Disciplina</label><select id="note-subject" value={subjectId} disabled={saving || lockedSubject} onChange={event => setSubjectId(event.target.value)} className={selectClass}><option value="">Sem disciplina</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>{lockedSubject && <p className="text-xs text-graphite mt-1">Definida pela tarefa ou sessão vinculada.</p>}</div>
            </div>
            <div><label htmlFor="note-tags" className="block text-sm text-ink font-medium mb-2">Tags</label><TextField id="note-tags" value={tags} onChange={event => setTags(event.target.value)} placeholder="revisão, prova, dúvida" aria-describedby="note-tags-hint" /><p id="note-tags-hint" className="text-xs text-graphite mt-1">Separadas por vírgulas. Até 10 tags de 32 caracteres.</p></div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border"><Button type="button" variant="outline" onClick={close}>Cancelar</Button><Button type="submit" loading={saving} icon={<Save size={16} />}>Salvar nota</Button></div>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
