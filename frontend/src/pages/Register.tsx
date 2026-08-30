import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const registerSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Erro ao registrar');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Registrar</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input {...register('nome')} className="w-full border p-2 rounded" type="text" />
          {errors.nome && <span className="text-red-500 text-sm">{errors.nome.message}</span>}
        </div>
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
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Registrar</button>
        <p className="mt-4 text-center text-sm">Já tem uma conta? <Link to="/login" className="text-blue-600">Faça login</Link></p>
      </form>
    </div>
  );
};
