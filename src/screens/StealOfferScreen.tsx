import { Scoreboard } from '../components/Scoreboard'
import { stealValue } from '../game/state'
import type { Translate } from '../i18n'
import { teamColor } from '../theme'
import type { GameState } from '../types'

interface Props {
  state: GameState
  t: Translate
  onDecide: (accept: boolean) => void
}

const SENTINEL = '\u0000'

/** Only the next team in order gets this offer, and only after the owner misses. */
export function StealOfferScreen({ state, t, onDecide }: Props) {
  const active = state.active!
  const index = state.teams.findIndex((team) => team.id === state.stealTeamId)
  const team = state.teams[index]
  const [before, after] = t('stealOffer', { team: SENTINEL }).split(SENTINEL)

  return (
    <div className="screen">
      <Scoreboard teams={state.teams} activeTeamId={team.id} />
      <div className="steal-offer" style={{ ['--team-color' as string]: teamColor(index) }}>
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
      </div>
    </div>
  )
}
