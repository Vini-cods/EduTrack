import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { AuthIdentitySummary } from '../components/auth/AuthIdentitySummary';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { accountPasswordError } from '../lib/password';

const schema = z.object({
  name: z.string().trim().min(3, 'Informe pelo menos 3 caracteres.').max(255),
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().superRefine((value, context) => {
    const message = accountPasswordError(value);
    if (message) context.addIssue({ code: 'custom', message });
  }),
  confirmation: z.string(),
}).refine(data => data.password === data.confirmation, { message: 'As senhas devem ser iguais.', path: ['confirmation'] });
type RegisterData = z.infer<typeof schema>;
export const Register = () => {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'identity' | 'password'>('identity');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const { register, handleSubmit, trigger, setFocus, getValues, formState: { errors, isSubmitting } } = useForm<RegisterData>({
    resolver: zodResolver(schema), shouldUnregister: false,
    defaultValues: { name: '', email: '', password: '', confirmation: '' },
  });
  useEffect(() => { setFocus(step === 'identity' ? 'name' : 'password'); }, [step, setFocus]);
  const goBack = () => {
    setError('');
    setShowPassword(false);
    setStep('identity');
  };
  const submit = async ({ name, email, password }: RegisterData) => {
    if (lock.current) return;
    lock.current = true;
    setError('');
    try { await createAccount({ name, email, password }); navigate('/dashboard', { replace: true }); }
    catch (cause) {
      const detail = axios.isAxiosError<{ detail?: unknown }>(cause) ? cause.response?.data.detail : undefined;
      setError(typeof detail === 'string' ? detail : 'Não foi possível criar sua conta. Verifique sua conexão e tente novamente.');
    } finally { lock.current = false; }
  };
  const submitStep = async (event: FormEvent<HTMLFormElement>) => {
    if (step === 'password') { await handleSubmit(submit)(event); return; }
    event.preventDefault();
    if (await trigger(['name', 'email'], { shouldFocus: true })) setStep('password');
  };
  return (
    <AuthLayout variant="register" title={step === 'identity' ? 'Cadastro' : 'Crie sua senha'} description={step === 'identity' ? 'Crie sua conta para organizar sua vida acadêmica.' : 'Escolha uma senha para proteger sua conta.'} footer={<>Já tem uma conta? <Link to="/login" className="font-semibold text-crimson hover:underline">Entrar</Link></>}>
      <form onSubmit={submitStep} noValidate aria-busy={isSubmitting} className="space-y-4">
        {error && <p role="alert" className="border border-danger/30 bg-danger-soft text-danger rounded-md p-3 text-sm">{error}</p>}
        <fieldset key={step} disabled={isSubmitting} className="space-y-4">
          {step === 'identity' ? (
            <>
              <div><label htmlFor="register-name" className="block text-sm font-medium mb-2">Seu nome</label><TextField id="register-name" autoComplete="name" icon={UserRound} placeholder="Como podemos chamar você?" error={errors.name?.message} {...register('name')} /></div>
              <div><label htmlFor="register-email" className="block text-sm font-medium mb-2">E-mail</label><TextField id="register-email" type="email" autoComplete="email" icon={Mail} placeholder="seu@email.com" error={errors.email?.message} {...register('email')} /></div>
            </>
          ) : (
            <>
              <AuthIdentitySummary editLabel="Voltar" onEdit={goBack}>
                <p className="font-medium">{getValues('name').trim()}</p>
                <p className="text-graphite">{getValues('email').trim()}</p>
              </AuthIdentitySummary>
              <div><label htmlFor="register-password" className="block text-sm font-medium mb-2">Senha</label><TextField id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" icon={Lock} aria-describedby={errors.password ? undefined : 'password-hint'} error={errors.password?.message} {...register('password')} rightElement={<button type="button" onClick={() => setShowPassword(value => !value)} className="h-11 w-11 flex items-center justify-center text-graphite" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />{!errors.password && <p id="password-hint" className="mt-1.5 text-xs text-graphite">Use pelo menos 6 caracteres.</p>}</div>
              <div><label htmlFor="register-confirmation" className="block text-sm font-medium mb-2">Confirmar senha</label><TextField id="register-confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" icon={Lock} error={errors.confirmation?.message} {...register('confirmation')} /></div>
            </>
          )}
          <Button type="submit" size="lg" loading={isSubmitting} className="w-full" icon={<ArrowRight size={18} aria-hidden="true" />}>{step === 'identity' ? 'Avançar' : isSubmitting ? 'Criando conta…' : 'Criar conta'}</Button>
        </fieldset>
      </form>
    </AuthLayout>
  );
};
