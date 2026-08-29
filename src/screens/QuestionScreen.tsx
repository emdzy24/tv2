import { useEffect, useRef, useState } from 'react'
import { Timer } from '../components/Timer'
import type { Translate } from '../i18n'
import { stealValue } from '../game/state'
import { teamColor } from '../theme'
import type { GameState } from '../types'

interface Props {
  state: GameState
  t: Translate
  onAnswer: (given: string) => void
  onTimeout: () => void
}

const LETTERS = ['A', 'B', 'C', 'D']

export function QuestionScreen({ state, t, onAnswer, onTimeout }: Props) {
  const active = state.active!
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const teamIndex = state.teams.findIndex((team) => team.id === active.teamId)
  const team = state.teams[teamIndex]
  const category = state.categories.find((c) => c.id === active.categoryId)
  const stealing = active.attempt === 'steal'
  const value = stealing ? stealValue(active.value) : active.value

  // A fresh attempt starts with an empty, focused input.
  useEffect(() => {
    setTyped('')
    inputRef.current?.focus()
  }, [active.startedAt])

  return (
    <div className="screen question-screen">
      <div className="question-meta">
        <span className="tag team" style={{ ['--team-color' as string]: teamColor(teamIndex) }}>
          {team.name}
        </span>
        {category && <span className="tag">{category.name}</span>}
        <span className={`tag ${stealing ? 'steal' : 'points'}`}>
          {stealing ? t('stealFor', { n: value }) : t('forPoints', { n: value })}
        </span>
        <Timer
          startedAt={active.startedAt}
          seconds={active.seconds}
          onExpire={onTimeout}
          label={t('timeLeft')}
        />
      </div>

      <p className="prompt">{active.question.prompt}</p>

      {active.question.format === 'choice' ? (
        <div className="options">
          {active.question.options.map((option, index) => (
            <button key={option} className="option" onClick={() => onAnswer(option)}>
              <span className="letter">{LETTERS[index]}</span>
              <span>{option}</span>
            </button>
          ))}
        </div>
      ) : (
        <form
          className="answer-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (typed.trim()) onAnswer(typed)
          }}
        >
          <input
            ref={inputRef}
            className="text-input"
            value={typed}
            autoFocus
            autoComplete="off"
            placeholder={t('yourAnswer')}
            onChange={(event) => setTyped(event.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={!typed.trim()}>
            {t('submit')}
          </button>
        </form>
      )}
    </div>
  )
}
