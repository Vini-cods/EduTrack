import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props { open: boolean; onKeep: () => void; onDiscard: () => void }

export function DiscardAcademicChangesModal({ open, onKeep, onDiscard }: Props) {
  return <Modal open={open} onClose={onKeep} ariaLabel="Descartar alterações não salvas" panelClassName="max-w-md">
    <div className="p-5 sm:p-6">
      <h2 className="font-serif text-xl font-semibold text-ink">Descartar suas alterações?</h2>
      <p className="mt-3 text-sm leading-relaxed text-graphite">Você ainda não salvou este formulário. Pode continuar editando ou descartar o rascunho.</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onKeep}>Continuar editando</Button>
        <Button variant="danger" onClick={onDiscard}>Descartar alterações</Button>
      </div>
    </div>
  </Modal>;
}
