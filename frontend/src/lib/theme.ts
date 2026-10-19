export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'edutrack:theme';

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

export function readThemePreference(): ThemePreference {
  try { return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY)); }
  catch { return 'system'; }
}

function readStoredTheme(key: string): ThemePreference | undefined {
  try {
    const value = localStorage.getItem(key);
    return value === 'light' || value === 'dark' || value === 'system' ? value : undefined;
  } catch { return undefined; }
}

/** Cobre o intervalo entre receber o token e confirmar a identidade em /auth/me. */
export function readEntryTheme(): ThemePreference | undefined {
  return readStoredTheme('edutrack:entry-theme');
}

export function rememberEntryTheme(theme: ThemePreference): void {
  try { localStorage.setItem('edutrack:entry-theme', theme); }
  catch { /* A sessão atual mantém a escolha mesmo sem storage. */ }
}

export function clearEntryTheme(expectedTheme?: ThemePreference): void {
  try {
    if (expectedTheme === undefined || readEntryTheme() === expectedTheme) localStorage.removeItem('edutrack:entry-theme');
  } catch { /* O registro só é lido ao restaurar uma sessão autenticada. */ }
}

/** Intenção explícita da entrada, isolada por conta até o servidor confirmá-la. */
export function readPendingTheme(userId: number): ThemePreference | undefined {
  return readStoredTheme(`edutrack:pending-theme:${userId}`);
}

export function rememberPendingTheme(userId: number, theme: ThemePreference): boolean {
  try { localStorage.setItem(`edutrack:pending-theme:${userId}`, theme); return true; }
  catch { return false; }
}

export function confirmPendingTheme(userId: number, theme: ThemePreference): void {
  try {
    if (readPendingTheme(userId) === theme) localStorage.removeItem(`edutrack:pending-theme:${userId}`);
  } catch { /* Uma confirmação futura pode limpar a intenção local. */ }
}

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}
