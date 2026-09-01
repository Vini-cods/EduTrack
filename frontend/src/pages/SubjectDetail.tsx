import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { Subject, Task } from '../types';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: AlertCircle },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Clock },
  concluida: { label: 'Concluída', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle2 },
};

export const SubjectDetail: React.FC = () => {
  const { id } = useParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const fetchData = async () => {
    try {
      const [subjRes, tasksRes] = await Promise.all([
        apiClient.get(`/subjects/${id}`),
        apiClient.get(`/tasks/subject/${id}`),
      ]);
      setSubject(subjRes.data);
      setTasks(tasksRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onAddTask = async (data: any) => {
    try {
      await apiClient.post('/tasks/', { ...data, subject_id: Number(id) });
      reset();
      setShowForm(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const onChangeStatus = async (taskId: number, status: string) => {
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  if (!subject)
    return (
      <div className="flex items-center justify-center min-h-screen text-text-secondary">
        Disciplina não encontrada.
      </div>
    );

  return (
    <div className="p-8">
      {/* Back + Header */}
      <div className="mb-8 animate-fade-in">
        <Link
          to="/subjects"
          className="inline-flex items-center gap-2 text-primary-light hover:text-primary font-medium mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          Voltar para Disciplinas
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-white shrink-0">
            <ClipboardList size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text">{subject.name}</h1>
            <p className="text-text-secondary">
              {subject.description || 'Sem descrição'}
            </p>
          </div>
        </div>
      </div>

      {/* Add Task */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 cursor-pointer"
          >
            <Plus size={20} />
            Nova Tarefa
          </button>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
            <h3 className="text-lg font-bold text-text mb-4">
              Adicionar Tarefa
            </h3>
            <form
              onSubmit={handleSubmit(onAddTask)}
              className="flex flex-col md:flex-row gap-4 items-end"
            >
              <div className="flex-1 w-full">
                <label className="block text-sm font-semibold text-text mb-2">
                  Título
                </label>
                <input
                  {...register('title', { required: true })}
                  placeholder="Ex: Estudar capítulo 5"
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
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-2xl shadow-sm border border-border/50 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="p-6 border-b border-border/50">
          <h3 className="text-lg font-bold text-text">
            Tarefas ({tasks.length})
          </h3>
        </div>
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="mx-auto text-primary-300 mb-4" size={48} />
            <p className="text-text-secondary">
              Nenhuma tarefa encontrada. Adicione a primeira!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {tasks.map((task, index) => {
              const config = statusConfig[task.status] || statusConfig.pendente;
              const StatusIcon = config.icon;
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-5 hover:bg-primary-50/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${(index + 3) * 80}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={config.color} size={20} />
                    <span
                      className={`font-medium ${
                        task.status === 'concluida'
                          ? 'line-through text-text-secondary'
                          : 'text-text'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <select
                    value={task.status}
                    onChange={(e) => onChangeStatus(task.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${config.bg} ${config.color} outline-none cursor-pointer transition-all`}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
