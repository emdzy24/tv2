import type { Cell, Difficulty, Language, PointValue, Question } from '../types'

/** One category's three questions, written ahead of time by the bank script. */
export interface BankSet {
  id: string
  category: string
  language: Language
  difficulty: Difficulty
  cells: { value: PointValue; question: Question }[]
}

export interface Bank {
  version: number
  generatedAt: string
  sets: BankSet[]
}

const BANK_URL = '/questions/bank.json'
const USED_KEY = 'team-quiz:used-sets:v1'
/** Remember enough history that a rematch is not a rerun, but not forever. */
const USED_LIMIT = 400

let cached: Promise<Bank> | null = null

/** Loaded once per session. A missing or unreadable bank simply means no bank. */
export function loadBank(): Promise<Bank> {
  if (!cached) {
    cached = fetch(BANK_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Bank | null) =>
        data && Array.isArray(data.sets) ? data : { version: 1, generatedAt: '', sets: [] },
      )
      .catch(() => ({ version: 1, generatedAt: '', sets: [] }))
  }
  return cached
}

function readUsed(): string[] {
  try {
    const raw = localStorage.getItem(USED_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function rememberUsed(ids: string[]): void {
  if (!ids.length) return
  try {
    const merged = [...readUsed(), ...ids]
    localStorage.setItem(USED_KEY, JSON.stringify(merged.slice(-USED_LIMIT)))
  } catch {
    // Not being able to remember only risks a repeat, never a broken game.
  }
}

const key = (category: string) => category.trim().toLowerCase()

/**
 * Picks one unused set per category, returned in the order the categories were
 * given. A null entry is a category the bank cannot serve, which the caller
 * falls back to writing live.
 */
export function drawFromBank(
  bank: Bank,
  categories: string[],
  language: Language,
  difficulty: Difficulty,
): (BankSet | null)[] {
  const used = new Set(readUsed())
  const drawn: (BankSet | null)[] = []
  const taken = new Set<string>()

  for (const category of categories) {
    const candidates = bank.sets.filter(
      (set) =>
        key(set.category) === key(category) &&
        set.language === language &&
        set.difficulty === difficulty &&
        set.cells.length > 0 &&
        !taken.has(set.id),
    )
    // Prefer sets this device has never served; fall back to the oldest seen
    // rather than refusing to play once every set has been used.
    const fresh = candidates.filter((set) => !used.has(set.id))
    const pool = fresh.length ? fresh : candidates

    if (!pool.length) {
      drawn.push(null)
      continue
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)]
    taken.add(chosen.id)
    drawn.push(chosen)
  }

  return drawn
}

export function toCells(set: BankSet): Cell[] {
  return set.cells.map(({ value, question }) => ({ value, played: false, question }))
}
