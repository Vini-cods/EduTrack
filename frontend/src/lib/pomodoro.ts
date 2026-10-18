export interface PomodoroConfig {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesUntilLongBreak: number;
}

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesUntilLongBreak: 4,
};

const STORAGE_KEY = 'edutrack:pomodoro-config';
const TIMER_STORAGE_KEY = 'edutrack:pomodoro-timer';

export const POMODORO_LIMITS: Record<keyof PomodoroConfig, number> = {
  focusMinutes: 180,
  shortBreakMinutes: 60,
  longBreakMinutes: 120,
  cyclesUntilLongBreak: 12,
};

/** Dados locais podem estar antigos, corrompidos ou ter sido editados. */
export function normalizePomodoroConfig(value: unknown): PomodoroConfig {
  const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const result = { ...DEFAULT_POMODORO_CONFIG };
  for (const field of Object.keys(result) as (keyof PomodoroConfig)[]) {
    const candidate = source[field];
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 1) {
      result[field] = Math.min(POMODORO_LIMITS[field], Math.floor(candidate));
    }
  }
  return result;
}

/**
 * Leitura legada do navegador; contas autenticadas usam UserPreferencesContext.
 * Não importar esta chave global para uma conta: ela não identifica o proprietário.
 * Um snapshot por id de sessão
 * recupera apenas o relógio transitório; o tempo estudado vem do servidor
 * e os ciclos concluídos são enviados à StudySession ao finalizar.
 */
export function loadPomodoroConfig(): PomodoroConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizePomodoroConfig(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_POMODORO_CONFIG };
  }
}

export function savePomodoroConfig(config: PomodoroConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePomodoroConfig(config)));
  } catch {
    // Indisponível (modo privado etc.) — a config simplesmente não persiste.
  }
}

export type PomodoroPhase = 'focus' | 'short_break' | 'long_break';

/** O servidor continua sendo a fonte do tempo estudado; isto só recupera o relógio local. */
export interface PomodoroTimer {
  sessionId: number;
  phase: PomodoroPhase;
  remainingMs: number;
  deadline: number | null;
  cyclesCompleted: number;
  manuallyPaused: boolean;
}

export function remainingTimerMilliseconds(timer: PomodoroTimer, now: number): number {
  return timer.deadline === null ? timer.remainingMs : Math.max(0, timer.deadline - now);
}

export function createPomodoroTimer(
  sessionId: number,
  phase: PomodoroPhase,
  cyclesCompleted: number,
  config: PomodoroConfig,
  now: number,
): PomodoroTimer {
  const remainingMs = phaseDurationSeconds(phase, config) * 1000;
  return { sessionId, phase, remainingMs, deadline: now + remainingMs, cyclesCompleted, manuallyPaused: false };
}

export function pausePomodoroTimer(timer: PomodoroTimer, now: number): PomodoroTimer {
  return { ...timer, remainingMs: remainingTimerMilliseconds(timer, now), deadline: null, manuallyPaused: true };
}

export function resumePomodoroTimer(timer: PomodoroTimer, now: number): PomodoroTimer {
  return { ...timer, deadline: now + timer.remainingMs, manuallyPaused: false };
}

export function restorePomodoroTimer(
  value: unknown,
  sessionId: number,
  status: 'em_andamento' | 'pausada',
  config: PomodoroConfig,
  now: number,
): PomodoroTimer {
  const fallback = createPomodoroTimer(sessionId, 'focus', 0, config, now);
  const source = typeof value === 'object' && value !== null ? value as Partial<PomodoroTimer> : {};
  const valid = source.sessionId === sessionId
    && ['focus', 'short_break', 'long_break'].includes(source.phase ?? '')
    && typeof source.remainingMs === 'number' && Number.isFinite(source.remainingMs)
    && source.remainingMs >= 0 && source.remainingMs <= POMODORO_LIMITS.focusMinutes * 60_000
    && (source.deadline === null || typeof source.deadline === 'number' && Number.isFinite(source.deadline))
    && typeof source.cyclesCompleted === 'number' && Number.isSafeInteger(source.cyclesCompleted) && source.cyclesCompleted >= 0
    && typeof source.manuallyPaused === 'boolean' && source.manuallyPaused === (source.deadline === null);
  let timer = valid ? source as PomodoroTimer : fallback;

  // Uma pausa local nunca pode declarar estudo se o servidor está contando tempo.
  if (timer.phase !== 'focus' && status === 'em_andamento') {
    timer = { ...fallback, cyclesCompleted: timer.cyclesCompleted };
  }
  if (timer.phase === 'focus' && status === 'pausada') return pausePomodoroTimer(timer, now);
  if (timer.phase === 'focus' && timer.manuallyPaused) return resumePomodoroTimer(timer, now);
  return timer;
}

export function loadPomodoroTimer(
  sessionId: number,
  status: 'em_andamento' | 'pausada',
  config: PomodoroConfig,
  now: number,
): PomodoroTimer {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    return restorePomodoroTimer(raw ? JSON.parse(raw) : null, sessionId, status, config, now);
  } catch {
    return restorePomodoroTimer(null, sessionId, status, config, now);
  }
}

export function savePomodoroTimer(timer: PomodoroTimer): void {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
  } catch {
    // A execução continua quando o navegador não permite persistência local.
  }
}

export function clearPomodoroTimer(): void {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch {
    // Sem persistência local para limpar.
  }
}

/** Confirma uma resposta perdida sem executar a mutação novamente. */
export async function confirmSessionMutation<T extends { id: number; status: string }>(
  sessionId: number,
  expectedStatus: string,
  mutate: () => Promise<T>,
  recover: () => Promise<T | null>,
): Promise<T> {
  try {
    return await mutate();
  } catch (error) {
    try {
      const recovered = await recover();
      if (recovered?.id === sessionId && recovered.status === expectedStatus) return recovered;
    } catch {
      // O erro original descreve a ação que o estudante tentou executar.
    }
    throw error;
  }
}

/** Depois de um foco, decide se a próxima pausa é curta ou longa. Depois de qualquer pausa, volta ao foco. */
export function nextPhase(current: PomodoroPhase, cyclesCompletedAfter: number, config: PomodoroConfig): PomodoroPhase {
  if (current !== 'focus') return 'focus';
  const isLongBreak = cyclesCompletedAfter > 0 && cyclesCompletedAfter % config.cyclesUntilLongBreak === 0;
  return isLongBreak ? 'long_break' : 'short_break';
}

export function phaseDurationSeconds(phase: PomodoroPhase, config: PomodoroConfig): number {
  if (phase === 'focus') return config.focusMinutes * 60;
  if (phase === 'short_break') return config.shortBreakMinutes * 60;
  return config.longBreakMinutes * 60;
}

export const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: 'Foco',
  short_break: 'Pausa curta',
  long_break: 'Pausa longa',
};

/** "01:23:45" ou "23:45" — usado no cronômetro grande do Focus Mode. */
export function formatClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1h 20min" — usado no histórico de sessões. */
export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min`;
  return `${safe}s`;
}
