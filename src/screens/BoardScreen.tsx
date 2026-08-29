import { useState } from 'react'
import { Scoreboard } from '../components/Scoreboard'
import type { Translate } from '../i18n'
import { teamColor } from '../theme'
import type { GameState, PointValue } from '../types'

interface Props {
  state: GameState
  t: Translate
  onPick: (categoryId: string, value: PointValue) => void
  onQuit: () => void
}

export function BoardScreen({ state, t, onPick, onQuit }: Props) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)

  const team = state.teams[state.turnIndex]
  const color = teamColor(state.turnIndex)
  const openCategory = state.categories.find((c) => c.id === openCategoryId) ?? null
  // Split the localized template so the team name can carry its own colour.
  const [beforeTeam, afterTeam] = t('yourTurn', { team: '\u0000' }).split('\u0000')

  return (
    <div className="screen">
      <div className="board-header">
        <div className="turn-banner" style={{ ['--team-color' as string]: color }}>
          {beforeTeam}
          <span className="team">{team.name}</span>
          {afterTeam}
        </div>
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={onQuit}>
          {t('quit')}
        </button>
      </div>

      <Scoreboard teams={state.teams} activeTeamId={team.id} />

      {openCategory ? (
        <div className="value-picker">
          <div className="eyebrow">{openCategory.name}</div>
          <div className="value-buttons">
            {openCategory.cells.map((cell) => (
              <button
                key={cell.value}
                className="value-button"
                disabled={cell.played}
                onClick={() => {
                  setOpenCategoryId(null)
                  onPick(openCategory.id, cell.value)
                }}
              >
                {cell.value}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={() => setOpenCategoryId(null)}>
            ← {t('back')}
          </button>
        </div>
      ) : (
        <div className="board">
          {state.categories.map((category) => {
            const exhausted = category.cells.every((cell) => cell.played)
            return (
              <button
                key={category.id}
                className={`category-tile${exhausted ? ' exhausted' : ''}`}
                disabled={exhausted}
                onClick={() => setOpenCategoryId(category.id)}
              >
                <span className="cat-name">{category.name}</span>
                <span className="remaining">
                  {category.cells.map((cell) => (
                    <span key={cell.value} className={`pip${cell.played ? ' spent' : ''}`}>
                      {cell.value}
                    </span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
