/** Pendência transitória: um callback antigo nunca conclui uma nova entrada. */
export interface AuthEntryState { sequence: number; pendingId: number | null }
export type AuthEntryAction = { type: 'authenticated' } | { type: 'clear' } | { type: 'complete'; entryId: number };

export const initialAuthEntry: AuthEntryState = { sequence: 0, pendingId: null };

export function authEntryReducer(state: AuthEntryState, action: AuthEntryAction): AuthEntryState {
  switch (action.type) {
    case 'authenticated': return { sequence: state.sequence + 1, pendingId: state.sequence + 1 };
    case 'clear': return state.pendingId === null ? state : { ...state, pendingId: null };
    case 'complete': return state.pendingId === action.entryId ? { ...state, pendingId: null } : state;
  }
}

/** Inclui uma margem para buffering, com limite mesmo em mídia sem duração válida. */
export function introPlaybackTimeout(duration: number): number {
  return Number.isFinite(duration) && duration > 0 ? Math.min(60_000, Math.max(8_000, duration * 1000 + 5000)) : 30_000;
}
