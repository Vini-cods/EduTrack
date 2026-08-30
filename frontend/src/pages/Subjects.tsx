import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { Subject } from '../types';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';

export const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { register, handleSubmit, reset } = useForm();

  const fetchSubjects = () => {
    apiClient.get('/subjects').then(res => setSubjects(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await apiClient.post('/subjects', data);
      reset();
      fetchSubjects();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Disciplinas</h1>
        <Link to="/dashboard" className="text-blue-600 font-medium">Voltar ao Dashboard</Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded shadow mb-8 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input {...register('nome', { required: true })} className="w-full border p-2 rounded" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <input {...register('descricao')} className="w-full border p-2 rounded" />
        </div>
        <button type="submit" className="bg-blue-600 text-white p-2 rounded px-6 hover:bg-blue-700 transition-colors">Adicionar</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map(subject => (
          <Link to={`/subjects/${subject.id}`} key={subject.id} className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h3 className="text-xl font-bold mb-2">{subject.nome}</h3>
            <p className="text-gray-600 mb-4 truncate">{subject.descricao}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${subject.progresso}%` }}></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
