import { POINT_VALUES, type Category, type Difficulty, type Language, type PointValue, type Question } from '../types'

export interface GenerationRequest {
  language: Language
  categories: string[]
  difficulty: Difficulty
}

export type ProgressHandler = (done: number, total: number) => void

/**
 * Builds the whole board up front, reporting progress so the loading screen can
 * fill in as questions land.
 *
 * TODO: replace `mockQuestion` with a call to the Vercel function that asks
 * Claude for each question and runs the verification pass. The signature is
 * already the one the real service needs — only the body changes.
 */
export async function generateBoard(
  request: GenerationRequest,
  onProgress: ProgressHandler,
  signal?: AbortSignal,
): Promise<Category[]> {
  const total = request.categories.length * POINT_VALUES.length
  let done = 0
  onProgress(0, total)

  const categories: Category[] = []
  for (const [index, name] of request.categories.entries()) {
    const cells = []
    for (const value of POINT_VALUES) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const question = await mockQuestion(name, value, request)
      cells.push({ value, played: false, question })
      onProgress(++done, total)
    }
    categories.push({ id: `cat-${index}`, name, cells })
  }
  return categories
}

const PLACEHOLDER_PROMPTS: Record<Language, (category: string, value: PointValue) => string> = {
  en: (category, value) => `${category} — placeholder question worth ${value} points`,
  es: (category, value) => `${category} — pregunta de ejemplo por ${value} puntos`,
  lt: (category, value) => `${category} — pavyzdinis klausimas už ${value} taškų`,
}

/** Stand-in question so the whole game loop is playable before the AI is wired up. */
async function mockQuestion(
  category: string,
  value: PointValue,
  request: GenerationRequest,
): Promise<Question> {
  await new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180))
  const prompt = PLACEHOLDER_PROMPTS[request.language](category, value)

  if (value === 2) {
    const correctIndex = Math.floor(Math.random() * 4)
    return {
      format: 'choice',
      prompt,
      options: ['Alpha', 'Bravo', 'Charlie', 'Delta'].map((option, i) =>
        i === correctIndex ? `${option} (correct)` : option,
      ),
      correctIndex,
    }
  }

  return {
    format: 'open',
    prompt,
    answer: 'Vilnius',
    accepted: ['Vilnius, Lithuania'],
  }
}
