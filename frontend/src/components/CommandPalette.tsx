import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Lightbulb,
  Calendar,
  Timer,
  FileText,
  StickyNote,
  Settings,
  Plus,
  Search,
  CornerDownLeft,
} from 'lucide-react';
import apiClient from '../api/client';
import { Modal } from './ui/Modal';
import type { Subject, Task } from '../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  group: string;
  action: () => void;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Busca disciplinas/tarefas uma vez, na primeira vez que o palette abre —
  // é isso que torna "Pesquisar disciplina/tarefa" uma busca real, e não
  // apenas um atalho de navegação disfarçado de busca.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    apiClient.get('/subjects/').then((res) => setSubjects(res.data)).catch(() => {});
    apiClient.get('/tasks/').then((res) => setTasks(res.data)).catch(() => {});
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const staticCommands: CommandItem[] = useMemo(
    () => [
      { id: 'nav-dashboard', label: 'Ir para o Dashboard', icon: LayoutDashboard, group: 'Navegação', action: () => go('/dashboard') },
      { id: 'nav-calendar', label: 'Abrir calendário', icon: Calendar, group: 'Navegação', action: () => go('/calendar') },
      { id: 'nav-tasks', label: 'Abrir tarefas', icon: ClipboardList, group: 'Navegação', action: () => go('/tasks') },
      { id: 'nav-study', label: 'Abrir modo de estudo', icon: Timer, group: 'Navegação', action: () => go('/study') },
      { id: 'nav-subjects', label: 'Abrir disciplinas', icon: BookOpen, group: 'Navegação', action: () => go('/subjects') },
      { id: 'nav-materials', label: 'Abrir materiais', icon: FileText, group: 'Navegação', action: () => go('/materials') },
      { id: 'nav-notes', label: 'Abrir notas', icon: StickyNote, group: 'Navegação', action: () => go('/notes') },
      { id: 'nav-insights', label: 'Abrir insights', icon: Lightbulb, group: 'Navegação', action: () => go('/insights') },
      { id: 'nav-settings', label: 'Abrir configurações', icon: Settings, group: 'Navegação', action: () => go('/settings') },
      { id: 'new-subject', label: 'Nova disciplina', icon: Plus, group: 'Ações rápidas', action: () => go('/subjects?new=1') },
      { id: 'new-task', label: 'Nova tarefa', icon: Plus, group: 'Ações rápidas', action: () => go('/tasks?new=1') },
      { id: 'new-event', label: 'Novo evento', icon: Plus, group: 'Ações rápidas', action: () => go('/calendar?new=1') },
      { id: 'new-goal', label: 'Novo objetivo de estudo', icon: Plus, group: 'Ações rápidas', action: () => go('/study?new=1') },
      { id: 'new-material', label: 'Novo material', icon: Plus, group: 'Ações rápidas', action: () => go('/materials?new=1') },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const results = useMemo<CommandItem[]>(() => {
    const q = normalize(query.trim());
    if (!q) return staticCommands;

    const matchedCommands = staticCommands.filter((c) => normalize(c.label).includes(q));

    const matchedSubjects: CommandItem[] = subjects
      .filter((s) => normalize(s.name).includes(q))
      .slice(0, 5)
      .map((s) => ({
        id: `subject-${s.id}`,
        label: s.name,
        hint: 'Disciplina',
        icon: BookOpen,
        group: 'Disciplinas',
        action: () => go(`/subjects/${s.id}`),
      }));

    const matchedTasks: CommandItem[] = tasks
      .filter((t) => normalize(t.title).includes(q))
      .slice(0, 5)
      .map((t) => ({
        id: `task-${t.id}`,
        label: t.title,
        hint: (t as Task & { subject_name?: string }).subject_name,
        icon: ClipboardList,
        group: 'Tarefas',
        action: () => go(`/tasks?highlight=${t.id}`),
      }));

    return [...matchedCommands, ...matchedSubjects, ...matchedTasks];
  }, [query, staticCommands, subjects, tasks]);

  useEffect(() => setActiveIndex(0), [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[activeIndex]?.action();
    }
  };

  // Agrupa preservando a ordem em que os grupos aparecem nos resultados.
  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    results.forEach((item) => {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    });
    return Array.from(map.entries());
  }, [results]);

  let flatIndex = -1;

  return (
    <Modal open={open} onClose={onClose} align="top" ariaLabel="Command palette" panelClassName="max-w-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <Search size={18} className="text-muted shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Pesquisar ou navegar..."
          className="flex-1 bg-transparent outline-none text-ink placeholder:text-muted text-[15px]"
        />
        <kbd className="hidden sm:inline text-xs text-muted border border-border rounded px-1.5 py-0.5">Esc</kbd>
      </div>

      <div className="max-h-[60vh] overflow-y-auto py-2">
        {results.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">Nada encontrado para "{query}".</p>
        ) : (
          groups.map(([group, items]) => (
            <div key={group} className="mb-1">
              <p className="px-4 pt-2 pb-1 text-xs text-muted">{group}</p>
              {items.map((item) => {
                flatIndex += 1;
                const isActive = flatIndex === activeIndex;
                const currentFlatIndex = flatIndex;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setActiveIndex(currentFlatIndex)}
                    onClick={item.action}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors cursor-pointer ${
                      isActive ? 'bg-surface-muted' : ''
                    }`}
                  >
                    <item.icon size={16} className="text-graphite shrink-0" />
                    <span className="flex-1 text-ink truncate">{item.label}</span>
                    {item.hint && <span className="text-xs text-muted shrink-0">{item.hint}</span>}
                    {isActive && <CornerDownLeft size={13} className="text-muted shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
