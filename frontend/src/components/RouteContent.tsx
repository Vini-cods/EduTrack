import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';

class PageBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="p-6 text-ink space-y-4"><h1 className="font-serif text-2xl">Não foi possível abrir esta página.</h1><p className="text-graphite">Recarregue para tentar novamente.</p><Button onClick={() => window.location.reload()}>Recarregar</Button></div>;
    return this.props.children;
  }
}
export function RouteContent() {
  const { pathname } = useLocation();
  return <PageBoundary key={pathname}><Suspense fallback={<div role="status" aria-label="Carregando página" className="p-6 space-y-5"><Skeleton className="w-60 h-9" /><Skeleton className="w-full h-48" /><span className="sr-only">Carregando página…</span></div>}><Outlet /></Suspense></PageBoundary>;
}
