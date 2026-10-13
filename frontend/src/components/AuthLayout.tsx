import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { BrandArtwork, Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function AuthLayout({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper text-ink lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="hidden lg:flex flex-col justify-between border-r border-border px-12 py-10 xl:px-20">
        <div className="flex items-center justify-between text-xs tracking-widest text-graphite uppercase">
          <span>Organização acadêmica</span><ArrowUpRight size={18} aria-hidden="true" />
        </div>
        <div className="py-10">
          <BrandArtwork className="w-72 xl:w-80 mx-auto rounded-sm border border-border" />
          <div className="auth-rule mt-10 mb-6" />
          <h2 className="font-serif text-4xl xl:text-5xl leading-tight max-w-lg">Mais clareza.<br />Um passo de cada vez.</h2>
          <p className="mt-5 text-graphite max-w-md leading-relaxed">Reúna prazos, disciplinas e estudos em um espaço que acompanha a sua vida acadêmica.</p>
        </div>
        <ol className="border-t border-border divide-y divide-border text-sm">
          {['Saiba o que precisa fazer hoje', 'Transforme objetivos em blocos de estudo', 'Acompanhe seu progresso com dados reais'].map((text, index) => (
            <li key={text} className="flex gap-4 py-3"><span className="text-crimson tabular-nums">0{index + 1}</span><span className="text-graphite">{text}</span></li>
          ))}
        </ol>
      </aside>
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-10">
          <Link to="/login" aria-label="EduTrack, início"><Logo size="sm" /></Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10">
          <div className="w-full max-w-[400px] animate-fade-in">
            <div className="auth-rule mb-6" />
            <h1 className="font-serif text-3xl sm:text-4xl tracking-tight">{title}</h1>
            <p className="mt-3 mb-8 text-graphite leading-relaxed">{description}</p>
            {children}
            <div className="mt-7 border-t border-border pt-6 text-sm text-graphite">{footer}</div>
          </div>
        </main>
        <footer className="px-5 py-5 text-center text-xs text-muted">EduTrack · Seu dashboard de estudos</footer>
      </div>
    </div>
  );
}
