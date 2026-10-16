import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { ArrowRight, Check, Eye, EyeOff, Lock } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { resetPassword } from '../api/authRecovery';
import { readPasswordResetToken, recoveryErrorMessage, redactPasswordResetUrl } from '../lib/authRecovery';
import { accountPasswordError } from '../lib/password';

const schema = z.object({
  password: z.string().superRefine((value, context) => {
    const message = accountPasswordError(value);
    if (message) context.addIssue({ code: 'custom', message });
  }),
  confirmation: z.string(),
}).refine(value => value.password === value.confirmation, {
  message: 'As senhas devem ser iguais.', path: ['confirmation'],
});
type ResetPasswordData = z.infer<typeof schema>;

export function ResetPassword() {
  const location = useLocation();
  const [token, setToken] = useState(() => readPasswordResetToken(location.hash, location.search));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [invalidLink, setInvalidLink] = useState(false);
  const [completed, setCompleted] = useState(false);
  const lock = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordData>({
    resolver: zodResolver(schema), mode: 'onTouched',
  });

  useEffect(() => {
    const safeUrl = redactPasswordResetUrl(location.pathname, location.search, location.hash);
    window.history.replaceState(window.history.state, '', safeUrl);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (completed || invalidLink) feedback.current?.focus();
  }, [completed, invalidLink]);

  async function submit({ password }: ResetPasswordData) {
    if (lock.current || !token || invalidLink) return;
    lock.current = true;
    setError('');
    try {
      await resetPassword(token, password);
      setToken(null);
      setCompleted(true);
    } catch (cause) {
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      setError(recoveryErrorMessage('reset', status));
      if (status === 400) { setInvalidLink(true); setToken(null); }
    } finally {
      lock.current = false;
    }
  }

  const needsNewLink = !completed && (!token || invalidLink);
  return (
    <AuthLayout
      variant="recovery"
      title={completed ? 'Senha atualizada.' : 'Um novo acesso.'}
      description={completed ? 'Você já pode retomar seu percurso acadêmico.' : 'Escolha uma nova senha para a sua conta.'}
      footer={<Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-crimson hover:underline">Voltar para entrar</Link>}
    >
      {completed ? (
        <div ref={feedback} tabIndex={-1} role="status" className="space-y-4 focus-visible:outline-crimson">
          <Check size={28} className="text-success" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-graphite">Sua senha foi alterada. Entre na sua conta com a nova senha para retomar suas tarefas e estudos.</p>
          <Link to="/login" className="inline-flex min-h-11 items-center gap-2 font-semibold text-crimson hover:underline">Entrar com a nova senha <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      ) : needsNewLink ? (
        <div ref={feedback} tabIndex={-1} className="space-y-4 focus-visible:outline-crimson">
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm leading-relaxed text-danger">{error || 'Este link de recuperação está incompleto. Peça um novo link para definir sua senha.'}</p>
          <Link to="/forgot-password" className="inline-flex min-h-11 items-center gap-2 font-semibold text-crimson hover:underline">Pedir um novo link <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(submit)} noValidate aria-busy={isSubmitting} className="space-y-5">
          {error && <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          <fieldset disabled={isSubmitting} className="space-y-5">
            <div>
              <label htmlFor="reset-password" className="mb-2 block text-sm font-medium">Nova senha</label>
              <TextField
                id="reset-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                icon={Lock} error={errors.password?.message} aria-describedby="reset-password-hint" {...register('password')}
                rightElement={<button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} className="flex h-11 w-11 items-center justify-center text-graphite">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
              />
              <p id="reset-password-hint" className="mt-1.5 text-xs text-graphite">Use pelo menos 6 caracteres e escolha uma senha que você não usa em outros serviços.</p>
            </div>
            <div>
              <label htmlFor="reset-confirmation" className="mb-2 block text-sm font-medium">Confirmar nova senha</label>
              <TextField id="reset-confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" icon={Lock} error={errors.confirmation?.message} {...register('confirmation')} />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting} icon={<ArrowRight size={18} aria-hidden="true" />}>{isSubmitting ? 'Atualizando senha…' : 'Salvar nova senha'}</Button>
          </fieldset>
        </form>
      )}
    </AuthLayout>
  );
}
