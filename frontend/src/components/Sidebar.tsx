import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Lightbulb,
  LogOut,
  User,
} from 'lucide-react';
import logo from '../assets/logo.png';

const navItems = [
  { to: '/dashboard', label: 'Página Inicial', icon: LayoutDashboard },
  { to: '/subjects', label: 'Disciplinas', icon: BookOpen },
  { to: '/tasks', label: 'Tarefas', icon: ClipboardList },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center justify-center py-6 px-4">
        <img src={logo} alt="EduTrack" className="h-10 object-contain" />
      </div>

      {/* User Info */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-gray-50/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}
          </div>
          <div className="min-w-0">
            <p className="text-text font-semibold text-sm truncate">
              {user?.name || 'Visitante'}
            </p>
            <p className="text-text-secondary text-xs truncate">
              {user?.email || 'Modo convidado'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 mt-2">
          Menu Principal
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={isActive ? 'text-primary' : 'text-gray-400'} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 transition-all duration-200 w-full cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
};
