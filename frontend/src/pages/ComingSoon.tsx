import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Timer, FileText, StickyNote, Settings, ArrowLeft } from 'lucide-react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';

const config: Record<string, { icon: React.ElementType; title: string; description: string }> = {
  '/calendar': {
    icon: Calendar,
    title: 'Calendário acadêmico',
    description:
      'Visão mensal, semanal e diária com aulas, provas, trabalhos e sessões de estudo em um só lugar. Está na próxima etapa da evolução do EduTrack.',
  },
  '/study': {
    icon: Timer,
    title: 'Modo de estudo',
    description:
      'Pomodoro configurável, tarefa e disciplina em foco, histórico de sessões — tudo alimentando os seus Insights. Chegando em breve.',
  },
  '/materials': {
    icon: FileText,
    title: 'Materiais',
    description:
      'Associe PDFs, links, vídeos e repositórios a cada disciplina, e acompanhe o que já foi estudado. Em desenvolvimento.',
  },
  '/notes': {
    icon: StickyNote,
    title: 'Notas rápidas',
    description:
      'Anotações simples ligadas a uma disciplina, tarefa ou sessão de estudo, com tags e busca. Em desenvolvimento.',
  },
  '/settings': {
    icon: Settings,
    title: 'Configurações',
    description: 'Preferências de conta e da plataforma chegam numa próxima atualização.',
  },
};

/**
 * Placeholder honesto para rotas já presentes na navegação mas com a
 * funcionalidade ainda não implementada — evita tanto o link quebrado
 * quanto fingir uma feature que não existe.
 */
export const ComingSoon: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const entry = config[location.pathname] ?? {
    icon: Settings,
    title: 'Em breve',
    description: 'Esta área ainda está sendo construída.',
  };
  const Icon = entry.icon;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <SectionHeader title={entry.title} description="Chegando em breve" />
      <div className="mt-8 border border-dashed border-border-strong rounded-xl flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="w-14 h-14 rounded-full bg-navy-soft flex items-center justify-center mb-4">
          <Icon size={26} className="text-navy" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-ink mb-1.5">{entry.title}</h3>
        <p className="text-sm text-graphite max-w-md mb-6 leading-relaxed">{entry.description}</p>
        <Button variant="outline" size="sm" icon={<ArrowLeft size={15} />} onClick={() => navigate('/dashboard')}>
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  );
};
