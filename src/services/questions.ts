import { drawFromBank, loadBank, rememberUsed, toCells } from './bank'
import {
  POINT_VALUES,
  type Category,
  type Cell,
  type Difficulty,
  type Language,
  type PointValue,
  type Question,
} from '../types'

export interface GenerationRequest {
  language: Language
  categories: string[]
  difficulty: Difficulty
}

export type ProgressHandler = (done: number, total: number) => void

/** How many categories are written at once. Each one is two model calls. */
const CONCURRENCY = 3

const USE_MOCK = import.meta.env.VITE_USE_MOCK_QUESTIONS === 'true'

interface GeneratedCategory {
  cells: Cell[]
  /** Prompts to hand the next request so the board has no repeats. */
  prompts: string[]
}

/**
 * Writes the whole board up front, three questions at a time, reporting progress
 * so the loading screen fills in as categories land. Categories that cannot be
 * written are left out rather than blocking the game.
 */
export async function generateBoard(
  request: GenerationRequest,
  onProgress: ProgressHandler,
  signal?: AbortSignal,
): Promise<Category[]> {
  const total = request.categories.length * POINT_VALUES.length
  let done = 0
  onProgress(0, total)

  const results = new Array<GeneratedCategory | null>(request.categories.length).fill(null)
  const used: string[] = []
  const failures: string[] = []

  // Anything the bank already holds is instant and free; only the rest is
  // written live. An empty bank simply means every category falls through.
  const pending: number[] = []
  if (USE_MOCK) {
    pending.push(...request.categories.map((_, index) => index))
  } else {
    const drawn = drawFromBank(
      await loadBank(),
      request.categories,
      request.language,
      request.difficulty,
    )
    const servedIds: string[] = []
    drawn.forEach((set, index) => {
      if (!set) return pending.push(index)
      const cells = toCells(set)
      results[index] = { cells, prompts: cells.map((cell) => cell.question.prompt) }
      used.push(...results[index]!.prompts)
      servedIds.push(set.id)
      done = Math.min(total, done + POINT_VALUES.length)
    })
    rememberUsed(servedIds)
    onProgress(done, total)
  }

  let next = 0

  const worker = async () => {
    while (next < pending.length) {
      const index = pending[next++]
      const name = request.categories[index]
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      try {
        const generated = USE_MOCK
          ? await mockCategory(name, request)
          : await requestCategory(name, request, [...used], signal)
        results[index] = generated
        used.push(...generated.prompts)
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') throw error
        console.error(`Skipping category "${name}":`, error)
        failures.push(error instanceof Error ? error.message : String(error))
      }

      // A category counts as finished whether or not every question survived,
      // so the progress bar always reaches the end.
      done = Math.min(total, done + POINT_VALUES.length)
      onProgress(done, total)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker))

  const categories = results
    .map((result, index) =>
      result && result.cells.length
        ? { id: `cat-${index}`, name: request.categories[index], cells: result.cells }
        : null,
    )
    .filter((category): category is Category => category !== null)

  if (!categories.length) {
    throw new Error(failures[0] ?? 'No questions could be written for this board.')
  }
  onProgress(total, total)
  return categories
}

async function requestCategory(
  category: string,
  request: GenerationRequest,
  avoid: string[],
  signal?: AbortSignal,
): Promise<GeneratedCategory> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category,
      language: request.language,
      difficulty: request.difficulty,
      avoid,
    }),
    signal,
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.error ?? `The question service returned ${response.status}`)
  }

  const payload = (await response.json()) as {
    cells: { value: PointValue; question: Question }[]
  }
  const cells: Cell[] = (payload.cells ?? []).map(({ value, question }) => ({
    value,
    played: false,
    question,
  }))

  return { cells, prompts: cells.map((cell) => cell.question.prompt) }
}

/** Offline stand-in for local development, enabled with VITE_USE_MOCK_QUESTIONS=true. */
async function mockCategory(
  category: string,
  request: GenerationRequest,
): Promise<GeneratedCategory> {
  const labels: Record<Language, (value: PointValue) => string> = {
    en: (value) => `${category} — placeholder question worth ${value} points`,
    es: (value) => `${category} — pregunta de ejemplo por ${value} puntos`,
    lt: (value) => `${category} — pavyzdinis klausimas už ${value} taškų`,
  }

  await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 300))

  const cells: Cell[] = POINT_VALUES.map((value) => {
    const prompt = labels[request.language](value)
    if (value === 2) {
      const correctIndex = Math.floor(Math.random() * 4)
      return {
        value,
        played: false,
        question: {
          format: 'choice',
          prompt,
          options: ['Alpha', 'Bravo', 'Charlie', 'Delta'].map((option, i) =>
            i === correctIndex ? `${option} (correct)` : option,
          ),
          correctIndex,
          fact: 'Placeholder background note about this answer.',
          related: ['Alpha — first', 'Bravo — second', 'Charlie — third'],
        },
      }
    }
    return {
      value,
      played: false,
      question: {
        format: 'open',
        prompt,
        answer: 'Vilnius',
        accepted: ['Vilnius, Lithuania'],
        fact: 'Placeholder background note about this answer.',
        related: ['Vilnius — 580,000', 'Kaunas — 300,000', 'Klaipėda — 160,000'],
      },
    }
  })

  return { cells, prompts: cells.map((cell) => cell.question.prompt) }
}
