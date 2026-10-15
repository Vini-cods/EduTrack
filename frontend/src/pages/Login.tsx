import { useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';

const schema = z.object({ email: z.string().trim().email('Informe um e-mail válido.'), password: z.string().min(6, 'Use pelo menos 6 caracteres.') });
type LoginData = z.infer<typeof schema>;
export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const lock = useRef(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({ resolver: zodResolver(schema), mode: 'onTouched' });
  const emailInput = register('email');
  const passwordInput = register('password');
  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'));
  const submit = async (data: LoginData) => {
    if (lock.current) return;
    lock.current = true;
    setError('');
    try {
      await login(data);
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(axios.isAxiosError(cause) && cause.response?.status === 401
        ? 'E-mail ou senha incorretos. Confira os dados e tente novamente.'
        : 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.');
    } finally { lock.current = false; }
  };
  return (
    <AuthLayout title="Seu próximo passo." description="Entre para retomar suas tarefas, aulas e estudos." footer={<>Primeira vez por aqui? <Link to="/register" className="font-semibold text-crimson hover:underline">Criar minha conta</Link></>}>
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
        {error && <p role="alert" className="border border-danger/30 bg-danger-soft text-danger rounded-md p-3 text-sm">{error}</p>}
        <fieldset disabled={isSubmitting} className="space-y-5">
          <div><label htmlFor="login-email" className="block text-sm font-medium mb-2">E-mail</label><TextField id="login-email" type="email" autoComplete="email" icon={Mail} placeholder="seu@email.com" error={errors.email?.message} {...emailInput} /></div>
          <div>
            <div className="flex items-center justify-between mb-2 gap-3"><label htmlFor="login-password" className="text-sm font-medium">Senha</label><Link to="/forgot-password" className="text-xs text-crimson hover:underline">Esqueci minha senha</Link></div>
            <TextField id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" icon={Lock} error={errors.password?.message} {...passwordInput}
              onKeyDown={trackCapsLock} onKeyUp={trackCapsLock}
              onBlur={event => { void passwordInput.onBlur(event); setCapsLock(false); }}
              aria-describedby={capsLock ? 'login-caps-lock' : undefined}
              rightElement={<button type="button" onClick={() => setShowPassword(value => !value)} className="h-11 w-11 flex items-center justify-center text-graphite" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />
            {capsLock && <p id="login-caps-lock" role="status" className="mt-2 text-xs text-warning">Caps Lock está ativado.</p>}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full" size="lg" icon={<ArrowRight size={18} />}>{isSubmitting ? 'Abrindo seu espaço…' : 'Entrar no meu espaço'}</Button>
        </fieldset>
      </form>
    </AuthLayout>
  );
};
