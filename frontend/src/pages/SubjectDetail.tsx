import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { Subject, Task } from '../types';
import { useForm } from 'react-hook-form';

export const SubjectDetail: React.FC = () => {
  const { id } = useParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const { register, handleSubmit, reset } = useForm();

  const fetchData = async () => {
    try {
      const [subjRes, tasksRes] = await Promise.all([
        apiClient.get(`/subjects/${id}`),
        apiClient.get(`/subjects/${id}/tasks`)
      ]);
      setSubject(subjRes.data);
      setTasks(tasksRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onAddTask = async (data: any) => {
    try {
      await apiClient.post(`/subjects/${id}/tasks`, data);
      reset();
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const onChangeStatus = async (taskId: number, status: string) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { status });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!subject) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <Link to="/subjects" className="text-blue-600 mb-4 inline-block font-medium">&larr; Voltar para Disciplinas</Link>
        <h1 className="text-3xl font-bold mb-2">{subject.nome}</h1>
        <p className="text-gray-600">{subject.descricao}</p>
      </div>

      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Adicionar Tarefa</h2>
        <form onSubmit={handleSubmit(onAddTask)} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Título</label>
            <input {...register('titulo', { required: true })} className="w-full border p-2 rounded" />
          </div>
          <button type="submit" className="bg-blue-600 text-white p-2 rounded px-6 hover:bg-blue-700 transition-colors">Adicionar</button>
        </form>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Tarefas</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-500">Nenhuma tarefa encontrada.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <span className="font-medium">{task.titulo}</span>
                <select
                  value={task.status}
                  onChange={(e) => onChangeStatus(task.id, e.target.value)}
                  className="border p-2 rounded bg-gray-50 cursor-pointer outline-none"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
