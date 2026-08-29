import type { Team } from '../types'
import { teamColor } from '../theme'

interface Props {
  teams: Team[]
  activeTeamId?: string | null
}

export function Scoreboard({ teams, activeTeamId }: Props) {
  return (
    <div className="scoreboard">
      {teams.map((team, index) => (
        <div
          key={team.id}
          className={`score-card${team.id === activeTeamId ? ' active' : ''}`}
          style={{ ['--team-color' as string]: teamColor(index) }}
        >
          <div className="name">{team.name}</div>
          <div className="value">{team.score}</div>
        </div>
      ))}
    </div>
  )
}
