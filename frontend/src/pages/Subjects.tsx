import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import type { Subject } from '../types';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  BookOpen,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const fetchSubjects = () => {
    setLoading(true);
    apiClient
      .get('/subjects')
      .then((res) => setSubjects(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await apiClient.post('/subjects', data);
      reset();
      setShowForm(false);
      fetchSubjects();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-text">Disciplinas</h1>
          <p className="text-text-secondary mt-1">
            Gerencie suas disciplinas e acompanhe o progresso
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 cursor-pointer"
        >
          <Plus size={20} />
          Nova Disciplina
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 mb-8 animate-fade-in">
          <h3 className="text-lg font-bold text-text mb-4">
            Adicionar Disciplina
          </h3>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col md:flex-row gap-4 items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-text mb-2">
                Nome
              </label>
              <input
                {...register('nome', { required: true })}
                placeholder="Ex: Matemática"
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white text-text placeholder:text-gray-400 outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-100 transition-all"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-text mb-2">
                Descrição
              </label>
              <input
                {...register('descricao')}
                placeholder="Breve descrição da disciplina"
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white text-text placeholder:text-gray-400 outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-100 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  reset();
                }}
                className="px-5 py-3 rounded-xl border-2 border-border text-text-secondary font-medium hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold hover:from-primary-dark hover:to-primary transition-all shadow-md cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <BookOpen className="mx-auto text-primary-300 mb-4" size={64} />
          <h3 className="text-xl font-bold text-text mb-2">
            Nenhuma disciplina cadastrada
          </h3>
          <p className="text-text-secondary">
            Comece adicionando sua primeira disciplina!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {subjects.map((subject, index) => (
            <Link
              to={`/subjects/${subject.id}`}
              key={subject.id}
              className="group bg-white rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-lg hover:border-primary-200 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-white shrink-0">
                  <BookOpen size={22} />
                </div>
                <ArrowRight
                  className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all"
                  size={20}
                />
              </div>
              <h3 className="text-lg font-bold text-text mb-1">
                {subject.nome}
              </h3>
              <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                {subject.descricao || 'Sem descrição'}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Progresso</span>
                  <span className="font-semibold text-primary">
                    {subject.progresso}%
                  </span>
                </div>
                <div className="w-full bg-primary-100 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-primary-light to-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${subject.progresso}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
