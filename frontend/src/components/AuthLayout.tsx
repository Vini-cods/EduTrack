import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { AuthBackdrop } from './auth/AuthBackdrop';
import { AuthHelp } from './auth/AuthHelp';
import './auth/AuthLayout.css';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  variant?: 'login' | 'register' | 'recovery';
}

/** Shared portal shell. Authentication and step state stay in their own pages. */
export function AuthLayout({ title, description, children, footer, variant = 'login' }: AuthLayoutProps) {
  return (
    <div className="auth-portal" data-variant={variant}>
      <AuthBackdrop />
      <a href="#auth-content" className="auth-portal-skip">Ir para o acesso</a>
      <header className="auth-portal-header">
        <Link to="/login" aria-label="EduTrack, início" className="auth-portal-brand">
          <Logo size="lg" />
        </Link>
        <span className="auth-portal-caption">Seu portal<br />acadêmico</span>
        <div className="auth-portal-tools">
          <ThemeToggle />
          <AuthHelp />
        </div>
      </header>

      <main id="auth-content" tabIndex={-1} className="auth-portal-main">
        <section className="auth-portal-panel" aria-labelledby="auth-title">
          <div className="auth-portal-heading">
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          <div className="auth-portal-account-link">{footer}</div>
        </section>
      </main>

      <footer className="auth-portal-footer">
        <p>© {new Date().getFullYear()} EduTrack</p>
        <p>Seu próximo passo começa aqui.</p>
      </footer>
    </div>
  );
}
