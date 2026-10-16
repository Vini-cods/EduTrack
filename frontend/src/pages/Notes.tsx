import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookOpen, Pencil, Plus, Search, StickyNote, Timer, Trash2 } from 'lucide-react';
import apiClient from '../api/client';
import { notesApi } from '../api/notes';
import { useNotes } from '../hooks/useNotes';
import { noteExcerpt } from '../lib/notes';
import type { Note } from '../types/notes';
import type { Subject, TaskWithSubject, StudySessionWithContext } from '../types';
import { NoteEditor } from '../components/NoteEditor';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { RowSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';

interface NoteContext { subjects: Subject[]; tasks: TaskWithSubject[]; sessions: StudySessionWithContext[] }
export function Notes() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(params.get('subject_id') || '');
  const [selectedId, setSelectedId] = useState<number | null>(Number(params.get('highlight')) || null);
  const { notes, loading, error, reload } = useNotes(query, subjectFilter);
  const [context, setContext] = useState<NoteContext | null>(null);
  const [contextError, setContextError] = useState('');
  const [contextRevision, setContextRevision] = useState(0);
  const [editor, setEditor] = useState<{ note?: Note } | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [removing, setRemoving] = useState(false);
  const deletionLock = useRef(false);
  const articleRef = useRef<HTMLElement>(null);
  const requestedId = Number(params.get('highlight'));
  const hasRequestedNote = Number.isSafeInteger(requestedId) && requestedId > 0;
  const selected = notes.find(note => note.id === selectedId) || (hasRequestedNote ? undefined : notes[0]);

  useEffect(() => {
    const id = Number(params.get('highlight'));
    if (!Number.isSafeInteger(id) || id <= 0) return;
    setSelectedId(id);
    setQuery('');
    setSubjectFilter('');
  }, [params]);

  useEffect(() => {
    if (!hasRequestedNote || loading || selected?.id !== requestedId) return;
    articleRef.current?.focus({ preventScroll: true });
    articleRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    const next = new URLSearchParams(params); next.delete('highlight');
    setParams(next, { replace: true });
  }, [hasRequestedNote, requestedId, loading, selected, params, setParams]);

  useEffect(() => {
    const controller = new AbortController();
    setContextError('');
    Promise.all([
      apiClient.get<Subject[]>('/subjects/', { signal: controller.signal }),
      apiClient.get<TaskWithSubject[]>('/tasks/', { signal: controller.signal }),
      apiClient.get<StudySessionWithContext[]>('/study-sessions/', { signal: controller.signal }),
    ]).then(([subjects, tasks, sessions]) => { if (!controller.signal.aborted) setContext({ subjects: subjects.data, tasks: tasks.data, sessions: sessions.data }); })
      .catch(() => { if (!controller.signal.aborted) setContextError('Não foi possível carregar os vínculos acadêmicos.'); });
    return () => controller.abort();
  }, [contextRevision]);

  useEffect(() => {
    if (params.get('new') !== '1' || !context) return;
    setEditor({});
    const next = new URLSearchParams(params); next.delete('new');
    setParams(next, { replace: true });
  }, [params, context, setParams]);

  const saved = (note: Note) => {
    setEditor(null); setSelectedId(note.id); reload();
    toast.success('Nota salva.');
  };
  const remove = async () => {
    if (!deleting || deletionLock.current) return;
    deletionLock.current = true; setRemoving(true);
    try { await notesApi.remove(deleting.id); setDeleting(null); setSelectedId(null); reload(); toast.success('Nota excluída.'); }
    catch { toast.error('Não foi possível excluir. Tente novamente.'); }
    finally { deletionLock.current = false; setRemoving(false); }
  };
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SectionHeader title="Notas" description="Conceitos, dúvidas e descobertas no contexto dos seus estudos." action={<Button disabled={!context} onClick={() => setEditor({})} icon={<Plus size={16} />}>Nova nota</Button>} />
      {contextError && <div role="alert" className="mt-5 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-ink flex flex-wrap gap-3 items-center">{contextError}<Button size="sm" variant="outline" onClick={() => setContextRevision(value => value + 1)}>Tentar novamente</Button></div>}
      <div className="mt-6 mb-5 flex flex-wrap gap-3">
        <label className="relative flex-1 min-w-48 max-w-lg"><span className="sr-only">Buscar notas</span><Search size={17} className="absolute left-3 top-3.5 text-muted" aria-hidden="true" /><input type="search" value={query} maxLength={200} onChange={event => setQuery(event.target.value)} placeholder="Buscar por título, conteúdo ou tag…" className="w-full min-h-11 pl-10 pr-3 py-2 border border-border rounded-md bg-surface text-ink text-sm" /></label>
        <label><span className="sr-only">Filtrar por disciplina</span><select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="max-w-full min-h-11 px-3 py-2 border border-border rounded-md bg-surface text-ink text-sm"><option value="">Todas as disciplinas</option>{context?.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
      </div>
      {error ? <div role="alert" className="p-8 border border-border rounded-md bg-surface text-ink space-y-4"><p>{error}</p><Button variant="outline" onClick={reload}>Tentar novamente</Button></div> : (
        <div aria-busy={loading} className="border border-border bg-surface rounded-lg overflow-hidden">
          {loading ? <div aria-label="Carregando notas">{[0, 1, 2].map(index => <RowSkeleton key={index} />)}</div> : notes.length === 0 ? <EmptyState icon={StickyNote} title={query || subjectFilter ? 'Nenhuma nota encontrada' : 'O aprendizado merece um registro'} description={query || subjectFilter ? 'Ajuste a busca ou os filtros para encontrar suas anotações.' : 'Crie sua primeira nota e associe-a a uma disciplina, tarefa ou sessão de estudo.'} action={query || subjectFilter ? { label: 'Limpar filtros', onClick: () => { setQuery(''); setSubjectFilter(''); } } : context ? { label: 'Criar nota', onClick: () => setEditor({}) } : undefined} /> : (
            <div className="grid lg:grid-cols-[320px_1fr]">
              <nav aria-label="Suas notas" className="border-b lg:border-b-0 lg:border-r border-border max-h-72 lg:max-h-[68vh] overflow-y-auto">
                <p className="text-xs text-graphite px-4 py-3 border-b border-border">{notes.length} {notes.length === 1 ? 'nota' : 'notas'}</p>
                {notes.map(note => <button key={note.id} onClick={() => setSelectedId(note.id)} aria-current={selected?.id === note.id ? 'true' : undefined} className={`w-full text-left px-4 py-4 border-b border-border last:border-b-0 transition-colors hover:bg-surface-muted ${selected?.id === note.id ? 'bg-crimson-soft border-l-2 border-l-crimson' : 'border-l-2 border-l-transparent'}`}><span className="block text-sm font-semibold text-ink break-words">{note.title}</span><span className="block mt-1 text-xs text-graphite">{note.subject_name || 'Sem disciplina'}</span><span className="block mt-2 text-xs text-graphite leading-relaxed break-words">{noteExcerpt(note.content, 100) || 'Sem conteúdo'}</span>{note.tags.length > 0 && <span className="block mt-2 text-xs text-crimson break-words">{note.tags.slice(0, 3).map(tag => '#' + tag).join(' ')}{note.tags.length > 3 ? ' +' + (note.tags.length - 3) : ''}</span>}</button>)}
              </nav>
              {selected ? <article ref={articleRef} tabIndex={-1} aria-label={selected.title} className="p-5 sm:p-8 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5"><div className="min-w-0"><p className="text-xs text-graphite mb-2">Atualizada em {new Date(selected.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p><h2 className="font-serif text-2xl text-ink break-words">{selected.title}</h2></div><div className="flex gap-1"><Button variant="ghost" size="sm" disabled={!context} aria-label="Editar nota" onClick={() => setEditor({ note: selected })} className="min-h-11" icon={<Pencil size={16} />}>Editar</Button><Button variant="ghost" size="sm" aria-label="Excluir nota" onClick={() => setDeleting(selected)} className="text-danger min-h-11" icon={<Trash2 size={16} />} /></div></div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-graphite border-b border-border pb-4 mb-6">
                  {selected.subject_id && <Link className="inline-flex items-center gap-1.5 hover:text-crimson" to={`/subjects/${selected.subject_id}`}><BookOpen size={14} />{selected.subject_name || 'Disciplina'}</Link>}
                  {selected.task_id && <Link className="hover:text-crimson" to={`/tasks?highlight=${selected.task_id}`}>Ver tarefa vinculada</Link>}
                  {selected.study_session_id && <Link className="inline-flex items-center gap-1.5 hover:text-crimson" to="/study/focus"><Timer size={14} />Sessão #{selected.study_session_id}</Link>}
                  {!selected.subject_id && !selected.task_id && !selected.study_session_id && <span>Nota livre</span>}
                </div>
                <div className="whitespace-pre-wrap break-words leading-relaxed text-ink text-[15px] min-h-40">{selected.content || <span className="text-graphite">Esta nota ainda não tem conteúdo.</span>}</div>
                {selected.tags.length > 0 && <div className="flex flex-wrap gap-2 mt-8 pt-5 border-t border-border">{selected.tags.map(tag => <button key={tag} onClick={() => setQuery(tag)} className="px-2 py-1 text-xs rounded bg-surface-muted text-graphite hover:text-crimson">#{tag}</button>)}</div>}
              </article> : <p role="status" className="p-5 sm:p-8 text-sm text-graphite">A nota solicitada não está disponível. Escolha outra nota na lista.</p>}
            </div>
          )}
        </div>
      )}
      {editor && context && <NoteEditor key={editor.note?.id || 'new'} {...context} note={editor.note} onClose={() => setEditor(null)} onSaved={saved} />}
      <Modal open={Boolean(deleting)} onClose={() => { if (!deletionLock.current) setDeleting(null); }} ariaLabel="Excluir nota" panelClassName="max-w-md">
        <div className="p-6"><h2 className="font-serif text-xl text-ink">Excluir esta nota?</h2><p className="text-sm text-graphite mt-3 break-words">“{deleting?.title}” será excluída permanentemente.</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={removing} onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="danger" loading={removing} onClick={remove}>Excluir nota</Button></div></div>
      </Modal>
    </div>
  );
}
