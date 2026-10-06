import React, { createContext, useContext, useEffect, useState } from 'react';

interface BreadcrumbContextType {
  label: string | null;
  setLabel: (label: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [label, setLabel] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ label, setLabel }}>{children}</BreadcrumbContext.Provider>
  );
};

function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error('useBreadcrumbContext must be used within a BreadcrumbProvider');
  return ctx;
}

/** Usado pela Topbar para ler o rótulo dinâmico atual (ex.: nome da disciplina). */
export function useBreadcrumbValue() {
  return useBreadcrumbContext().label;
}

/**
 * Usado por páginas com um "detalhe" dinâmico (ex.: SubjectDetail) para
 * publicar o nome atual no breadcrumb. Limpa automaticamente ao desmontar.
 */
export function useSetBreadcrumb(label: string | null) {
  const { setLabel } = useBreadcrumbContext();
  useEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);
}
