import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input {...register('email')} className="w-full border p-2 rounded" type="email" />
          {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Senha</label>
          <input {...register('password')} className="w-full border p-2 rounded" type="password" />
          {errors.password && <span className="text-red-500 text-sm">{errors.password.message}</span>}
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Entrar</button>
        <p className="mt-4 text-center text-sm">Não tem uma conta? <Link to="/register" className="text-blue-600">Registre-se</Link></p>
      </form>
    </div>
  );
};
