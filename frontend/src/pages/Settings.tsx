import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { ThemePreference } from '../lib/theme';
import { SectionHeader } from '../components/ui/SectionHeader';
import { PreferencesSyncStatus } from '../components/PreferencesSyncStatus';

const options = [
  { value: 'light' as ThemePreference, label: 'Claro', icon: Sun, description: 'Papel claro e contraste acadêmico.' },
  { value: 'dark' as ThemePreference, label: 'Escuro', icon: Moon, description: 'Superfícies escuras e leitura confortável.' },
  { value: 'system' as ThemePreference, label: 'Sistema', icon: Monitor, description: 'Acompanha a preferência do dispositivo.' },
];
export function Settings() {
  const { preference, setPreference, ready } = useTheme();
  const { user } = useAuth();
  return <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
    <SectionHeader title="Configurações" description="Deixe o EduTrack confortável para sua rotina." />
    <section className="mt-8 border border-border rounded-lg bg-surface p-5 sm:p-6">
      <h2 className="font-serif text-xl text-ink">Aparência</h2><p className="text-sm text-graphite mt-2 mb-5">Seu tema, capacidade diária e ciclos de foco acompanham a conta em outros dispositivos. Login e cadastro mantêm o tema escolhido neste navegador antes de entrar.</p>
      <fieldset disabled={!ready} className="grid sm:grid-cols-3 gap-3 disabled:opacity-60"><legend className="sr-only">Tema da interface</legend>{options.map(({ value, label, icon: Icon, description }) => <label key={value} className={`flex gap-3 p-4 border rounded-md cursor-pointer ${preference === value ? 'border-crimson bg-crimson-soft' : 'border-border hover:bg-surface-muted'}`}><input type="radio" name="theme" value={value} checked={preference === value} onChange={() => setPreference(value)} className="accent-crimson mt-1" /><span><Icon size={20} className="text-crimson mb-3" aria-hidden="true" /><span className="block text-ink font-medium text-sm">{label}</span><span className="block text-xs text-graphite mt-1 leading-relaxed">{description}</span></span></label>)}</fieldset>
      <PreferencesSyncStatus />
    </section>
    <section className="mt-5 border border-border rounded-lg bg-surface p-5 sm:p-6"><h2 className="font-serif text-xl text-ink">Sua conta</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-graphite">Nome</dt><dd className="text-ink mt-1">{user?.name || '—'}</dd></div><div><dt className="text-graphite">E-mail</dt><dd className="text-ink mt-1 break-all">{user?.email || '—'}</dd></div></dl></section>
  </div>;
}
