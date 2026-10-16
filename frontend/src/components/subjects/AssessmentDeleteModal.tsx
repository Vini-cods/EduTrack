import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { academicRecordsApi } from '../../api/academicRecords';
import type { Assessment } from '../../types/academicRecords';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props { subjectId: number; assessment: Assessment | null; onClose: () => void; onDeleted: () => void }

export function AssessmentDeleteModal({ subjectId, assessment, onClose, onDeleted }: Props) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setError(''); }, [assessment]);

  async function remove() {
    if (!assessment || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await academicRecordsApi.removeAssessment(subjectId, assessment.id);
      toast.success('Avaliação excluída.');
      onDeleted();
    } catch { setError('Não foi possível excluir a avaliação. Tente novamente.'); }
    finally { lock.current = false; setBusy(false); }
  }

  return <Modal open={!!assessment} onClose={() => { if (!lock.current) onClose(); }} ariaLabel="Excluir avaliação" panelClassName="max-w-lg">
    <div className="p-5 sm:p-6">
      <h2 className="font-serif text-xl font-semibold text-ink">Excluir avaliação?</h2>
      <p className="mt-3 break-words text-sm leading-relaxed text-graphite">O registro de <strong className="text-ink">{assessment?.name}</strong> será excluído e a média parcial será recalculada. Essa ação não pode ser desfeita.</p>
      {assessment?.task_id != null && <p className="mt-3 text-sm text-graphite">A tarefa vinculada e seu prazo continuarão disponíveis.</p>}
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button><Button variant="danger" loading={busy} icon={<Trash2 size={16} aria-hidden="true" />} onClick={remove}>Excluir avaliação</Button></div>
    </div>
  </Modal>;
}
