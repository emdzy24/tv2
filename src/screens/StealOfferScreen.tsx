import { Scoreboard } from '../components/Scoreboard'
import { stealValue } from '../game/state'
import type { Translate } from '../i18n'
import { teamColor } from '../theme'
import type { GameState } from '../types'

interface Props {
  state: GameState
  t: Translate
  onDecide: (accept: boolean) => void
  onOverride: (correct: boolean) => void
}

/** Marks where the team name sits in the localized sentence so it can be styled. */
const SENTINEL = '\u0000'

/**
 * Only the next team in order gets this offer, and only after the owner misses.
 * The correct answer is deliberately not shown here — revealing it before the
 * steal would hand the stealing team a free point.
 */
export function StealOfferScreen({ state, t, onDecide, onOverride }: Props) {
  const active = state.active!
  const judgement = state.judgement!
  const index = state.teams.findIndex((team) => team.id === state.stealTeamId)
  const team = state.teams[index]
  const owner = state.teams.find((candidate) => candidate.id === active.ownerTeamId)!
  const [before, after] = t('stealOffer', { team: SENTINEL }).split(SENTINEL)

  return (
    <div className="screen">
      <Scoreboard teams={state.teams} activeTeamId={team.id} />

      <div className="steal-offer" style={{ ['--team-color' as string]: teamColor(index) }}>
        <div className="verdict wrong">{judgement.timedOut ? t('timedOut') : t('wrong')}</div>
        <div className="given-line">
          {owner.name} — {t('theyAnswered')}: {judgement.given.trim() || t('noAnswer')}
        </div>

        <p className="steal-prompt">{active.question.prompt}</p>

        <h2>
          {before}
          <span className="team">{team.name}</span>
          {after}
        </h2>
        <div className="steal-value">{t('stealFor', { n: stealValue(active.value) })}</div>

        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => onDecide(true)} autoFocus>
            {t('steal')}
          </button>
          <button className="btn btn-ghost" onClick={() => onDecide(false)}>
            {t('pass')}
          </button>
        </div>

        <div className="override">
          <span className="eyebrow">{t('hostOverride')}</span>
          <button className="btn btn-correct" onClick={() => onOverride(true)}>
            ✓ {t('markCorrect')}
          </button>
        </div>
      </div>
    </div>
  )
}
