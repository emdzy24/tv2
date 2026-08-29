import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateSet, verifySet, type Difficulty, type Language } from './_lib.js'
import { applyVerdict, TIERS, toQuestion } from './_validate.js'

const LANGUAGES: Language[] = ['en', 'es', 'lt']
const DIFFICULTIES: Difficulty[] = ['casual', 'balanced', 'hard']

/** Two model calls per request, plus one retry in the worst case. */
export const maxDuration = 60

/** Leave enough headroom to finish a retry before the function is cut off. */
const RETRY_DEADLINE_MS = 30_000

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Use POST' })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return response
      .status(500)
      .json({ error: 'ANTHROPIC_API_KEY is not set on the server, so questions cannot be written.' })
  }

  const body = (typeof request.body === 'string' ? JSON.parse(request.body) : request.body) ?? {}
  const category = String(body.category ?? '').trim()
  const language = body.language as Language
  const difficulty = body.difficulty as Difficulty
  const avoid: string[] = Array.isArray(body.avoid) ? body.avoid.slice(0, 60).map(String) : []

  if (!category || !LANGUAGES.includes(language) || !DIFFICULTIES.includes(difficulty)) {
    return response.status(400).json({ error: 'category, language and difficulty are required' })
  }

  const started = Date.now()

  try {
    let set = await generateSet(category, language, difficulty, avoid)
    let { set: checked, failed } = applyVerdict(set, await verifySet(set, language))

    // One more attempt for anything the verifier could not repair.
    if (failed.length && Date.now() - started < RETRY_DEADLINE_MS) {
      try {
        set = await generateSet(category, language, difficulty, avoid)
        const retry = applyVerdict(set, await verifySet(set, language))
        if (retry.failed.length < failed.length) {
          checked = retry.set
          failed = retry.failed
        }
      } catch {
        // Keep the first attempt's usable questions rather than losing the category.
      }
    }

    const cells = TIERS.filter(({ tier }) => !failed.includes(tier)).map(({ tier, value }) => ({
      value,
      question: toQuestion(checked, tier),
    }))

    return response.status(200).json({
      category,
      cells,
      dropped: failed.map((tier) => TIERS.find((entry) => entry.tier === tier)!.value),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Question generation failed for "${category}":`, message)
    return response.status(502).json({ error: `Could not write questions for ${category}` })
  }
}
