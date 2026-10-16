import { useCallback, useEffect, useState } from 'react';
import { academicRecordsApi } from '../api/academicRecords';

function useSubjectResource<T>(subjectId: number, load: (id: number, signal?: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setData(null); setLoading(true); setError(false);
    load(subjectId, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [subjectId, load, revision]);

  return { data, loading, error, reload };
}

export const useSubjectSyllabus = (subjectId: number) => useSubjectResource(subjectId, academicRecordsApi.getSyllabus);
export const useSubjectAssessments = (subjectId: number) => useSubjectResource(subjectId, academicRecordsApi.getAssessments);
