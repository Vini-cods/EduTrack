import { Link } from 'react-router-dom';
import { BrandArtwork } from '../Logo';
import './AuthBrand.css';

/** Full brand composition reserved for the entry screens. */
export function AuthBrand() {
  return (
    <Link to="/login" className="auth-brand" aria-label="EduTrack, seu dashboard de estudos. Ir para o início">
      <span className="auth-brand-artwork" aria-hidden="true">
        <BrandArtwork className="auth-brand-symbol" />
        <span className="auth-brand-name">EDUTRACK</span>
        <span className="auth-brand-tagline">Seu dashboard de estudos</span>
      </span>
    </Link>
  );
}
