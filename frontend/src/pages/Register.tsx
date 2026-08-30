import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import logo from '../assets/logo.jpg';

const registerSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type RegisterForm = z.infer<typeof registerSchema>;

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
      setError('Erro ao registrar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-dark via-primary to-primary-light relative overflow-hidden items-center justify-center">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/5" />
        <div className="absolute top-[40%] left-[60%] w-[200px] h-[200px] rounded-full bg-white/5" />

        <div className="relative z-10 text-center px-12">
          <img src={logo} alt="EduTrack" className="w-72 mx-auto mb-8 drop-shadow-2xl rounded-2xl" />
          <h2 className="text-white text-3xl font-bold mb-4">
            Junte-se ao EduTrack
          </h2>
          <p className="text-white/70 text-lg max-w-md mx-auto">
            Crie sua conta e comece a organizar seus estudos de forma
            inteligente e eficiente.
          </p>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-bg">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logo} alt="EduTrack" className="h-20 rounded-xl" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text">Criar Conta</h1>
            <p className="text-text-secondary mt-2">
              Preencha os dados para se registrar
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Nome
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  {...register('nome')}
                  type="text"
                  placeholder="Seu nome completo"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 bg-white text-text placeholder:text-gray-400 outline-none transition-all duration-200 ${
                    errors.nome
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-border focus:border-primary-light focus:ring-4 focus:ring-primary-100'
                  }`}
                />
              </div>
              {errors.nome && (
                <span className="text-red-500 text-xs mt-1 block">
                  {errors.nome.message}
                </span>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="seu@email.com"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 bg-white text-text placeholder:text-gray-400 outline-none transition-all duration-200 ${
                    errors.email
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-border focus:border-primary-light focus:ring-4 focus:ring-primary-100'
                  }`}
                />
              </div>
              {errors.email && (
                <span className="text-red-500 text-xs mt-1 block">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-3.5 rounded-xl border-2 bg-white text-text placeholder:text-gray-400 outline-none transition-all duration-200 ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-border focus:border-primary-light focus:ring-4 focus:ring-primary-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="text-red-500 text-xs mt-1 block">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold text-base hover:from-primary-dark hover:to-primary transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Registrando...
                </span>
              ) : (
                'Registrar'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Já tem uma conta?{' '}
            <Link
              to="/login"
              className="text-primary-light hover:text-primary font-semibold transition-colors"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
