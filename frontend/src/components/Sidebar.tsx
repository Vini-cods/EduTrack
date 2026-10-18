import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Timer,
  BookOpen,
  FileText,
  StickyNote,
  Lightbulb,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  User,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Logo } from './Logo';
import { Tooltip } from './ui/Tooltip';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: 'Visão geral',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/calendar', label: 'Calendário', icon: Calendar },
      { to: '/tasks', label: 'Tarefas', icon: ClipboardList },
      { to: '/study', label: 'Estudo', icon: Timer },
    ],
  },
  {
    label: 'Acadêmico',
    items: [
      { to: '/subjects', label: 'Disciplinas', icon: BookOpen },
      { to: '/materials', label: 'Materiais', icon: FileText },
      { to: '/notes', label: 'Notas', icon: StickyNote },
    ],
  },
  {
    label: 'Análise',
    items: [
      { to: '/academic-load', label: 'Carga acadêmica', icon: ChartNoAxesCombined },
      { to: '/insights', label: 'Insights', icon: Lightbulb },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Chamado ao clicar em um link — usado para fechar o drawer no mobile. */
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggleCollapse, onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navigationRef = useRef<HTMLElement>(null);

  // Só desloca a área dos links: não move a página nem rouba o foco.
  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const revealActiveLink = () => {
      const activeLink = navigation.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
      if (!activeLink) return;
      const navigationBounds = navigation.getBoundingClientRect();
      const linkBounds = activeLink.getBoundingClientRect();
      if (navigationBounds.height <= 0 || linkBounds.height <= 0) return;
      if (linkBounds.top < navigationBounds.top) {
        navigation.scrollTop -= navigationBounds.top - linkBounds.top;
      } else if (linkBounds.bottom > navigationBounds.bottom) {
        navigation.scrollTop += linkBounds.bottom - navigationBounds.bottom;
      }
    };
    revealActiveLink();
    const observer = new ResizeObserver(revealActiveLink);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, [pathname, collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Collapsed usa preenchimento sólido no botão inteiro para marcar o item
  // ativo (não a borda esquerda do modo expandido, que fica torta quando o
  // conteúdo está centralizado em vez de alinhado à esquerda).
  const linkClasses = (isActive: boolean) =>
    collapsed
      ? `flex w-full min-h-11 items-center justify-center rounded-lg py-2.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson/40 ${
          isActive ? 'bg-crimson-soft' : 'hover:bg-surface-muted'
        }`
      : `group flex min-h-11 items-center gap-3 rounded-lg text-sm font-medium px-3 py-2.5 transition-colors duration-150 border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson/40 ${
          isActive
            ? 'bg-crimson-soft text-crimson-dark border-crimson -ml-0.5 pl-[10px]'
            : 'text-graphite hover:bg-surface-muted border-transparent'
        }`;

  const renderLink = (item: NavItem) => {
    const link = (
      <NavLink key={item.to} to={item.to} aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined} onClick={onNavigate} className={({ isActive }) => linkClasses(isActive)}>
        {({ isActive }) => (
          <>
            <item.icon size={18} className={isActive ? 'text-crimson shrink-0' : 'text-muted shrink-0'} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </>
        )}
      </NavLink>
    );
    return collapsed ? (
      <Tooltip key={item.to} label={item.label} side="right" className="w-full">
        {link}
      </Tooltip>
    ) : (
      link
    );
  };

  return (
    <aside className="h-full min-h-0 bg-surface border-r border-border flex flex-col">
      {/* Logo + toggle — empilhados verticalmente quando collapsed, para não
          ficarem espremidos lado a lado numa rail estreita. */}
      <div className={`flex shrink-0 ${collapsed ? 'flex-col items-center gap-1 py-2' : 'flex-row items-center justify-between px-4 py-2'}`}>
        <Logo size="sm" />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-11 h-11 rounded-md text-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        )}
      </div>

      {/* User info */}
      <div className={`shrink-0 mb-2 ${collapsed ? 'px-2' : 'px-4'}`}>
        {collapsed ? (
          <Tooltip label={user?.name || 'Usuário'} side="right" className="w-full">
            <div className="w-9 h-9 mx-auto rounded-full bg-navy flex items-center justify-center text-white font-serif font-semibold text-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
            </div>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-paper/60 p-2">
            <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-white font-serif font-semibold text-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
            </div>
            <div className="min-w-0">
              <p className="text-ink font-semibold text-sm truncate">{user?.name || 'Usuário'}</p>
              <p className="text-muted text-xs truncate">{user?.email || ''}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav ref={navigationRef} aria-label="Navegação principal" className={`min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 space-y-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        {groups.map((group, i) => (
          <div key={group.label}>
            {collapsed && i > 0 && <div className="border-t border-border mb-2" />}
            {!collapsed && <p className="px-3 text-xs text-muted mb-1">{group.label}</p>}
            <div className="space-y-0.5">{group.items.map(renderLink)}</div>
          </div>
        ))}
      </nav>

      {/* Settings + Logout */}
      <div className={`shrink-0 border-t border-border py-2 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {renderLink({ to: '/settings', label: 'Configurações', icon: Settings })}
        {collapsed ? (
          <Tooltip label="Sair da conta" side="right" className="w-full">
            <button
              onClick={handleLogout}
              className="w-full min-h-11 flex items-center justify-center py-2.5 rounded-lg text-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
              aria-label="Sair da conta"
              title="Sair da conta"
            >
              <LogOut size={18} />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-graphite hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
          >
            <LogOut size={18} className="text-muted shrink-0" />
            Sair da conta
          </button>
        )}
      </div>
    </aside>
  );
};
