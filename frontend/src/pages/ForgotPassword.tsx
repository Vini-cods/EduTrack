import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Mail, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { requestPasswordRecovery } from '../api/authRecovery';
import { recoveryErrorMessage } from '../lib/authRecovery';

const schema = z.object({ email: z.string().trim().email('Informe um e-mail válido.') });
type ForgotPasswordData = z.infer<typeof schema>;

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const focusEmail = useRef(false);
  const { register, handleSubmit, setFocus, formState: { errors, isSubmitting } } = useForm<ForgotPasswordData>({
    resolver: zodResolver(schema), mode: 'onTouched',
  });

  useEffect(() => {
    if (sent) feedback.current?.focus();
    else if (focusEmail.current) { setFocus('email'); focusEmail.current = false; }
  }, [sent, setFocus]);

  async function submit({ email }: ForgotPasswordData) {
    if (lock.current) return;
    lock.current = true;
    setError('');
    try {
      await requestPasswordRecovery(email);
      setSent(true);
    } catch (cause) {
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      setError(recoveryErrorMessage('request', status));
    } finally {
      lock.current = false;
    }
  }

  return (
    <AuthLayout
      variant="recovery"
      title={sent ? 'Confira seu e-mail.' : 'Recupere seu acesso.'}
      description={sent ? 'Sua solicitação de recuperação foi recebida.' : 'Informe o e-mail da sua conta para pedir um link de recuperação.'}
      footer={<Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-crimson hover:underline">Voltar para entrar</Link>}
    >
      {sent ? (
        <div ref={feedback} tabIndex={-1} role="status" className="space-y-4 focus-visible:outline-crimson">
          <Mail size={28} className="text-crimson" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-graphite">Se houver uma conta ativa com esse e-mail, enviaremos as instruções para criar uma nova senha. Confira também o spam. O link tem validade limitada.</p>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-crimson hover:underline"
            onClick={() => { focusEmail.current = true; setSent(false); }}
          >Pedir outro link <ArrowRight size={17} aria-hidden="true" /></button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(submit)} noValidate aria-busy={isSubmitting} className="space-y-5">
          {error && <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          <fieldset disabled={isSubmitting} className="space-y-5">
            <div>
              <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium">E-mail da sua conta</label>
              <TextField id="recovery-email" type="email" autoComplete="email" icon={Mail} placeholder="seu@email.com" error={errors.email?.message} {...register('email')} />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting} icon={<ArrowRight size={18} aria-hidden="true" />}>{isSubmitting ? 'Enviando solicitação…' : 'Pedir link de recuperação'}</Button>
          </fieldset>
        </form>
      )}
    </AuthLayout>
  );
}
