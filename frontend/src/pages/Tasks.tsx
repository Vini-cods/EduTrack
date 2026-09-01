import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import type { Task, Subject } from '../types';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: AlertCircle },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Clock },
  concluida: { label: 'Concluída', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle2 },
};

interface TaskWithSubject extends Task {
  subject_name?: string;
}

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskWithSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('todas');

  const fetchData = async () => {
    try {
      const [subjectsRes] = await Promise.all([
        apiClient.get('/subjects/'),
      ]);
      const subjectsList: Subject[] = subjectsRes.data;

      const allTasks: TaskWithSubject[] = [];
      for (const subject of subjectsList) {
        try {
          const tasksRes = await apiClient.get(`/tasks/subject/${subject.id}`);
          const tasksWithName = tasksRes.data.map((t: Task) => ({
            ...t,
            subject_name: subject.name,
          }));
          allTasks.push(...tasksWithName);
        } catch {
          // skip if error
        }
      }
      setTasks(allTasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onChangeStatus = async (taskId: number, status: string) => {
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTasks =
    filter === 'todas' ? tasks : tasks.filter((t) => t.status === filter);

  const counts = {
    todas: tasks.length,
    pendente: tasks.filter((t) => t.status === 'pendente').length,
    em_andamento: tasks.filter((t) => t.status === 'em_andamento').length,
    concluida: tasks.filter((t) => t.status === 'concluida').length,
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-text">Tarefas</h1>
        <p className="text-text-secondary mt-1">
          Visualize e gerencie todas as suas tarefas em um só lugar
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-3 mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {[
          { key: 'todas', label: 'Todas' },
          { key: 'pendente', label: 'Pendentes' },
          { key: 'em_andamento', label: 'Em Andamento' },
          { key: 'concluida', label: 'Concluídas' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              filter === tab.key
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-md shadow-primary/25'
                : 'bg-white text-text-secondary border border-border hover:border-primary-200 hover:text-primary'
            }`}
          >
            {tab.label} ({counts[tab.key as keyof typeof counts]})
          </button>
        ))}
      </div>

      {/* Tasks */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <ClipboardList className="mx-auto text-primary-300 mb-4" size={64} />
          <h3 className="text-xl font-bold text-text mb-2">
            Nenhuma tarefa encontrada
          </h3>
          <p className="text-text-secondary">
            {filter === 'todas'
              ? 'Adicione tarefas nas suas disciplinas para vê-las aqui.'
              : 'Nenhuma tarefa com esse status.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="divide-y divide-border/50">
            {filteredTasks.map((task, index) => {
              const config = statusConfig[task.status] || statusConfig.pendente;
              const StatusIcon = config.icon;
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-5 hover:bg-primary-50/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <StatusIcon className={`${config.color} shrink-0`} size={20} />
                    <div className="min-w-0">
                      <span
                        className={`font-medium block ${
                          task.status === 'concluida'
                            ? 'line-through text-text-secondary'
                            : 'text-text'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.subject_name && (
                        <span className="text-xs text-primary-light font-medium">
                          {task.subject_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <select
                    value={task.status}
                    onChange={(e) => onChangeStatus(task.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${config.bg} ${config.color} outline-none cursor-pointer transition-all shrink-0`}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
