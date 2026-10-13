import React from 'react';
import logoImage from '../assets/edutrack-logo.jpeg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withWordmark?: boolean;
  inverted?: boolean;
  className?: string;
}
const sizes = { sm: 32, md: 40, lg: 52 };

/** A marca fornecida é preservada: o viewBox apenas enquadra o monograma. */
export const Logo: React.FC<LogoProps> = ({ size = 'md', withWordmark = true, inverted = false, className = '' }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <svg width={sizes[size]} height={sizes[size]} viewBox="530 80 340 410" role="img" aria-label={withWordmark ? 'Símbolo EduTrack' : 'EduTrack'} className="shrink-0 rounded-sm bg-white">
      <image href={logoImage} width="1408" height="768" />
    </svg>
    {withWordmark && <span className={`font-semibold tracking-[0.035em] ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-base'} ${inverted ? 'text-white' : 'text-ink'}`}>EDUTRACK</span>}
  </span>
);

export const BrandArtwork: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="350 90 700 590" role="img" aria-label="EduTrack — seu dashboard de estudos" className={`brand-artwork ${className}`}>
    <image href={logoImage} width="1408" height="768" />
  </svg>
);
