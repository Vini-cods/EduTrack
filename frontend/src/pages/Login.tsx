import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AuthLayout } from '../components/AuthLayout';
import { AuthIdentitySummary } from '../components/auth/AuthIdentitySummary';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { accountPasswordError } from '../lib/password';

const schema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().superRefine((value, context) => {
    const message = accountPasswordError(value);
    if (message) context.addIssue({ code: 'custom', message });
  }),
});
type LoginData = z.infer<typeof schema>;
export const Login = () => {
  const { login } = useAuth();
  const { preference } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState<'identity' | 'password'>('identity');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const lock = useRef(false);
  const { register, handleSubmit, trigger, setFocus, getValues, formState: { errors, isSubmitting } } = useForm<LoginData>({
    resolver: zodResolver(schema), mode: 'onTouched', shouldUnregister: false,
    defaultValues: { email: '', password: '' },
  });
  const emailInput = register('email');
  const passwordInput = register('password');
  useEffect(() => { setFocus(step === 'identity' ? 'email' : 'password'); }, [step, setFocus]);
  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'));
  const changeEmail = () => {
    setError('');
    setCapsLock(false);
    setShowPassword(false);
    setStep('identity');
  };
  const submit = async (data: LoginData) => {
    if (lock.current) return;
    lock.current = true;
    setError('');
    try {
      await login(data, preference);
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(axios.isAxiosError(cause) && cause.response?.status === 401
        ? 'E-mail ou senha incorretos. Confira os dados e tente novamente.'
        : 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.');
    } finally { lock.current = false; }
  };
  const submitStep = async (event: FormEvent<HTMLFormElement>) => {
    if (step === 'password') { await handleSubmit(submit)(event); return; }
    event.preventDefault();
    if (await trigger('email', { shouldFocus: true })) setStep('password');
  };
  return (
    <AuthLayout title={step === 'identity' ? 'Login' : 'Digite sua senha'} description={step === 'identity' ? 'Bem-vindo(a) ao seu portal acadêmico.' : 'Entre para acessar seu espaço de estudos.'} footer={<>Ainda não tem uma conta? <Link to="/register" className="font-semibold text-crimson hover:underline">Criar conta</Link></>}>
      <form onSubmit={submitStep} noValidate aria-busy={isSubmitting} className="space-y-5">
        {error && <p role="alert" className="border border-danger/30 bg-danger-soft text-danger rounded-md p-3 text-sm">{error}</p>}
        <fieldset key={step} disabled={isSubmitting} className="space-y-5">
          {step === 'identity' ? (
            <div><label htmlFor="login-email" className="block text-sm font-medium mb-2">E-mail</label><TextField id="login-email" type="email" autoComplete="email" icon={Mail} placeholder="seu@email.com" error={errors.email?.message} {...emailInput} /></div>
          ) : (
            <>
              <AuthIdentitySummary editLabel="Alterar e-mail" onEdit={changeEmail}>{getValues('email').trim()}</AuthIdentitySummary>
              <div>
                <div className="flex items-center justify-between mb-2 gap-3"><label htmlFor="login-password" className="text-sm font-medium">Senha</label><Link to="/forgot-password" className="text-xs text-crimson hover:underline">Esqueci minha senha</Link></div>
                <TextField id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" icon={Lock} error={errors.password?.message} {...passwordInput}
                  onKeyDown={trackCapsLock} onKeyUp={trackCapsLock}
                  onBlur={event => { void passwordInput.onBlur(event); setCapsLock(false); }}
                  aria-describedby={capsLock ? 'login-caps-lock' : undefined}
                  rightElement={<button type="button" onClick={() => setShowPassword(value => !value)} className="h-11 w-11 flex items-center justify-center text-graphite" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />
                {capsLock && <p id="login-caps-lock" role="status" className="mt-2 text-xs text-warning">Caps Lock está ativado.</p>}
              </div>
            </>
          )}
          <Button type="submit" loading={isSubmitting} className="w-full" size="lg" icon={<ArrowRight size={18} aria-hidden="true" />}>{step === 'identity' ? 'Avançar' : isSubmitting ? 'Entrando…' : 'Acessar'}</Button>
        </fieldset>
      </form>
    </AuthLayout>
  );
};
