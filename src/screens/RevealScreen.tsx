import { Scoreboard } from '../components/Scoreboard'
import { correctAnswerText } from '../game/state'
import type { Translate } from '../i18n'
import { teamColor } from '../theme'
import type { GameState } from '../types'

interface Props {
  state: GameState
  t: Translate
  onOverride: (correct: boolean) => void
  onContinue: () => void
}

const LETTERS = ['A', 'B', 'C', 'D']

export function RevealScreen({ state, t, onOverride, onContinue }: Props) {
  const active = state.active!
  const judgement = state.judgement!
  const question = active.question
  const answer = correctAnswerText(question)
  const teamIndex = state.teams.findIndex((team) => team.id === active.teamId)

  const verdict = judgement.correct ? t('correct') : judgement.timedOut ? t('timedOut') : t('wrong')

  return (
    <div className="screen">
      <div className="question-meta">
        <span className="tag team" style={{ ['--team-color' as string]: teamColor(teamIndex) }}>
          {state.teams[teamIndex].name}
        </span>
        {judgement.overridden && <span className="tag">{t('hostOverride')}</span>}
      </div>

      <Scoreboard teams={state.teams} activeTeamId={active.teamId} />

      <div className="reveal">
        <div className={`verdict ${judgement.correct ? 'correct' : 'wrong'}`}>{verdict}</div>

        {judgement.points > 0 && <div className="points-delta">+{judgement.points}</div>}
        {judgement.speedBonusApplied && <div className="bonus-flag">⚡ {t('speedBonusEarned')}</div>}

        {question.format === 'choice' ? (
          <div className="options" style={{ width: 'min(880px, 100%)' }}>
            {question.options.map((option, index) => (
              <div
                key={option}
                className={`option ${
                  index === question.correctIndex
                    ? 'is-correct'
                    : option === judgement.given
                      ? 'is-chosen-wrong'
                      : ''
                }`}
              >
                <span className="letter">{LETTERS[index]}</span>
                <span>{option}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="answer-line">
              {t('correctAnswer')}: <strong>{answer}</strong>
            </div>
            <div className="given-line">
              {t('theyAnswered')}: {judgement.given.trim() || t('noAnswer')}
            </div>
          </>
        )}

        <div className="override">
          <span className="eyebrow">{t('hostOverride')}</span>
          <div className="row">
            <button
              className="btn btn-correct"
              disabled={judgement.correct}
              onClick={() => onOverride(true)}
            >
              ✓ {t('markCorrect')}
            </button>
            <button
              className="btn btn-wrong"
              disabled={!judgement.correct}
              onClick={() => onOverride(false)}
            >
              ✕ {t('markWrong')}
            </button>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onContinue} autoFocus>
          {t('continue')} →
        </button>
      </div>
    </div>
  )
}
