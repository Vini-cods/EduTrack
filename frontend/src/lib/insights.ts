import type { SubjectProgress, TaskWithSubject } from '../types';
import { daysUntil, isPastDue, startOfWeek, WEEKDAY_LABELS } from './date';

export interface Insight {
  id: string;
  tone: 'danger' | 'warning' | 'info';
  text: string;
}

/**
 * Gera observações objetivas a partir dos dados que o usuário já tem no
 * sistema — nada de IA generativa aqui, só regras determinísticas (ver
 * seção 30/31 do briefing: preparar terreno para IA no futuro, mas não
 * fingir uma "IA de fachada" agora).
 */
export function buildDashboardInsights(
  tasks: TaskWithSubject[],
  subjectsProgress: SubjectProgress[]
): Insight[] {
  const insights: Insight[] = [];
  const pending = tasks.filter((t) => t.status !== 'concluida');

  const overdueCount = pending.filter((t) => isPastDue(t.due_date)).length;
  if (overdueCount > 0) {
    insights.push({
      id: 'overdue',
      tone: 'danger',
      text: `Você tem ${overdueCount} ${overdueCount === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}.`,
    });
  }

  const urgentCount = pending.filter((t) => t.priority === 'urgente').length;
  if (urgentCount > 0) {
    insights.push({
      id: 'urgent-priority',
      tone: 'danger',
      text: `${urgentCount} ${urgentCount === 1 ? 'tarefa está marcada' : 'tarefas estão marcadas'} como prioridade urgente.`,
    });
  }

  const upcomingCount = pending.filter((t) => {
    const d = daysUntil(t.due_date);
    return d !== null && d >= 0 && d <= 5;
  }).length;
  if (upcomingCount > 0) {
    insights.push({
      id: 'upcoming',
      tone: 'info',
      text: `Você tem ${upcomingCount} ${upcomingCount === 1 ? 'entrega' : 'entregas'} nos próximos 5 dias.`,
    });
  }

  const withTasks = subjectsProgress.filter((s) => s.total_tasks > 0);
  if (withTasks.length > 0) {
    const lowest = [...withTasks].sort((a, b) => a.progress - b.progress)[0];
    if (lowest.progress < 50) {
      insights.push({
        id: 'low-progress',
        tone: 'warning',
        text: `${lowest.subject_name} está com ${Math.round(lowest.progress)}% de progresso.`,
      });
    }
  }

  const weekStart = startOfWeek();
  const countsByDay = [0, 0, 0, 0, 0, 0, 0];
  pending.forEach((t) => {
    if (!t.due_date) return;
    const diff = Math.round(
      (new Date(t.due_date + 'T00:00:00').getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff >= 0 && diff <= 6) countsByDay[diff] += 1;
  });
  const totalThisWeek = countsByDay.reduce((a, b) => a + b, 0);
  if (totalThisWeek >= 3) {
    const average = totalThisWeek / 7;
    const maxCount = Math.max(...countsByDay);
    const maxDay = countsByDay.indexOf(maxCount);
    if (maxCount >= 3 && maxCount >= average * 1.5) {
      insights.push({
        id: 'load-imbalance',
        tone: 'info',
        text: `${WEEKDAY_LABELS[maxDay]} possui uma carga acima da sua média.`,
      });
    }
  }

  return insights;
}
