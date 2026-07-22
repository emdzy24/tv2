import React from 'react'
import { seasonStatsForTeam } from '../state/store.js'
import { PosChip } from './ui.jsx'

export default function Stats({ state }) {
  const team = state.teams.find((t) => t.id === state.userTeamId)
  const stats = seasonStatsForTeam(state, state.userTeamId)

  if (stats.length === 0) {
    return (
      <div className="panel">
        <h2>Season stats</h2>
        <p className="muted">No games played yet. Play a match to start tracking stats.</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2>{team.name} — Season {state.season} stats (per game)</h2>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Pos</th>
            <th className="num">GP</th>
            <th className="num">PPG</th>
            <th className="num">RPG</th>
            <th className="num">APG</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td><PosChip pos={s.pos} /></td>
              <td className="num">{s.gp}</td>
              <td className="num"><strong>{s.ppg}</strong></td>
              <td className="num">{s.rpg}</td>
              <td className="num">{s.apg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
