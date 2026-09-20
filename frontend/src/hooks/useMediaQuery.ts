import { useEffect, useState } from 'react';

/**
 * Retorna se a media query informada bate com a viewport atual, atualizando
 * reativamente em resize. Usado para decidir sidebar fixa/colapsável
 * (desktop) vs. navigation drawer (mobile) a partir do MESMO componente,
 * em vez de duas implementações de navegação separadas.
 */
export function useMediaQuery(query: string): boolean {
  const getMatch = () =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Breakpoint compartilhado: abaixo de 1024px usamos o layout mobile/tablet. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
