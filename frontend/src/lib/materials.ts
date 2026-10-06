import { FileText, Link as LinkIcon, Newspaper, Video, BookOpen, GitBranch, StickyNote, File } from 'lucide-react';
import type { MaterialCategory, MaterialStatus } from '../types';

export const CATEGORY_META: Record<MaterialCategory, { label: string; icon: typeof FileText }> = {
  pdf: { label: 'PDF', icon: FileText },
  link: { label: 'Link', icon: LinkIcon },
  artigo: { label: 'Artigo', icon: Newspaper },
  video: { label: 'Vídeo', icon: Video },
  documentacao: { label: 'Documentação', icon: BookOpen },
  github: { label: 'Repositório', icon: GitBranch },
  anotacao: { label: 'Anotação', icon: StickyNote },
  outro: { label: 'Outro', icon: File },
};

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'pdf',
  'link',
  'artigo',
  'video',
  'documentacao',
  'github',
  'anotacao',
  'outro',
];

export const STATUS_META: Record<MaterialStatus, { label: string; tone: 'warning' | 'navy' | 'success' }> = {
  para_estudar: { label: 'Para estudar', tone: 'warning' },
  estudando: { label: 'Estudando', tone: 'navy' },
  concluido: { label: 'Concluído', tone: 'success' },
};

export const MATERIAL_STATUSES: MaterialStatus[] = ['para_estudar', 'estudando', 'concluido'];
