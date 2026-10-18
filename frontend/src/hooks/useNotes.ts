import { useCallback, useEffect, useRef, useState } from 'react';
import { notesApi } from '../api/notes';
import type { Note } from '../types/notes';

export function useNotes(query: string, subjectId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [pagination, setPagination] = useState({ query, subjectId, index: 0 });
  const page = pagination.query === query && pagination.subjectId === subjectId ? pagination.index : 0;
  const setPage = useCallback((index: number) => setPagination({ query, subjectId, index }), [query, subjectId]);
  useEffect(() => { setPagination({ query, subjectId, index: 0 }); }, [query, subjectId]);
  const [total, setTotal] = useState(0);
  const request = useRef(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const version = ++request.current;
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const data = await notesApi.page(query.trim(), subjectId, page, controller.signal);
        if (version === request.current && !controller.signal.aborted) {
          // A deletion can empty the last page; return to the nearest valid one.
          if (page > 0 && data.items.length === 0) { setPage(Math.max(0, Math.ceil(data.total / 20) - 1)); return; }
          setNotes(data.items); setTotal(data.total);
        }
      } catch {
        if (!controller.signal.aborted && version === request.current) { setNotes([]); setError('Não foi possível carregar suas notas. Tente novamente.'); }
      } finally {
        if (!controller.signal.aborted && version === request.current) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, subjectId, page, setPage, revision]);
  return { notes, loading, error, reload, page, setPage, total };
}
