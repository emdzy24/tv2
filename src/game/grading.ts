import type { OpenQuestion } from '../types'

/** Strips case, accents, punctuation and filler words so answers compare fairly. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/^(the|a|an|el|la|los|las|un|una)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein distance, used to forgive small typing mistakes. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution)
    }
    previous = current
  }
  return previous[b.length]
}

/** How many character mistakes to forgive for an answer of this length. */
function tolerance(length: number): number {
  if (length <= 4) return 1
  if (length <= 8) return 2
  return 3
}

/**
 * Local grading for typed answers: exact match, near-match with small spelling
 * mistakes forgiven, or an accepted alternate. The AI grader replaces this
 * once the generation service is wired up; the host can always override.
 */
export function gradeOpenAnswer(question: OpenQuestion, given: string): boolean {
  const answer = normalize(given)
  if (!answer) return false

  const candidates = [question.answer, ...question.accepted].map(normalize).filter(Boolean)
  return candidates.some((candidate) => {
    if (candidate === answer) return true
    if (editDistance(candidate, answer) <= tolerance(candidate.length)) return true
    // A longer answer that contains the whole expected answer still counts,
    // e.g. "Vilnius, Lithuania" for "Vilnius".
    return candidate.length >= 4 && answer.includes(candidate)
  })
}
