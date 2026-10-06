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

/**
 * A configuração do Pomodoro (duração dos ciclos) é preferência local do
 * navegador, não dado do usuário no backend — por isso localStorage aqui é
 * apropriado (diferente de artifacts, isto é o app real). O que É dado do
 * usuário (quantos ciclos uma sessão completou) vai para o StudySession via
 * API, não para localStorage.
 */
export function loadPomodoroConfig(): PomodoroConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_POMODORO_CONFIG;
    return { ...DEFAULT_POMODORO_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_POMODORO_CONFIG;
  }
}

export function savePomodoroConfig(config: PomodoroConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Indisponível (modo privado etc.) — a config simplesmente não persiste.
  }
}

export type PomodoroPhase = 'focus' | 'short_break' | 'long_break';

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
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1h 20min" — usado no histórico de sessões. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min`;
  return `${safe}s`;
}
