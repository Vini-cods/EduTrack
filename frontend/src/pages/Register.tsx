import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';

const registerSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type RegisterForm = z.infer<typeof registerSchema>;

interface ApiError {
  response?: { data?: { detail?: string } };
}

export const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');
    try {
      await registerUser(data);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError((err as ApiError)?.response?.data?.detail || 'Erro ao registrar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Lado esquerdo — painel sólido navy (variação do painel do Login, mesma família visual) */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy relative overflow-hidden items-center justify-center">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/5" />
        <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] rounded-full bg-white/5" />

        <div className="relative z-10 text-center px-12">
          <Logo size="lg" inverted className="justify-center mb-10" />
          <h2 className="font-serif text-3xl font-semibold text-white mb-4">Junte-se ao EduTrack</h2>
          <p className="text-white/70 text-lg max-w-md mx-auto leading-relaxed">
            Crie sua conta e comece a organizar seus estudos de forma inteligente e eficiente.
          </p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size="md" />
          </div>

          <div className="text-center lg:text-left mb-8">
            <h1 className="font-serif text-3xl font-semibold text-ink">Criar conta</h1>
            <p className="text-graphite mt-2">Preencha os dados para se registrar</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger-soft border border-danger/20 text-danger text-sm animate-fade-in flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Nome</label>
              <TextField icon={User} type="text" placeholder="Seu nome completo" error={errors.name?.message} {...register('name')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Email</label>
              <TextField icon={Mail} type="email" placeholder="seu@email.com" error={errors.email?.message} {...register('email')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Senha</label>
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

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={isLoading}>
              Registrar
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-graphite">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-crimson hover:text-crimson-dark font-medium transition-colors">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
