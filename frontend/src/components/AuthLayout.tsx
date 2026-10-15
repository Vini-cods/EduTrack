import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { AcademicPreview } from './auth/AcademicPreview';
import './auth/AuthLayout.css';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  variant?: 'login' | 'register';
}

export function AuthLayout({ title, description, children, footer, variant = 'login' }: AuthLayoutProps) {
  return (
    <div className="auth-experience">
      <header className="auth-experience-header">
        <Link to="/login" aria-label="EduTrack, início" className="auth-experience-brand">
          <Logo size="lg" />
        </Link>
        <p className="auth-experience-header-note">Um lugar para o seu semestre.</p>
        <ThemeToggle />
      </header>

      <main className="auth-experience-stage">
        <section className="auth-experience-access" aria-labelledby="auth-title">
          <div className="auth-experience-sheet">
            <nav className="auth-experience-navigation" aria-label="Acesso à conta">
              <Link to="/login" aria-current={variant === 'login' ? 'page' : undefined}>Entrar</Link>
              <Link to="/register" aria-current={variant === 'register' ? 'page' : undefined}>Criar conta</Link>
            </nav>
            <div className="auth-experience-sheet-heading">
              <span className="auth-experience-eyebrow">{variant === 'login' ? 'Continue seu percurso' : 'Abra um novo capítulo'}</span>
              <h1 id="auth-title">{title}</h1>
              <p>{description}</p>
            </div>
            {children}
            <div className="auth-experience-account-link">{footer}</div>
          </div>
          <p className="auth-experience-access-note">
            <span aria-hidden="true" />Disciplinas, prazos e estudos conectados.
          </p>
        </section>

        <aside className="auth-experience-editorial" aria-labelledby="auth-editorial-title">
          <div className="auth-experience-editorial-heading">
            <p className="auth-experience-eyebrow"><span aria-hidden="true">01 / </span>Seu percurso acadêmico</p>
            <h2 id="auth-editorial-title">Seu tempo.<br /><em>Sua direção.</em></h2>
            <p className="auth-experience-intro">Entre uma aula e outra, dê espaço ao que precisa acontecer. Organize o próximo passo e acompanhe o caminho.</p>
          </div>
          <AcademicPreview />
          <div className="auth-experience-editorial-footer">
            <span>Do planejamento à prática.</span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </div>
        </aside>
      </main>

      <footer className="auth-experience-footer">
        <span>EduTrack · Organização acadêmica</span>
        <span>Um passo de cada vez.</span>
      </footer>
    </div>
  );
}
