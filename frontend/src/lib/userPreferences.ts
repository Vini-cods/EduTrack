import { DEFAULT_POMODORO_CONFIG, normalizePomodoroConfig, type PomodoroConfig } from './pomodoro.ts';
import { DEFAULT_DAILY_CAPACITY, validDailyCapacity } from './analytics.ts';
import { normalizeThemePreference, type ThemePreference } from './theme.ts';

export interface UserPreferences {
  theme: ThemePreference;
  daily_capacity_hours: number;
  pomodoro: PomodoroConfig;
}

export interface PreferencesPatch {
  theme?: ThemePreference;
  daily_capacity_hours?: number;
  pomodoro?: Partial<PomodoroConfig>;
}

export function defaultUserPreferences(): UserPreferences {
  return { theme: 'system', daily_capacity_hours: DEFAULT_DAILY_CAPACITY, pomodoro: { ...DEFAULT_POMODORO_CONFIG } };
}

export function mergePreferences(value: UserPreferences, patch: PreferencesPatch): UserPreferences {
  return { ...value, ...patch, pomodoro: { ...value.pomodoro, ...patch.pomodoro } };
}

function mergePatches(first: PreferencesPatch, second: PreferencesPatch): PreferencesPatch {
  const merged = { ...first, ...second };
  if (first.pomodoro || second.pomodoro) merged.pomodoro = { ...first.pomodoro, ...second.pomodoro };
  return merged;
}

/** Cache por proprietário é fallback; a escolha de tema da entrada é aplicada separadamente. */
export function readCachedPreferences(userId: number): UserPreferences {
  const defaults = defaultUserPreferences();
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(`edutrack:preferences:${userId}`) || 'null');
    if (!raw || typeof raw !== 'object') return defaults;
    const value = raw as Partial<UserPreferences>;
    return { theme: normalizeThemePreference(value.theme),
      daily_capacity_hours: typeof value.daily_capacity_hours === 'number' && validDailyCapacity(value.daily_capacity_hours)
        ? value.daily_capacity_hours : defaults.daily_capacity_hours,
      pomodoro: normalizePomodoroConfig(value.pomodoro) };
  } catch { return defaults; }
}

export function cachePreferences(userId: number, value: UserPreferences): void {
  try { localStorage.setItem(`edutrack:preferences:${userId}`, JSON.stringify(value)); }
  catch { /* A sincronização do servidor não depende de armazenamento local. */ }
}

export interface PreferencesState {
  value: UserPreferences;
  ready: boolean;
  saving: boolean;
  error: boolean;
}

interface PreferencesTransport {
  read: (signal: AbortSignal) => Promise<UserPreferences>;
  patch: (patch: PreferencesPatch, signal: AbortSignal) => Promise<UserPreferences>;
}

/** Uma instância por login; só transfere o tema de entrada fornecido explicitamente. */
export class PreferencesSync {
  private controller = new AbortController();
  private dirty: PreferencesPatch = {};
  private pending: Promise<boolean> | null = null;
  private disposed = false;
  private transport: PreferencesTransport;
  private notify: (state: PreferencesState) => void;
  private entryTheme: ThemePreference | undefined;
  state: PreferencesState;
  constructor(initial: UserPreferences, transport: PreferencesTransport, notify: (state: PreferencesState) => void, entryTheme?: ThemePreference) {
    this.transport = transport;
    this.notify = notify;
    this.entryTheme = entryTheme;
    this.state = { value: entryTheme === undefined ? initial : mergePreferences(initial, { theme: entryTheme }), ready: false, saving: false, error: false };
  }
  private emit(patch: Partial<PreferencesState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.notify(this.state);
  }
  async load(): Promise<void> {
    if (this.disposed) return;
    this.emit({ error: false });
    try {
      const value = await this.transport.read(this.controller.signal);
      if (this.disposed) return;
      if (this.entryTheme !== undefined && value.theme !== this.entryTheme) {
        this.dirty = mergePatches(this.dirty, { theme: this.entryTheme });
      }
      this.entryTheme = undefined;
      this.emit({ value: mergePreferences(value, this.dirty), ready: true, error: false });
      if (Object.keys(this.dirty).length) await this.flush();
    } catch {
      this.emit({ error: true });
    }
  }
  update(patch: PreferencesPatch): Promise<boolean> {
    if (!this.state.ready || this.disposed) return Promise.resolve(false);
    this.dirty = mergePatches(this.dirty, patch);
    this.emit({ value: mergePreferences(this.state.value, patch) });
    return this.flush();
  }
  private flush(): Promise<boolean> {
    if (this.pending) return this.pending;
    this.pending = this.flushQueue().finally(() => { this.pending = null; });
    return this.pending;
  }
  private async flushQueue(): Promise<boolean> {
    this.emit({ saving: true, error: false });
    while (Object.keys(this.dirty).length && !this.disposed) {
      const patch = this.dirty;
      this.dirty = {};
      try {
        const value = await this.transport.patch(patch, this.controller.signal);
        this.emit({ value: mergePreferences(value, this.dirty) });
      } catch {
        this.dirty = mergePatches(patch, this.dirty);
        this.emit({ error: true, saving: false });
        return false;
      }
    }
    this.emit({ saving: false });
    return !this.disposed;
  }
  async retry(): Promise<void> {
    if (!this.state.ready) await this.load();
    else if (Object.keys(this.dirty).length) await this.flush();
    else await this.load();
  }
  dispose(): void {
    this.disposed = true;
    this.controller.abort();
  }
}
