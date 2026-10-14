import { useCallback, useEffect, useRef, useState } from 'react';
import { notesApi } from '../api/notes';
import type { Note } from '../types/notes';

export function useNotes(query: string, subjectId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const version = ++request.current;
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const data = await notesApi.list(query.trim(), subjectId, controller.signal);
        if (version === request.current && !controller.signal.aborted) setNotes(data);
      } catch {
        if (!controller.signal.aborted && version === request.current) { setNotes([]); setError('Não foi possível carregar suas notas. Tente novamente.'); }
      } finally {
        if (!controller.signal.aborted && version === request.current) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, subjectId, revision]);
  return { notes, loading, error, reload };
}
