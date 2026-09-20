import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { Drawer } from './ui/Drawer';
import { BreadcrumbProvider } from '../contexts/BreadcrumbContext';

export const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Atalho global Ctrl+K / Cmd+K para abrir o Command Palette de qualquer tela.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <BreadcrumbProvider>
      <div className="h-screen flex bg-paper overflow-hidden">
        {/* Sidebar fixa no desktop */}
        <div
          className={`hidden lg:block shrink-0 transition-all duration-200 ${collapsed ? 'w-[76px]' : 'w-64'}`}
        >
          <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
        </div>

        {/* Drawer da sidebar no mobile/tablet */}
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ariaLabel="Menu de navegação">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>

        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onOpenPalette={() => setPaletteOpen(true)} onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </BreadcrumbProvider>
  );
};
