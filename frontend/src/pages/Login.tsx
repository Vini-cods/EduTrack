import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn, UserCircle, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    try {
      await login(data);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Email ou senha incorretos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    setError('');
    try {
      await loginAsGuest();
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Erro ao entrar como visitante.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Lado esquerdo — identidade / decorativo (oculto no mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface flex-col justify-between p-12 border-r border-border relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />

        <div className="relative z-10">
          <Logo size="lg" className="mb-16" />
          <h1 className="font-serif text-4xl font-semibold text-ink tracking-tight leading-tight mb-6">
            O seu painel definitivo de estudos
          </h1>
          <p className="text-lg text-graphite max-w-md leading-relaxed">
            Acompanhe suas tarefas, avalie seu progresso e conquiste suas metas acadêmicas de forma inteligente.
          </p>
        </div>

        {/* Cards decorativos */}
        <div className="relative z-10 hidden xl:block mb-8">
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-border max-w-xs transform -rotate-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-success-soft flex items-center justify-center">
                <div className="w-3 h-3 bg-success rounded-full" />
              </div>
              <div className="text-sm font-semibold text-ink">Tarefa Concluída</div>
            </div>
            <div className="h-2 bg-surface-muted rounded-full w-3/4 mb-2" />
            <div className="h-2 bg-surface-muted rounded-full w-1/2" />
          </div>

          <div className="bg-surface p-5 rounded-xl shadow-soft border border-border max-w-xs transform translate-x-12 -translate-y-4 rotate-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-navy-soft flex items-center justify-center">
                <div className="w-3 h-3 bg-navy rounded-full" />
              </div>
              <div className="text-sm font-semibold text-ink">Física Quântica</div>
            </div>
            <div className="w-full bg-surface-muted rounded-full h-2">
              <div className="bg-navy h-2 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size="md" />
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="font-serif text-2xl font-semibold text-ink mb-2">Bem-vindo de volta</h2>
            <p className="text-graphite">Insira suas credenciais para acessar sua conta</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger-soft border border-danger/20 text-danger text-sm animate-fade-in flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Email</label>
              <TextField
                icon={Mail}
                type="email"
                placeholder="seu@email.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-graphite">Senha</label>
                <Link to="/forgot-password" className="text-sm text-crimson hover:text-crimson-dark font-medium transition-colors">
                  Esqueci a senha
                </Link>
              </div>
              <TextField
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted hover:text-graphite transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isLoading}
              disabled={isGuestLoading}
              icon={<LogIn size={18} />}
            >
              Entrar
            </Button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-4 text-sm text-muted font-medium">ou</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            loading={isGuestLoading}
            disabled={isLoading}
            icon={<UserCircle size={20} />}
            onClick={handleGuestLogin}
          >
            Entrar como Visitante
          </Button>

          <p className="mt-8 text-center text-sm text-graphite">
            Ainda não possui conta?{' '}
            <Link to="/register" className="text-crimson hover:text-crimson-dark font-medium transition-colors">
              Criar uma conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
