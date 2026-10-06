import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
    items: [{ to: '/insights', label: 'Insights', icon: Lightbulb }],
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Collapsed usa preenchimento sólido no botão inteiro para marcar o item
  // ativo (não a borda esquerda do modo expandido, que fica torta quando o
  // conteúdo está centralizado em vez de alinhado à esquerda).
  const linkClasses = (isActive: boolean) =>
    collapsed
      ? `flex items-center justify-center rounded-lg py-2.5 transition-colors duration-150 ${
          isActive ? 'bg-crimson-soft' : 'hover:bg-surface-muted'
        }`
      : `group flex items-center gap-3 rounded-lg text-sm font-medium px-3 py-2.5 transition-colors duration-150 border-l-2 ${
          isActive
            ? 'bg-crimson-soft text-crimson-dark border-crimson -ml-0.5 pl-[10px]'
            : 'text-graphite hover:bg-surface-muted border-transparent'
        }`;

  const renderLink = (item: NavItem) => {
    const link = (
      <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => linkClasses(isActive)}>
        {({ isActive }) => (
          <>
            <item.icon size={18} className={isActive ? 'text-crimson shrink-0' : 'text-muted shrink-0'} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </>
        )}
      </NavLink>
    );
    return collapsed ? (
      <Tooltip key={item.to} label={item.label} side="right">
        {link}
      </Tooltip>
    ) : (
      link
    );
  };

  return (
    <aside className="h-full bg-surface border-r border-border flex flex-col">
      {/* Logo + toggle — empilhados verticalmente quando collapsed, para não
          ficarem espremidos lado a lado numa rail estreita. */}
      <div className={`flex ${collapsed ? 'flex-col items-center gap-2.5 py-5' : 'flex-row items-center justify-between px-5 py-5'}`}>
        <Logo size="sm" withWordmark={!collapsed} />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        )}
      </div>

      {/* User info */}
      <div className={`mb-5 ${collapsed ? 'px-2' : 'px-4'}`}>
        {collapsed ? (
          <Tooltip label={user?.name || 'Usuário'} side="right">
            <div className="w-9 h-9 mx-auto rounded-full bg-navy flex items-center justify-center text-white font-serif font-semibold text-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
            </div>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-paper/60 p-3">
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
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2 space-y-2.5' : 'px-3 space-y-5'}`}>
        {groups.map((group, i) => (
          <div key={group.label}>
            {collapsed && i > 0 && <div className="border-t border-border mb-2.5" />}
            {!collapsed && <p className="px-3 text-xs text-muted mb-1.5">{group.label}</p>}
            <div className="space-y-1">{group.items.map(renderLink)}</div>
          </div>
        ))}
      </nav>

      {/* Settings + Logout */}
      <div className={`border-t border-border pt-3 pb-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {renderLink({ to: '/settings', label: 'Configurações', icon: Settings })}
        {collapsed ? (
          <Tooltip label="Sair da conta" side="right">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center py-2.5 rounded-lg text-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
              aria-label="Sair da conta"
            >
              <LogOut size={18} />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-graphite hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
          >
            <LogOut size={18} className="text-muted shrink-0" />
            Sair da conta
          </button>
        )}
      </div>
    </aside>
  );
};
