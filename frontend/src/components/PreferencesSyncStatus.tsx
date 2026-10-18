import { useUserPreferences } from '../contexts/UserPreferencesContext';

/** Reutilizado onde uma preferência é editada: erro nunca aparenta gravação concluída. */
export function PreferencesSyncStatus() {
  const { ready, saving, error, retry } = useUserPreferences();
  if (error) return <div className="text-sm text-danger mt-3" role="alert">
    <p>{ready ? 'Há preferências ainda não salvas na conta.' : 'Não foi possível carregar as preferências da conta.'}</p>
    <button type="button" onClick={retry} className="min-h-11 text-crimson font-medium underline focus-visible:outline-2 focus-visible:outline-crimson">Tentar sincronizar novamente</button>
  </div>;
  return <p className="mt-3 text-xs text-muted" role="status">{!ready ? 'Carregando preferências…' : saving ? 'Salvando na conta…' : 'Preferências sincronizadas com sua conta.'}</p>;
}
