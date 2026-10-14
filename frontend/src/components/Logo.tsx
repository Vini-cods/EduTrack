import type { CSSProperties } from 'react';
import symbol from '../assets/brand/edutrack-symbol-crimson.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
const sizes = { sm: 40, md: 48, lg: 64 };
const mask: CSSProperties = {
  maskImage: `url("${symbol}")`, WebkitMaskImage: `url("${symbol}")`,
  maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
  maskSize: 'contain', WebkitMaskSize: 'contain',
  maskPosition: 'center', WebkitMaskPosition: 'center',
};

/** Uma única silhueta mantém a geometria idêntica entre os temas. */
export function Logo({ size = 'md', className = '' }: LogoProps) {
  return <span role="img" aria-label="EduTrack" className={`brand-symbol shrink-0 ${className}`} style={{ ...mask, width: sizes[size], height: sizes[size] }} />;
}
export function BrandArtwork({ className = '' }: { className?: string }) {
  return <span role="img" aria-label="Símbolo EduTrack: conhecimento e progresso" className={`brand-symbol aspect-square ${className}`} style={mask} />;
}
