import type { QuestionSet, Verdict } from './_lib.js'

export const TIERS = [
  { tier: 'easy', value: 2 },
  { tier: 'medium', value: 4 },
  { tier: 'hard', value: 6 },
] as const

export type Tier = (typeof TIERS)[number]['tier']

export type Question =
  | { format: 'choice'; prompt: string; options: string[]; correctIndex: number }
  | { format: 'open'; prompt: string; answer: string; accepted: string[] }

/** Structural checks the model could get wrong regardless of what it claims. */
export function structurallyValid(set: QuestionSet, tier: Tier): boolean {
  if (tier === 'easy') {
    const { prompt, options, correctIndex } = set.easy
    return (
      prompt.trim().length > 0 &&
      options.length === 4 &&
      options.every((option) => option.trim().length > 0) &&
      new Set(options.map((o) => o.trim().toLowerCase())).size === 4 &&
      Number.isInteger(correctIndex) &&
      correctIndex >= 0 &&
      correctIndex < 4
    )
  }
  const open = set[tier]
  return open.prompt.trim().length > 0 && open.answer.trim().length > 0
}

/** Folds the verifier's corrections into a set, and reports what it could not save. */
export function applyVerdict(set: QuestionSet, verdict: Verdict): { set: QuestionSet; failed: Tier[] } {
  const corrected: QuestionSet = structuredClone(set)
  const failed: Tier[] = []

  for (const { tier } of TIERS) {
    const result = verdict.results.find((entry) => entry.tier === tier)

    if (tier === 'easy') {
      if (result && !result.ok) {
        const index = result.correctedIndex
        if (Number.isInteger(index) && index >= 0 && index < corrected.easy.options.length) {
          corrected.easy.correctIndex = index
        } else {
          failed.push(tier)
        }
      }
    } else {
      const open = corrected[tier]
      if (result?.extraAccepted?.length) {
        open.accepted = [...new Set([...open.accepted, ...result.extraAccepted])].filter(Boolean)
      }
      if (result && !result.ok) {
        if (result.correctedAnswer.trim()) {
          open.answer = result.correctedAnswer.trim()
        } else {
          failed.push(tier)
        }
      }
    }

    // A verdict the model skipped is not a pass, and neither is a malformed question.
    if (!result || !structurallyValid(corrected, tier)) {
      if (!failed.includes(tier)) failed.push(tier)
    }
  }

  return { set: corrected, failed }
}

export function toQuestion(set: QuestionSet, tier: Tier): Question {
  if (tier === 'easy') {
    return {
      format: 'choice',
      prompt: set.easy.prompt.trim(),
      options: set.easy.options.map((option) => option.trim()),
      correctIndex: set.easy.correctIndex,
    }
  }
  const open = set[tier]
  return {
    format: 'open',
    prompt: open.prompt.trim(),
    answer: open.answer.trim(),
    accepted: open.accepted.map((entry) => entry.trim()).filter(Boolean),
  }
}

