import { winners } from '../game/state'
import type { Translate } from '../i18n'
import { teamColor } from '../theme'
import type { GameState } from '../types'

interface Props {
  state: GameState
  t: Translate
  onPlayAgain: () => void
}

export function GameOverScreen({ state, t, onPlayAgain }: Props) {
  const champions = winners(state.teams)
  const ranked = [...state.teams].sort((a, b) => b.score - a.score)

  return (
    <div className="screen">
      <div className="gameover">
        <span className="eyebrow">{t('gameOver')}</span>
        <h1>
          {champions.length === 1
            ? t('winner', { team: champions[0].name })
            : t('winnersTie', { teams: champions.map((team) => team.name).join(', ') })}
        </h1>

        <div className="podium">
          <span className="eyebrow">{t('finalScores')}</span>
          {ranked.map((team, position) => {
            const index = state.teams.findIndex((candidate) => candidate.id === team.id)
            return (
              <div
                key={team.id}
                className={`podium-row${team.score === ranked[0].score ? ' top' : ''}`}
              >
                <span className="rank">{position + 1}</span>
                <span
                  className="team-dot"
                  style={{ background: teamColor(index), color: teamColor(index) }}
                />
                <span className="name">{team.name}</span>
                <span className="value">{team.score}</span>
              </div>
            )
          })}
        </div>

        <button className="btn btn-primary" onClick={onPlayAgain} autoFocus>
          {t('newGame')}
        </button>
      </div>
    </div>
  )
}
