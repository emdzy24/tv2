export type Language = 'en' | 'es' | 'lt'
export type Difficulty = 'casual' | 'balanced' | 'hard'
export type PointValue = 2 | 4 | 6
export type EndMode = 'board' | 'target'

export const POINT_VALUES: PointValue[] = [2, 4, 6]
export const TIME_OPTIONS = [60, 120, 180] as const
export const MIN_TEAMS = 2
export const MAX_TEAMS = 5
export const MIN_CATEGORIES = 3
export const MAX_CATEGORIES = 15
/** Answering within this many seconds of the start earns the speed bonus. */
export const SPEED_BONUS_WINDOW_SECONDS = 15
export const SPEED_BONUS_POINTS = 1

export interface Team {
  id: string
  name: string
  score: number
}

export interface Settings {
  language: Language
  teamNames: string[]
  categories: string[]
  secondsPerQuestion: number
  difficulty: Difficulty
  speedBonus: boolean
  endMode: EndMode
  targetScore: number
}

/** Context shown behind a button once the answer is out. */
export interface Background {
  /** A sentence or two on why the answer is interesting. */
  fact?: string
  /** A few short lines putting the answer in context, e.g. the rest of a top five. */
  related?: string[]
}

/** A 2-point multiple-choice question. */
export interface ChoiceQuestion extends Background {
  format: 'choice'
  prompt: string
  options: string[]
  correctIndex: number
}

/** A 4- or 6-point typed-answer question. */
export interface OpenQuestion extends Background {
  format: 'open'
  prompt: string
  answer: string
  /** Other spellings and phrasings that also count as correct. */
  accepted: string[]
}

export type Question = ChoiceQuestion | OpenQuestion

export interface Cell {
  value: PointValue
  played: boolean
  question: Question
}

export interface Category {
  id: string
  name: string
  cells: Cell[]
}

/** Which team is on the hook for the question currently on screen. */
export type Attempt = 'owner' | 'steal'

export interface ActiveQuestion {
  categoryId: string
  value: PointValue
  question: Question
  attempt: Attempt
  /** Team currently answering. */
  teamId: string
  /** The team whose turn it was when the question was picked. */
  ownerTeamId: string
  /** Epoch ms when this attempt's timer started. */
  startedAt: number
  /** Seconds allowed for this attempt. */
  seconds: number
}

export interface Judgement {
  correct: boolean
  /** The answer as the team gave it. Empty when the timer ran out. */
  given: string
  timedOut: boolean
  /** Seconds taken, used for the speed bonus. */
  elapsed: number
  /** Set when the host overrode the automatic grading. */
  overridden: boolean
  points: number
  speedBonusApplied: boolean
}

export type Phase = 'setup' | 'loading' | 'board' | 'question' | 'reveal' | 'steal-offer' | 'gameover'

export interface GameState {
  phase: Phase
  settings: Settings
  teams: Team[]
  categories: Category[]
  /** Index into `teams` — whose turn it is to pick. */
  turnIndex: number
  active: ActiveQuestion | null
  judgement: Judgement | null
  /** Set once the owner has missed, naming the team offered the steal. */
  stealTeamId: string | null
}
