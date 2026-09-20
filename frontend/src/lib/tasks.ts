import type { TaskPriority } from '../types';

export const PRIORITY_META: Record<TaskPriority, { label: string; tone: 'crimson' | 'warning' | 'navy' | 'neutral'; weight: number }> = {
  urgente: { label: 'Urgente', tone: 'crimson', weight: 3 },
  alta: { label: 'Alta', tone: 'warning', weight: 2 },
  media: { label: 'Média', tone: 'navy', weight: 1 },
  baixa: { label: 'Baixa', tone: 'neutral', weight: 0 },
};

export const PRIORITY_ORDER: TaskPriority[] = ['urgente', 'alta', 'media', 'baixa'];
