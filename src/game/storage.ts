import type { GameState } from '../types'

const KEY = 'team-quiz:game:v1'

/** Keeps a game alive across an accidental refresh. */
export function saveGame(state: GameState): void {
  try {
    if (state.phase === 'setup' || state.phase === 'loading') {
      localStorage.removeItem(KEY)
      return
    }
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // A full or blocked storage quota must never break a game in progress.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as GameState
    if (!state?.teams?.length || !state?.categories?.length) return null
    // A timer cannot be resumed meaningfully, so send an interrupted question
    // back to the board rather than restoring a stale countdown.
    if (state.phase === 'question') {
      return { ...state, phase: 'board', active: null, judgement: null, stealTeamId: null }
    }
    return state
  } catch {
    return null
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Ignore — clearing is best effort.
  }
}
