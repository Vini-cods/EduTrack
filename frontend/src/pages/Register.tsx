import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterData>({ resolver: zodResolver(schema) });
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
  return (
    <AuthLayout variant="register" title="Seu semestre começa aqui." description="Conecte disciplinas, prazos e tempo de estudo em um só lugar." footer={<>Já tem uma conta? <Link to="/login" className="font-semibold text-crimson hover:underline">Retomar meus estudos</Link></>}>
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        {error && <p role="alert" className="border border-danger/30 bg-danger-soft text-danger rounded-md p-3 text-sm">{error}</p>}
        <fieldset disabled={isSubmitting} className="space-y-4">
          <div><label htmlFor="register-name" className="block text-sm font-medium mb-2">Seu nome</label><TextField id="register-name" autoComplete="name" icon={UserRound} placeholder="Como podemos chamar você?" error={errors.name?.message} {...register('name')} /></div>
          <div><label htmlFor="register-email" className="block text-sm font-medium mb-2">E-mail</label><TextField id="register-email" type="email" autoComplete="email" icon={Mail} placeholder="seu@email.com" error={errors.email?.message} {...register('email')} /></div>
          <div><label htmlFor="register-password" className="block text-sm font-medium mb-2">Senha</label><TextField id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" icon={Lock} aria-describedby="password-hint" error={errors.password?.message} {...register('password')} rightElement={<button type="button" onClick={() => setShowPassword(value => !value)} className="h-11 w-11 flex items-center justify-center text-graphite" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} /><p id="password-hint" className="mt-1.5 text-xs text-graphite">Use pelo menos 6 caracteres.</p></div>
          <div><label htmlFor="register-confirmation" className="block text-sm font-medium mb-2">Confirmar senha</label><TextField id="register-confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" icon={Lock} error={errors.confirmation?.message} {...register('confirmation')} /></div>
          <Button type="submit" size="lg" loading={isSubmitting} className="w-full" icon={<ArrowRight size={18} />}>{isSubmitting ? 'Criando conta…' : 'Criar conta'}</Button>
        </fieldset>
      </form>
    </AuthLayout>
  );
};
