import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

/**
 * Sonnet 5 writes the questions and checks them: quiz facts are well within its
 * range at a fraction of Opus pricing, and the verification pass is what
 * actually protects quality. Raise either to 'claude-opus-5' with an
 * environment variable if the questions disappoint.
 */
export const GENERATION_MODEL = process.env.QUIZ_MODEL || 'claude-sonnet-5'
export const VERIFICATION_MODEL = process.env.QUIZ_VERIFY_MODEL || 'claude-sonnet-5'

export type Language = 'en' | 'es' | 'lt'
export type Difficulty = 'casual' | 'balanced' | 'hard'

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Spanish',
  lt: 'Lithuanian',
}

/** Shifts the whole ladder up or down without changing the shape of each tier. */
const DIFFICULTY_GUIDE: Record<Difficulty, string> = {
  casual:
    'Pitch this board at a relaxed crowd who are not quiz regulars. Keep every tier one notch gentler than described, but never make the 2-pointer a giveaway.',
  balanced: 'Pitch this board at a mixed crowd of adults who enjoy a pub quiz.',
  hard: 'Pitch this board at experienced quizzers. Push every tier one notch harder than described, but never into obscurity for its own sake.',
}

const openQuestion = z.object({
  prompt: z.string(),
  answer: z.string(),
  accepted: z.array(z.string()),
  fact: z.string(),
  related: z.array(z.string()),
})

export const QuestionSetSchema = z.object({
  easy: z.object({
    prompt: z.string(),
    options: z.array(z.string()),
    correctIndex: z.number().int(),
    fact: z.string(),
    related: z.array(z.string()),
  }),
  medium: openQuestion,
  hard: openQuestion,
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
      /** True when the background note or its list contains anything inaccurate. */
      factProblem: z.boolean(),
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

const SYSTEM = `You write questions for a live team quiz played out loud in a room, in the tradition of a good pub quiz, Trivial Pursuit and University Challenge. You know that canon of question well: the shapes that have entertained people for decades, and the tired ones that have not.

**Every question must be safe to put on screen.**
- Exactly one indisputably correct answer. If a knowledgeable player could defend a second answer, throw the question away.
- Settled facts only. Never ask about anything that moves: current holders of a title or record, incumbents, populations, prices, "most recent" or "youngest ever" anything.
- No trick questions, no riddles, no wordplay that only works in one language.

**Every question must be worth asking.**
- The best questions can be *reached*, not merely recalled: by reasoning, by elimination, by lived experience, or by connecting two things the player already knows. A question you either know cold or cannot begin is a dead question, and a room full of blank faces kills the game.
- Ask about things that are interesting in themselves — a surprising superlative, a connection people have not made, a thing everyone has seen but never thought about.
- Avoid the exhausted stock questions (capital of France, red planet, tallest mountain). Aim for the question that makes the room say "oh, of course" after the reveal, not "how would anyone know that".
- Keep the wording short enough to read aloud in one breath.`

/** Tier definitions written as the kind of knowing required, not as adjectives. */
const TIER_RULES = `**easy — worth 2 points, multiple choice, exactly four options.**
This is not a giveaway. It should be a genuine question that a reasonably informed adult gets right and an uninformed one has to guess at. Because there are four options, pitch the underlying question harder than you would for an open answer — roughly the level where about two thirds of a pub-quiz room would be confident.
All four options must be the same kind of thing (four countries, four years, four people), and every one must be individually plausible: at least two should actively tempt someone who half-knows the topic. Never "all of the above", never a joke option, never an option that is obviously absurd. Put the correct answer in a different position from the other questions you write.

**medium — worth 4 points, answered by typing.**
Shared knowledge: something most adults who pay any attention to the topic can produce from memory. The answer must be one to four words. Never ask anything that invites a sentence.

**hard — worth 6 points, answered by typing.**
Hard because it takes thought, not because it is obscure. A team should be able to get there by reasoning it through, narrowing the field, or combining things they already know — and feel clever when they land it. Do not reach for a name, date or statistic that a player either has memorised or cannot possibly derive. Cover a different corner of the category from the medium question. The answer must be one to four words.`

const FACT_RULES = `**For every question, also write the background shown after the answer is revealed.**
- \`fact\` — one or two sentences of genuinely interesting context about the answer: why it is true, what is surprising about it, or the story behind it. This is what the host reads out while the room is still reacting. Do not restate the question.
- \`related\` — three to five short lines giving the surrounding picture, each a single line of at most about 60 characters. For a question about the largest country, list the top five with their areas. For a question about a person, list key dates or works. For a "which year" question, list what else happened around it. Format each line as the item, then a dash, then the figure or detail. Leave the list empty only if no such list makes sense for this question.`

export function generationPrompt(
  category: string,
  language: Language,
  difficulty: Difficulty,
  avoid: string[],
): string {
  const avoidBlock = avoid.length
    ? `\n\nThese questions are already on the board. Do not ask about the same fact, answer or angle again:\n${avoid.map((p) => `- ${p}`).join('\n')}`
    : ''

  return `Write three quiz questions for the category "${category}".

Write everything — questions, options, answers and background — in ${LANGUAGE_NAMES[language]}, using the names and spellings a native speaker of that language would use.

${DIFFICULTY_GUIDE[difficulty]}

${TIER_RULES}

For both typed questions, fill \`accepted\` with every other form a team might reasonably type for the same answer: alternative spellings, transliterations, the version with and without a first name or article, common abbreviations, and the name widely used in another language. Never put a wrong answer in there.

${FACT_RULES}${avoidBlock}`
}

export function verificationPrompt(set: QuestionSet, language: Language): string {
  return `Check these three quiz questions before they go in front of a live audience. Be strict — a wrong answer on screen ruins the game.

For each one, confirm:
1. The stated answer is factually correct.
2. No other answer could reasonably be defended as correct.
3. For the multiple-choice question: exactly one of the four options is correct, correctIndex points at it, and no option is absurd or a joke.
4. The question, answer and background are written in ${LANGUAGE_NAMES[language]}.
5. Nothing asked about changes over time.
6. The background note and its list are accurate, including any figures or rankings.

Return one result per tier. Set ok to false if 1-5 fails. Set factProblem to true if 6 fails, even when the question itself is fine. When you can fix an open question by correcting its answer, put the corrected answer in correctedAnswer; otherwise leave it empty. When the multiple-choice correctIndex points at the wrong option but another option is correct, put that option's index in correctedIndex; otherwise use -1. Add any further spellings or phrasings a team might type to extraAccepted. Leave issue empty when there is nothing wrong.

${JSON.stringify(set, null, 2)}`
}

export async function generateSet(
  category: string,
  language: Language,
  difficulty: Difficulty,
  avoid: string[],
): Promise<QuestionSet> {
  const response = await client().messages.parse({
    model: GENERATION_MODEL,
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
    model: VERIFICATION_MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: verificationPrompt(set, language) }],
    output_config: { format: zodOutputFormat(VerdictSchema) },
  })
  if (!response.parsed_output) throw new Error('The model did not return a usable verdict')
  return response.parsed_output
}
