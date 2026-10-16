import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
  ChartNoAxesCombined,
} from 'lucide-react';
import apiClient from '../api/client';
import { Modal } from './ui/Modal';
import { buildCommandSearchIndex, matchesCommandQuery, MAX_SEARCH_QUERY_LENGTH, searchCommandIndex, type CommandSearchData, type SearchKind } from '../lib/commandSearch';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  description?: string;
  icon: React.ElementType;
  group: string;
  action: () => void;
}

const emptyData: CommandSearchData = { subjects: [], tasks: [], notes: [], materials: [] };
const searchSources = [
  { key: 'subjects', label: 'disciplinas', path: '/subjects/' },
  { key: 'tasks', label: 'tarefas', path: '/tasks/' },
  { key: 'notes', label: 'notas', path: '/notes/' },
  { key: 'materials', label: 'materiais', path: '/materials/' },
] as const;
const searchGroups: Record<SearchKind, { label: string; icon: React.ElementType }> = {
  subject: { label: 'Disciplinas', icon: BookOpen },
  task: { label: 'Tarefas', icon: ClipboardList },
  note: { label: 'Notas de estudo', icon: StickyNote },
  material: { label: 'Materiais', icon: FileText },
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [data, setData] = useState<CommandSearchData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const resultId = useId();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    setData(emptyData);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setFailedSources([]);
    async function load<Key extends keyof CommandSearchData>(key: Key, path: string) {
      const response = await apiClient.get<CommandSearchData[Key]>(path, { signal: controller.signal, timeout: 15_000 });
      if (!controller.signal.aborted) setData(previous => ({ ...previous, [key]: response.data }));
    }
    // One snapshot per opening/retry. Partial successes remain searchable.
    Promise.allSettled(searchSources.map(source => load(source.key, source.path))).then(results => {
      if (controller.signal.aborted) return;
      setFailedSources(results.flatMap((result, index) => result.status === 'rejected' ? [searchSources[index].label] : []));
      setLoading(false);
    });
    return () => controller.abort();
  }, [open, revision]);

  const go = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const staticCommands: CommandItem[] = useMemo(
    () => [
      { id: 'nav-dashboard', label: 'Ir para o Dashboard', icon: LayoutDashboard, group: 'Navegação', action: () => go('/dashboard') },
      { id: 'nav-calendar', label: 'Abrir calendário', icon: Calendar, group: 'Navegação', action: () => go('/calendar') },
      { id: 'nav-tasks', label: 'Abrir tarefas', icon: ClipboardList, group: 'Navegação', action: () => go('/tasks') },
      { id: 'nav-study', label: 'Abrir modo de estudo', icon: Timer, group: 'Navegação', action: () => go('/study') },
      { id: 'nav-subjects', label: 'Abrir disciplinas', icon: BookOpen, group: 'Navegação', action: () => go('/subjects') },
      { id: 'nav-materials', label: 'Abrir materiais', icon: FileText, group: 'Navegação', action: () => go('/materials') },
      { id: 'nav-notes', label: 'Abrir notas de estudo', icon: StickyNote, group: 'Navegação', action: () => go('/notes') },
      { id: 'nav-insights', label: 'Abrir insights', icon: Lightbulb, group: 'Navegação', action: () => go('/insights') },
      { id: 'nav-load', label: 'Ver carga acadêmica', icon: ChartNoAxesCombined, group: 'Navegação', action: () => go('/academic-load') },
      { id: 'nav-settings', label: 'Abrir configurações', icon: Settings, group: 'Navegação', action: () => go('/settings') },
      { id: 'new-subject', label: 'Nova disciplina', icon: Plus, group: 'Ações rápidas', action: () => go('/subjects?new=1') },
      { id: 'new-task', label: 'Nova tarefa', icon: Plus, group: 'Ações rápidas', action: () => go('/tasks?new=1') },
      { id: 'new-event', label: 'Novo evento', icon: Plus, group: 'Ações rápidas', action: () => go('/calendar?new=1') },
      { id: 'new-goal', label: 'Novo objetivo de estudo', icon: Plus, group: 'Ações rápidas', action: () => go('/study?new=1') },
      { id: 'new-material', label: 'Novo material', icon: Plus, group: 'Ações rápidas', action: () => go('/materials?new=1') },
      { id: 'new-note', label: 'Nova nota', icon: Plus, group: 'Ações rápidas', action: () => go('/notes?new=1') },
    ],
    [go]
  );

  const searchIndex = useMemo(() => buildCommandSearchIndex(data), [data]);
  const results = useMemo<CommandItem[]>(() => {
    if (!query.trim()) return staticCommands;
    const commands = staticCommands.filter(command => matchesCommandQuery(command.label, query));
    const academic: CommandItem[] = searchCommandIndex(searchIndex, query).map(result => ({
      ...result,
      icon: searchGroups[result.kind].icon,
      group: searchGroups[result.kind].label,
      action: () => go(result.path),
    }));
    return [...commands, ...academic];
  }, [query, staticCommands, searchIndex, go]);

  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => setActiveIndex(index => Math.min(index, Math.max(0, results.length - 1))), [results.length]);
  useEffect(() => {
    if (open) resultRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, results]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
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
    <Modal open={open} onClose={onClose} align="top" ariaLabel="Busca e navegação do EduTrack" panelClassName="max-w-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <Search size={18} className="text-muted shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_SEARCH_QUERY_LENGTH}
          placeholder="Pesquisar título, conteúdo ou tag…"
          aria-label="Pesquisar páginas, disciplinas, tarefas, notas e materiais"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={resultId}
          aria-activedescendant={results[activeIndex] ? resultId + '-' + results[activeIndex].id : undefined}
          className="flex-1 min-w-0 min-h-11 bg-transparent outline-none text-ink placeholder:text-muted text-[15px]"
        />
        <kbd className="hidden sm:inline text-xs text-muted border border-border rounded px-1.5 py-0.5">Esc</kbd>
      </div>

      {loading && <p role="status" className="px-4 py-2 text-xs text-muted border-b border-border">Carregando disciplinas, tarefas, notas e materiais…</p>}
      {failedSources.length > 0 && <div role="alert" className="px-4 py-2 border-b border-border text-xs text-graphite flex flex-wrap items-center gap-2"><p className="flex-1 min-w-40">Busca parcial: não foi possível atualizar {failedSources.join(', ')}.</p><button className="text-crimson underline min-h-11 cursor-pointer" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div>}
      <div ref={resultRef} id={resultId} role="listbox" aria-label="Resultados da busca" className="max-h-[50dvh] overflow-y-auto py-2">
        {results.length === 0 && !loading ? (
          <p className="text-sm text-muted text-center py-8">Nada encontrado para "{query}".</p>
        ) : (
          groups.map(([group, items]) => (
            <div key={group} role="group" aria-label={group} className="mb-1">
              <p aria-hidden="true" className="px-4 pt-2 pb-1 text-xs text-muted">{group}</p>
              {items.map((item) => {
                flatIndex += 1;
                const isActive = flatIndex === activeIndex;
                const currentFlatIndex = flatIndex;
                return (
                  <button
                    key={item.id}
                    id={resultId + '-' + item.id}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    onMouseEnter={() => setActiveIndex(currentFlatIndex)}
                    onClick={item.action}
                    className={`w-full min-h-11 flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson ${
                      isActive ? 'bg-surface-muted' : ''
                    }`}
                  >
                    <item.icon size={16} className="text-graphite shrink-0" />
                    <span className="flex-1 min-w-0"><span className="block text-ink truncate">{item.label}</span>{item.description && <span className="block mt-1 text-xs text-muted truncate">{item.description}</span>}{item.hint && <span className="block mt-1 text-xs text-graphite truncate">{item.hint}</span>}</span>
                    {isActive && <CornerDownLeft size={13} className="text-muted shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
      <p className="px-4 py-2.5 border-t border-border text-xs text-muted">↑ ↓ para navegar · Enter para abrir · Até 5 resultados por tipo</p>
    </Modal>
  );
};
