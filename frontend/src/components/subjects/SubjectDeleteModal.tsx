import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import apiClient from '../../api/client';
import type { Subject } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props { subject: Subject | null; onClose: () => void; onDeleted: () => void }
export const SubjectDeleteModal: React.FC<Props> = ({ subject, onClose, onDeleted }) => {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setError(''); }, [subject]);
  const remove = async () => {
    if (!subject || busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError('');
    try {
      await apiClient.delete(`/subjects/${subject.id}`);
      toast.success('Disciplina excluída.');
      onDeleted();
    } catch { setError('Não foi possível excluir. A disciplina continua disponível. Tente novamente.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <Modal open={!!subject} onClose={() => { if (!busyRef.current) onClose(); }} ariaLabel="Excluir disciplina" panelClassName="max-w-lg">
    <div className="p-5 sm:p-6">
      <h2 className="font-serif text-xl font-semibold text-ink">Excluir {subject?.name}?</h2>
      <p className="mt-3 text-sm text-graphite">Esta ação remove a disciplina, suas tarefas, materiais, plano de ensino e avaliações com notas. Ela não pode ser desfeita.</p>
      <p className="mt-3 p-3 border border-border rounded-md bg-surface-muted text-sm text-graphite">As anotações do Notes, as sessões de estudo e os eventos do calendário serão preservados, sem vínculo com esta disciplina. Aulas recorrentes podem ser excluídas pelo cronograma antes de remover a disciplina.</p>
      {error && <p role="alert" className="text-danger text-sm mt-4">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button><Button variant="danger" loading={busy} icon={<Trash2 size={16} />} onClick={remove}>Excluir disciplina</Button></div>
    </div>
  </Modal>;
};
