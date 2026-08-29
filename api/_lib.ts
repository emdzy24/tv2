import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

export const MODEL = 'claude-opus-5'

export type Language = 'en' | 'es' | 'lt'
export type Difficulty = 'casual' | 'balanced' | 'hard'

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Spanish',
  lt: 'Lithuanian',
}

/** How hard each point tier should feel, shifted by the game's difficulty setting. */
const DIFFICULTY_GUIDE: Record<Difficulty, string> = {
  casual:
    'This is a relaxed pub-quiz crowd. The 2-pointer should be common knowledge almost everyone has, the 4-pointer something a casual fan of the topic knows, and the 6-pointer a question an enthusiast would get after a moment of thought.',
  balanced:
    'This is a mixed crowd. The 2-pointer should be widely known, the 4-pointer should take some thought, and the 6-pointer should challenge someone who follows the topic closely.',
  hard:
    'This is a knowledgeable, competitive crowd. The 2-pointer should already take thought, the 4-pointer should be genuinely difficult, and the 6-pointer should stump all but a specialist.',
}

export const QuestionSetSchema = z.object({
  easy: z.object({
    prompt: z.string(),
    options: z.array(z.string()),
    correctIndex: z.number().int(),
  }),
  medium: z.object({
    prompt: z.string(),
    answer: z.string(),
    accepted: z.array(z.string()),
  }),
  hard: z.object({
    prompt: z.string(),
    answer: z.string(),
    accepted: z.array(z.string()),
  }),
})
export type QuestionSet = z.infer<typeof QuestionSetSchema>

export const VerdictSchema = z.object({
  results: z.array(
    z.object({
      tier: z.enum(['easy', 'medium', 'hard']),
      ok: z.boolean(),
      /** Empty when there is nothing wrong. */
      issue: z.string(),
      /** A corrected answer for an open question, or empty to keep the original. */
      correctedAnswer: z.string(),
      /** Further spellings or phrasings that should also be accepted. */
      extraAccepted: z.array(z.string()),
      /** For the multiple-choice question only: the index that is actually correct, or -1. */
      correctedIndex: z.number().int(),
    }),
  ),
})
export type Verdict = z.infer<typeof VerdictSchema>

let anthropic: Anthropic | null = null

/** Built on first use so a missing key surfaces as a handled error, not a crash on import. */
function client(): Anthropic {
  if (!anthropic) anthropic = new Anthropic()
  return anthropic
}

const SYSTEM = `You write questions for a live team quiz game that is played out loud in front of a room.

Absolute rules:
- Every question must have exactly one indisputably correct answer. If more than one answer could be defended, do not use the question.
- Use settled facts. Never ask about anything that changes over time — current record holders, incumbents, populations, prices, "most recent" anything.
- Write questions people enjoy: concrete, specific, and about something worth knowing. No trick questions, no riddles, no wordplay that depends on the language of the question.
- Keep the wording short enough to read aloud in one breath.`

export function generationPrompt(
  category: string,
  language: Language,
  difficulty: Difficulty,
  avoid: string[],
): string {
  const avoidBlock = avoid.length
    ? `\n\nThese questions are already on the board. Do not ask about the same fact or answer again:\n${avoid.map((p) => `- ${p}`).join('\n')}`
    : ''

  return `Write three quiz questions for the category "${category}".

Write everything — questions, options and answers — in ${LANGUAGE_NAMES[language]}. Use the names and spellings a native speaker of that language would use.

${DIFFICULTY_GUIDE[difficulty]}

**easy** — worth 2 points, multiple choice with exactly four options. Exactly one option is correct. The other three must be plausible enough to be tempting and clearly wrong to someone who knows the answer. Never use "all of the above" or "none of the above". Set correctIndex to the 0-based position of the correct option, and vary that position between questions rather than always using the same slot.

**medium** — worth 4 points, answered by typing. The answer must be one to four words. Do not ask anything that invites a sentence.

**hard** — worth 6 points, answered by typing, harder than the medium one, and about a different aspect of the category. The answer must be one to four words.

For both typed questions, fill "accepted" with every other form a team might reasonably type for the same answer: alternative spellings, transliterations, the version with and without a first name or article, common abbreviations, and the widely used name in another language. Do not put wrong answers in there.${avoidBlock}`
}

export function verificationPrompt(set: QuestionSet, language: Language): string {
  return `Check these three quiz questions before they go in front of a live audience. Be strict — a wrong answer on screen ruins the game.

For each one, confirm:
1. The stated answer is factually correct.
2. No other answer could reasonably be defended as correct.
3. For the multiple-choice question: exactly one of the four options is correct, and correctIndex points at it.
4. The question and its answer are written in ${LANGUAGE_NAMES[language]}.
5. The answer is not something that changes over time.

Return one result per tier. Set ok to false if anything above fails. When you can fix an open question by correcting its answer, put the corrected answer in correctedAnswer; otherwise leave it empty. When the multiple-choice correctIndex points at the wrong option but another option is correct, put that option's index in correctedIndex; otherwise use -1. Add any further spellings or phrasings a team might type to extraAccepted. Leave issue empty when there is nothing wrong.

${JSON.stringify(set, null, 2)}`
}

export async function generateSet(
  category: string,
  language: Language,
  difficulty: Difficulty,
  avoid: string[],
): Promise<QuestionSet> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: generationPrompt(category, language, difficulty, avoid) }],
    output_config: { format: zodOutputFormat(QuestionSetSchema) },
  })
  if (!response.parsed_output) throw new Error('The model did not return a usable question set')
  return response.parsed_output
}

export async function verifySet(set: QuestionSet, language: Language): Promise<Verdict> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: verificationPrompt(set, language) }],
    output_config: { format: zodOutputFormat(VerdictSchema) },
  })
  if (!response.parsed_output) throw new Error('The model did not return a usable verdict')
  return response.parsed_output
}
