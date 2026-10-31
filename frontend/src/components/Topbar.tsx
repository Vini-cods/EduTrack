import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, Search, Bell, ChevronRight, Plus, ChevronDown, AlertTriangle, CalendarClock } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useBreadcrumbValue } from '../contexts/BreadcrumbContext';
import { isDueToday, isPastDue } from '../lib/date';
import type { TaskWithSubject } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/Button';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  subjects: 'Disciplinas',
  tasks: 'Tarefas',
  insights: 'Insights',
  calendar: 'Calendário',
  study: 'Estudo',
  materials: 'Materiais',
  notes: 'Notas',
  'academic-load': 'Carga acadêmica',
  settings: 'Configurações',
};

interface TopbarProps {
  onOpenPalette: () => void;
  onOpenMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenPalette, onOpenMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const dynamicLabel = useBreadcrumbValue();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskWithSubject[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState(false);
  const notificationsRequest = useRef<AbortController | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const newRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(() => {
    notificationsRequest.current?.abort();
    const request = new AbortController();
    notificationsRequest.current = request;
    setNotificationsLoading(true);
    setNotificationsError(false);
    apiClient.get<TaskWithSubject[]>('/tasks/', { signal: request.signal, timeout: 15_000 })
      .then((response) => { if (!request.signal.aborted) setTasks(response.data); })
      .catch(() => { if (!request.signal.aborted) setNotificationsError(true); })
      .finally(() => { if (!request.signal.aborted) setNotificationsLoading(false); });
  }, []);

  const closeNotifications = useCallback(() => {
    setNotifOpen(false);
    notificationsRequest.current?.abort();
    setNotificationsLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
    return () => notificationsRequest.current?.abort();
  }, [location.pathname, loadNotifications]);

  // Fecha os menus ao clicar fora.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) closeNotifications();
      if (newRef.current && !newRef.current.contains(e.target as Node)) setNewOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (profileOpen) profileRef.current?.querySelector('button')?.focus();
      if (notifOpen) notifRef.current?.querySelector('button')?.focus();
      if (newOpen) newRef.current?.querySelector('button')?.focus();
      setProfileOpen(false); setNewOpen(false);
      if (notifOpen) closeNotifications();
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [profileOpen, notifOpen, newOpen, closeNotifications]);

  const segment = location.pathname.split('/').filter(Boolean)[0] || 'dashboard';
  const baseLabel = routeLabels[segment] || 'EduTrack';
  const showDynamic = dynamicLabel && location.pathname.split('/').filter(Boolean).length > 1;

  const overdue = tasks.filter((t) => t.status !== 'concluida' && isPastDue(t.due_date));
  const dueToday = tasks.filter((t) => t.status !== 'concluida' && isDueToday(t.due_date));
  const notifCount = overdue.length + dueToday.length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 shrink-0 bg-surface border-b border-border flex items-center gap-3 px-4 lg:px-6">
      <button
        onClick={onOpenMobileMenu}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-graphite hover:bg-surface-muted cursor-pointer shrink-0"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <div className="hidden sm:flex items-center gap-1.5 text-sm min-w-0 shrink-0">
        <span className="text-muted">EduTrack</span>
        <ChevronRight size={14} className="text-border-strong" />
        <span className={showDynamic ? 'text-graphite' : 'text-ink font-medium'}>{baseLabel}</span>
        {showDynamic && (
          <>
            <ChevronRight size={14} className="text-border-strong" />
            <span className="text-ink font-medium truncate max-w-[14rem]">{dynamicLabel}</span>
          </>
        )}
      </div>

      {/* Search -> abre o Command Palette */}
      <button
        onClick={onOpenPalette}
        className="flex-1 min-w-0 max-w-md flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-border bg-paper text-muted text-sm hover:border-border-strong transition-colors cursor-pointer mx-auto"
        aria-label="Pesquisar páginas, disciplinas e tarefas"
      >
        <Search size={15} className="shrink-0" />
        <span className="truncate min-w-0">Pesquisar ou navegar...</span>
        <kbd className="hidden sm:inline ml-auto text-[11px] border border-border rounded px-1.5 py-0.5 shrink-0">
          Ctrl K
        </kbd>
      </button>

      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <ThemeToggle />
        {/* Ação rápida: nova disciplina/tarefa */}
        <div className="relative" ref={newRef}>
          <button
            onClick={() => setNewOpen((v) => !v)}
            aria-expanded={newOpen}
            aria-label="Criar novo registro"
            className="hidden sm:inline-flex items-center gap-1.5 bg-crimson text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-crimson-dark transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Novo
            <ChevronDown size={14} className="opacity-80" />
          </button>
          {newOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-float py-1.5 z-40 animate-scale-in">
              <button
                onClick={() => { setNewOpen(false); navigate('/subjects?new=1'); }}
                className="w-full text-left px-3.5 py-2 text-sm text-graphite hover:bg-surface-muted hover:text-ink cursor-pointer"
              >
                Nova disciplina
              </button>
              <button
                onClick={() => { setNewOpen(false); navigate('/tasks?new=1'); }}
                className="w-full text-left px-3.5 py-2 text-sm text-graphite hover:bg-surface-muted hover:text-ink cursor-pointer"
              >
                Nova tarefa
              </button>
              <button onClick={() => { setNewOpen(false); navigate('/notes?new=1'); }} className="w-full text-left px-3.5 py-2 text-sm text-graphite hover:bg-surface-muted hover:text-ink cursor-pointer">Nova nota</button>
              <button onClick={() => { setNewOpen(false); navigate('/calendar?new=1'); }} className="w-full text-left px-3.5 py-2 text-sm text-graphite hover:bg-surface-muted hover:text-ink cursor-pointer">Novo evento</button>
            </div>
          )}
        </div>

        {/* Notificações reais (derivadas de tarefas atrasadas/de hoje) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              if (notifOpen) closeNotifications();
              else { setNotifOpen(true); loadNotifications(); }
            }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-graphite hover:bg-surface-muted cursor-pointer"
            aria-label="Notificações"
            aria-expanded={notifOpen}
          >
            <Bell size={18} />
            {!notificationsLoading && !notificationsError && notifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-crimson" />
            )}
          </button>
          {notifOpen && (
            <div aria-busy={notificationsLoading} className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-surface border border-border rounded-lg shadow-float py-2 z-40 animate-scale-in max-h-[min(24rem,calc(100dvh-5rem))] overflow-y-auto">
              <p className="px-4 py-1.5 text-xs text-muted">Notificações</p>
              {notificationsLoading ? (
                <p role="status" className="px-4 py-6 text-sm text-muted text-center">Carregando notificações…</p>
              ) : notificationsError ? (
                <div className="px-4 py-4 space-y-3">
                  <p role="alert" className="text-sm text-danger">Não foi possível carregar as notificações.</p>
                  <Button type="button" variant="outline" onClick={loadNotifications}>Tentar novamente</Button>
                </div>
              ) : notifCount === 0 ? (
                <p className="px-4 py-6 text-sm text-muted text-center">Tudo em dia por aqui.</p>
              ) : (
                <>
                  {overdue.slice(0, 4).map((t) => (
                    <Link
                      key={t.id}
                      to={`/tasks?highlight=${t.id}`}
                      onClick={closeNotifications}
                      className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-surface-muted transition-colors"
                    >
                      <AlertTriangle size={15} className="text-danger mt-0.5 shrink-0" />
                      <span className="text-sm text-ink leading-snug">
                        <strong className="font-medium">{t.title}</strong> está atrasada
                        <span className="block text-xs text-muted">{t.subject_name}</span>
                      </span>
                    </Link>
                  ))}
                  {dueToday.slice(0, 4).map((t) => (
                    <Link
                      key={t.id}
                      to={`/tasks?highlight=${t.id}`}
                      onClick={closeNotifications}
                      className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-surface-muted transition-colors"
                    >
                      <CalendarClock size={15} className="text-warning mt-0.5 shrink-0" />
                      <span className="text-sm text-ink leading-snug">
                        <strong className="font-medium">{t.title}</strong> vence hoje
                        <span className="block text-xs text-muted">{t.subject_name}</span>
                      </span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Perfil */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            aria-label="Menu da conta"
            aria-expanded={profileOpen}
            className="w-9 h-9 rounded-full bg-navy text-white font-serif font-semibold text-sm flex items-center justify-center cursor-pointer"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'V'}
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-lg shadow-float py-1.5 z-40 animate-scale-in">
              <div className="px-3.5 py-2 border-b border-border mb-1">
                <p className="text-sm font-medium text-ink truncate">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setProfileOpen(false)}
                className="block px-3.5 py-2 text-sm text-graphite hover:bg-surface-muted hover:text-ink"
              >
                Configurações
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2 text-sm text-graphite hover:bg-surface-muted hover:text-ink cursor-pointer"
              >
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
