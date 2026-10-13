import { useRef, useState } from 'react';
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
  const lock = useRef(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({ resolver: zodResolver(schema) });
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
    <AuthLayout title="Bem-vindo de volta." description="Entre para organizar seu próximo passo." footer={<>Ainda não tem uma conta? <Link to="/register" className="font-semibold text-crimson hover:underline">Criar conta</Link></>}>
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
        {error && <p role="alert" className="border border-danger/30 bg-danger-soft text-danger rounded-md p-3 text-sm">{error}</p>}
        <fieldset disabled={isSubmitting} className="space-y-5">
          <div><label htmlFor="login-email" className="block text-sm font-medium mb-2">E-mail</label><TextField id="login-email" type="email" autoComplete="email" icon={Mail} placeholder="seu@email.com" error={errors.email?.message} {...register('email')} /></div>
          <div>
            <div className="flex items-center justify-between mb-2 gap-3"><label htmlFor="login-password" className="text-sm font-medium">Senha</label><Link to="/forgot-password" className="text-xs text-crimson hover:underline">Esqueci minha senha</Link></div>
            <TextField id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" icon={Lock} error={errors.password?.message} {...register('password')} rightElement={<button type="button" onClick={() => setShowPassword(value => !value)} className="h-10 w-10 flex items-center justify-center text-graphite" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full" size="lg" icon={<ArrowRight size={18} />}>{isSubmitting ? 'Entrando…' : 'Entrar'}</Button>
        </fieldset>
      </form>
    </AuthLayout>
  );
};
