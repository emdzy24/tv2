import { useState } from 'react'
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
  const [showInfo, setShowInfo] = useState(false)

  const question = active.question
  const answer = correctAnswerText(question)
  const teamIndex = state.teams.findIndex((team) => team.id === active.teamId)
  const verdict = judgement.correct ? t('correct') : judgement.timedOut ? t('timedOut') : t('wrong')
  const related = question.related ?? []
  const hasInfo = Boolean(question.fact) || related.length > 0

  return (
    <div className="screen">
      <div className="question-meta">
        <span className="tag team" style={{ ['--team-color' as string]: teamColor(teamIndex) }}>
          {state.teams[teamIndex].name}
        </span>
        {judgement.overridden && <span className="tag">{t('hostOverride')}</span>}
      </div>

      <Scoreboard teams={state.teams} activeTeamId={active.teamId} />

      <div className={`reveal${showInfo ? ' compact' : ''}`}>
        <div className={`verdict ${judgement.correct ? 'correct' : 'wrong'}`}>{verdict}</div>

        {judgement.points > 0 && <div className="points-delta">+{judgement.points}</div>}
        {judgement.speedBonusApplied && <div className="bonus-flag">⚡ {t('speedBonusEarned')}</div>}

        {question.format === 'choice' ? (
          <div className="options reveal-options">
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

        {hasInfo && (
          <button className="btn btn-info" onClick={() => setShowInfo((open) => !open)}>
            {showInfo ? t('hideInfo') : `ℹ ${t('showInfo')}`}
          </button>
        )}

        {hasInfo && showInfo && (
          <div className="info-panel">
            <span className="eyebrow">{t('goodToKnow')}</span>
            <div className="info-body">
              {question.fact && <p className="info-fact">{question.fact}</p>}
              {related.length > 0 && (
                <ul className="info-list">
                  {related.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Outside the scrolling area, so it stays reachable however tall the
          background note gets — nobody scrolls a television. */}
      <div className="reveal-footer">
        <span className="eyebrow">{t('hostOverride')}</span>
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
        <button className="btn btn-primary" onClick={onContinue} autoFocus>
          {t('continue')} →
        </button>
      </div>
    </div>
  )
}
