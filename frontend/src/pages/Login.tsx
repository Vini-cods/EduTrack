import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn, UserCircle } from 'lucide-react';
import logo from '../assets/logo.png';

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
    <div className="min-h-screen flex bg-gray-50/50">
      {/* Left Side - Brand / Info (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-white flex-col justify-between p-12 border-r border-gray-100 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        
        <div className="relative z-10">
          <img src={logo} alt="EduTrack Logo" className="h-10 mb-16" />
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            O seu painel <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light">
              definitivo de estudos
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-md leading-relaxed">
            Acompanhe suas tarefas, avalie seu progresso e conquiste suas metas acadêmicas de forma inteligente.
          </p>
        </div>

        {/* Floating cards decorative */}
        <div className="relative z-10 hidden xl:block mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 max-w-xs transform -rotate-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <div className="text-sm font-semibold text-gray-800">Tarefa Concluída</div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full w-3/4 mb-2" />
            <div className="h-2 bg-gray-100 rounded-full w-1/2" />
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 max-w-xs transform translate-x-12 -translate-y-4 rotate-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                <div className="w-3 h-3 bg-primary rounded-full" />
              </div>
              <div className="text-sm font-semibold text-gray-800">Física Quant.</div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logo} alt="EduTrack" className="h-10" />
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo de volta</h2>
            <p className="text-gray-500">Insira suas credenciais para acessar sua conta</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm animate-fade-in flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="seu@email.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 ${
                    errors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'
                  }`}
                />
              </div>
              {errors.email && (
                <span className="text-red-500 text-xs mt-1.5 block">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
                >
                  Esqueci a senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="text-red-500 text-xs mt-1.5 block">
                  {errors.password.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || isGuestLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-all duration-200 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <LoaderIcon />
              ) : (
                <>
                  <LogIn size={18} />
                  Entrar
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center text-gray-300">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500 font-medium">ou</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          <button
            onClick={handleGuestLogin}
            disabled={isLoading || isGuestLoading}
            className="w-full flex justify-center items-center gap-2 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGuestLoading ? (
              <LoaderIcon className="text-gray-500" />
            ) : (
              <>
                <UserCircle size={20} className="text-gray-500" />
                Entrar como Visitante
              </>
            )}
          </button>

          <p className="mt-8 text-center text-sm text-gray-500">
            Ainda não possui conta?{' '}
            <Link
              to="/register"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Criar uma conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const LoaderIcon = ({ className = "text-white" }: { className?: string }) => (
  <svg className={`animate-spin h-5 w-5 ${className}`} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);
