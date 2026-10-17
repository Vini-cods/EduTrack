import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function AuthHelp() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="auth-portal-help" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <span>Como acessar</span><CircleHelp size={17} aria-hidden="true" />
    </button>
    <Modal open={open} onClose={() => setOpen(false)} ariaLabel="Como acessar o EduTrack" panelClassName="max-w-lg">
      <div className="p-5 sm:p-7">
        <h2 className="font-serif text-2xl text-ink">Como acessar o EduTrack</h2>
        <ol className="mt-5 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-graphite marker:text-crimson">
          <li>Informe o e-mail da sua conta e selecione <strong>Avançar</strong>.</li>
          <li>Digite sua senha e selecione <strong>Acessar</strong> para abrir seu dashboard.</li>
          <li>Se ainda não tem uma conta, escolha <strong>Criar conta</strong>. Primeiro informe seus dados e depois defina uma senha.</li>
        </ol>
        <p className="mt-5 text-sm leading-relaxed text-graphite">Esqueceu a senha? <Link to="/forgot-password" onClick={() => setOpen(false)} className="font-semibold text-crimson underline underline-offset-4">Peça um link de recuperação</Link> pelo seu e-mail cadastrado.</p>
        <div className="mt-6 flex justify-end"><Button onClick={() => setOpen(false)}>Entendi</Button></div>
      </div>
    </Modal>
  </>;
}
