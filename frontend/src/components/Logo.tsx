import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** Quando falso, mostra só o monograma (usado com a sidebar colapsada). */
  withWordmark?: boolean;
  /** Para uso sobre fundos escuros (ex.: painel navy do Register): inverte o
   * badge do monograma (fundo claro) e o wordmark (texto branco). */
  inverted?: boolean;
  className?: string;
}

const markSizes = { sm: 28, md: 34, lg: 44 };
const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };

/**
 * Substitui o logo.png anterior (gradiente roxo). O monograma reutiliza a
 * mesma construção geométrica do favicon.svg para manter a marca consistente
 * em todos os tamanhos, sem depender de um arquivo de imagem rasterizado.
 */
export const Logo: React.FC<LogoProps> = ({ size = 'md', withWordmark = true, inverted = false, className = '' }) => {
  const px = markSizes[size];
  const badgeBg = inverted ? 'var(--color-paper)' : 'var(--color-navy)';
  const eColor = inverted ? 'var(--color-navy)' : 'var(--color-paper)';
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={px} height={px} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="48" height="48" rx="10" fill={badgeBg} />
        <path d="M14 13h17v4.2H18.6v6.1h11v4.2h-11v6.3H31.4V38H14V13Z" fill={eColor} />
        <rect x="14" y="13" width="4.6" height="25" fill="var(--color-crimson)" />
      </svg>
      {withWordmark && (
        <span
          className={`font-serif font-semibold tracking-tight ${textSizes[size]} ${inverted ? 'text-white' : 'text-ink'}`}
        >
          EduTrack
        </span>
      )}
    </div>
  );
};
