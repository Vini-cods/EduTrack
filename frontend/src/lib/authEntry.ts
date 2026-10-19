import type { ThemePreference } from './theme.ts';

/** Pendência transitória: um callback antigo nunca conclui uma nova entrada. */
export interface AuthEntryState { sequence: number; pendingId: number | null; theme: ThemePreference | null }
export type AuthEntryAction = { type: 'authenticated'; theme: ThemePreference } | { type: 'clear' } | { type: 'complete'; entryId: number };

export const initialAuthEntry: AuthEntryState = { sequence: 0, pendingId: null, theme: null };

export function authEntryReducer(state: AuthEntryState, action: AuthEntryAction): AuthEntryState {
  switch (action.type) {
    case 'authenticated': return { sequence: state.sequence + 1, pendingId: state.sequence + 1, theme: action.theme };
    case 'clear': return state.pendingId === null && state.theme === null ? state : { ...state, pendingId: null, theme: null };
    case 'complete': return state.pendingId === action.entryId ? { ...state, pendingId: null } : state;
  }
}

/** Inclui uma margem para buffering, com limite mesmo em mídia sem duração válida. */
export function introPlaybackTimeout(duration: number): number {
  return Number.isFinite(duration) && duration > 0 ? Math.min(60_000, Math.max(8_000, duration * 1000 + 5000)) : 30_000;
}
