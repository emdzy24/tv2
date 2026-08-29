import {
  SPEED_BONUS_POINTS,
  SPEED_BONUS_WINDOW_SECONDS,
  type ActiveQuestion,
  type Category,
  type GameState,
  type Judgement,
  type PointValue,
  type Question,
  type Settings,
  type Team,
} from '../types'
import { gradeOpenAnswer } from './grading'

/** A stolen question is worth half, and the steal timer is half as long. */
export const stealValue = (value: PointValue): number => value / 2
export const stealSeconds = (seconds: number): number => Math.round(seconds / 2)

export function createTeams(names: string[]): Team[] {
  return names.map((name, i) => ({ id: `team-${i}`, name: name.trim(), score: 0 }))
}

export function createGame(settings: Settings, categories: Category[]): GameState {
  return {
    phase: 'board',
    settings,
    teams: createTeams(settings.teamNames),
    categories,
    turnIndex: 0,
    active: null,
    judgement: null,
    stealTeamId: null,
  }
}

export function findCell(state: GameState, categoryId: string, value: PointValue) {
  const category = state.categories.find((c) => c.id === categoryId)
  return category?.cells.find((cell) => cell.value === value)
}

export function boardIsEmpty(categories: Category[]): boolean {
  return categories.every((category) => category.cells.every((cell) => cell.played))
}

export function isCorrect(question: Question, given: string): boolean {
  if (question.format === 'choice') {
    return given === question.options[question.correctIndex]
  }
  return gradeOpenAnswer(question, given)
}

export function correctAnswerText(question: Question): string {
  return question.format === 'choice' ? question.options[question.correctIndex] : question.answer
}

function pointsFor(
  state: GameState,
  active: ActiveQuestion,
  correct: boolean,
  elapsed: number,
): { points: number; speedBonusApplied: boolean } {
  if (!correct) return { points: 0, speedBonusApplied: false }

  const base = active.attempt === 'steal' ? stealValue(active.value) : active.value
  // Steals never earn the speed bonus.
  const earnsBonus =
    state.settings.speedBonus &&
    active.attempt === 'owner' &&
    elapsed <= SPEED_BONUS_WINDOW_SECONDS
  return {
    points: base + (earnsBonus ? SPEED_BONUS_POINTS : 0),
    speedBonusApplied: earnsBonus,
  }
}

export type Action =
  | { type: 'pick'; categoryId: string; value: PointValue }
  | { type: 'answer'; given: string; at: number }
  | { type: 'timeout'; at: number }
  | { type: 'override'; correct: boolean }
  | { type: 'continue' }
  | { type: 'steal'; accept: boolean }

/** Marks the played cell and moves to the board, the next turn, or game over. */
function resolveQuestion(state: GameState, nextTurnIndex: number): GameState {
  const active = state.active
  if (!active) return state

  const categories = state.categories.map((category) =>
    category.id !== active.categoryId
      ? category
      : {
          ...category,
          cells: category.cells.map((cell) =>
            cell.value === active.value ? { ...cell, played: true } : cell,
          ),
        },
  )

  const { endMode, targetScore } = state.settings
  const reachedTarget = endMode === 'target' && state.teams.some((t) => t.score >= targetScore)
  const over = boardIsEmpty(categories) || reachedTarget

  return {
    ...state,
    categories,
    phase: over ? 'gameover' : 'board',
    turnIndex: nextTurnIndex,
    active: null,
    judgement: null,
    stealTeamId: null,
  }
}

function award(teams: Team[], teamId: string, points: number): Team[] {
  if (points === 0) return teams
  return teams.map((team) => (team.id === teamId ? { ...team, score: team.score + points } : team))
}

function judge(state: GameState, given: string, at: number, timedOut: boolean): GameState {
  const active = state.active
  if (!active) return state

  const elapsed = Math.max(0, (at - active.startedAt) / 1000)
  const correct = timedOut ? false : isCorrect(active.question, given)
  const { points, speedBonusApplied } = pointsFor(state, active, correct, elapsed)

  const judgement: Judgement = {
    correct,
    given,
    timedOut,
    elapsed,
    overridden: false,
    points,
    speedBonusApplied,
  }

  return {
    ...state,
    phase: 'reveal',
    teams: award(state.teams, active.teamId, points),
    judgement,
  }
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'pick': {
      if (state.phase !== 'board') return state
      const cell = findCell(state, action.categoryId, action.value)
      if (!cell || cell.played) return state

      const team = state.teams[state.turnIndex]
      const active: ActiveQuestion = {
        categoryId: action.categoryId,
        value: action.value,
        question: cell.question,
        attempt: 'owner',
        teamId: team.id,
        ownerTeamId: team.id,
        startedAt: Date.now(),
        seconds: state.settings.secondsPerQuestion,
      }
      return { ...state, phase: 'question', active, judgement: null, stealTeamId: null }
    }

    case 'answer':
      if (state.phase !== 'question') return state
      return judge(state, action.given, action.at, false)

    case 'timeout':
      if (state.phase !== 'question') return state
      return judge(state, '', action.at, true)

    case 'override': {
      if (state.phase !== 'reveal' || !state.active || !state.judgement) return state
      const { active, judgement } = state
      if (judgement.correct === action.correct) return state

      // Undo whatever the automatic grading awarded, then apply the host's call.
      const teamsWithoutOld = award(state.teams, active.teamId, -judgement.points)
      const { points, speedBonusApplied } = pointsFor(
        state,
        active,
        action.correct,
        judgement.elapsed,
      )
      return {
        ...state,
        teams: award(teamsWithoutOld, active.teamId, points),
        judgement: {
          ...judgement,
          correct: action.correct,
          overridden: true,
          points,
          speedBonusApplied,
        },
      }
    }

    case 'continue': {
      if (state.phase !== 'reveal' || !state.active || !state.judgement) return state
      const { active, judgement } = state
      const ownerIndex = state.teams.findIndex((t) => t.id === active.ownerTeamId)
      const nextIndex = (ownerIndex + 1) % state.teams.length

      if (judgement.correct) {
        // A successful steal seizes the turn: the thief picks next.
        const stealerIndex = state.teams.findIndex((t) => t.id === active.teamId)
        return resolveQuestion(state, active.attempt === 'steal' ? stealerIndex : nextIndex)
      }

      // Only the next team in order may steal, and only after the owner misses.
      if (active.attempt === 'owner' && state.teams.length > 1) {
        return {
          ...state,
          phase: 'steal-offer',
          stealTeamId: state.teams[nextIndex].id,
        }
      }
      return resolveQuestion(state, nextIndex)
    }

    case 'steal': {
      if (state.phase !== 'steal-offer' || !state.active || !state.stealTeamId) return state
      const ownerIndex = state.teams.findIndex((t) => t.id === state.active!.ownerTeamId)
      const nextIndex = (ownerIndex + 1) % state.teams.length

      if (!action.accept) return resolveQuestion(state, nextIndex)

      return {
        ...state,
        phase: 'question',
        judgement: null,
        active: {
          ...state.active,
          attempt: 'steal',
          teamId: state.stealTeamId,
          startedAt: Date.now(),
          seconds: stealSeconds(state.settings.secondsPerQuestion),
        },
      }
    }
  }
}

export function winners(teams: Team[]): Team[] {
  const best = Math.max(...teams.map((t) => t.score))
  return teams.filter((t) => t.score === best)
}
