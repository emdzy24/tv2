import React from 'react'
import { Badge } from './ui.jsx'

export default function Standings({ state, standings }) {
  const teamsById = new Map(state.teams.map((t) => [t.id, t]))
  return (
    <div className="panel">
      <h2>Standings — Season {state.season}</h2>
      <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th style={{ width: 30 }}>#</th>
            <th>Club</th>
            <th className="num">GP</th>
            <th className="num">W</th>
            <th className="num">L</th>
            <th className="num">PF</th>
            <th className="num">PA</th>
            <th className="num">Diff</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const team = teamsById.get(s.id)
            const isMe = s.id === state.userTeamId
            const playoff = i < 8
            return (
              <tr key={s.id} className={isMe ? 'me' : ''}>
                <td>
                  <span style={{ color: playoff ? 'var(--green)' : 'var(--muted)', fontWeight: 700 }}>
                    {i + 1}
                  </span>
                </td>
                <td>
                  <div className="row">
                    <Badge team={team} size={26} />
                    <span style={{ fontWeight: isMe ? 700 : 500 }}>{s.name}</span>
                  </div>
                </td>
                <td className="num">{s.played}</td>
                <td className="num">{s.w}</td>
                <td className="num">{s.l}</td>
                <td className="num">{s.pf}</td>
                <td className="num">{s.pa}</td>
                <td className="num" style={{ color: s.pf - s.pa >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {s.pf - s.pa >= 0 ? '+' : ''}{s.pf - s.pa}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
      <p className="footer-note" style={{ textAlign: 'left', marginTop: 12 }}>
        Top 8 (green) qualify for the playoffs. Tiebreak: point differential.
      </p>
    </div>
  )
}
