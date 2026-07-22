import React from 'react'
import { Badge } from './ui.jsx'

export default function Dashboard({ state, standings, nextFixture, onPlay, seasonOver }) {
  const team = state.teams.find((t) => t.id === state.userTeamId)
  const myRow = standings.find((s) => s.id === state.userTeamId)
  const rank = standings.findIndex((s) => s.id === state.userTeamId) + 1

  const recent = state.results
    .filter((r) => r.homeId === team.id || r.awayId === team.id)
    .slice(-5)
    .reverse()

  const opp = nextFixture
    ? state.teams.find((t) => t.id === (nextFixture.home === team.id ? nextFixture.away : nextFixture.home))
    : null

  return (
    <div>
      <div className="panel">
        <div className="row spread wrap">
          <div className="row">
            <Badge team={team} size={48} />
            <div>
              <h1 style={{ fontSize: 22 }}>{team.name}</h1>
              <div className="muted">{team.city}, {team.country} · Season {state.season}</div>
            </div>
          </div>
        </div>
        <div className="stat-tiles" style={{ marginTop: 16 }}>
          <div className="tile"><div className="lbl">Record</div><div className="big">{myRow.w}-{myRow.l}</div></div>
          <div className="tile"><div className="lbl">League rank</div><div className="big">#{rank}</div></div>
          <div className="tile"><div className="lbl">Points diff</div><div className="big">{myRow.pf - myRow.pa >= 0 ? '+' : ''}{myRow.pf - myRow.pa}</div></div>
          <div className="tile"><div className="lbl">Team OVR</div><div className="big">{team.overall}</div></div>
          <div className="tile"><div className="lbl">Budget</div><div className="big">€{team.budget}M</div></div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="panel">
          <h2>Next match</h2>
          {seasonOver ? (
            <div className="notice">Regular season complete. Playoffs & multi-season rollover arrive in Milestone 2.</div>
          ) : opp ? (
            <>
              <div className="scoreline" style={{ marginTop: 6 }}>
                <div className="team-side">
                  <Badge team={team} />
                  <div style={{ fontWeight: 700 }}>{team.name}</div>
                </div>
                <span className="muted" style={{ fontWeight: 800 }}>VS</span>
                <div className="team-side away">
                  <div style={{ fontWeight: 700, textAlign: 'right' }}>{opp.name}</div>
                  <Badge team={opp} />
                </div>
              </div>
              <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                Round {nextFixture.round} · {nextFixture.home === team.id ? 'Home' : 'Away'} · Opponent OVR {opp.overall}
              </div>
              <button className="btn-primary" style={{ marginTop: 14, width: '100%' }} onClick={onPlay}>
                Go to matchday ▶
              </button>
            </>
          ) : (
            <p className="muted">No upcoming fixtures.</p>
          )}
        </div>

        <div className="panel">
          <h2>Recent form</h2>
          {recent.length === 0 ? (
            <p className="muted">No games played yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map((r, i) => {
                const isHome = r.homeId === team.id
                const oppId = isHome ? r.awayId : r.homeId
                const oppTeam = state.teams.find((t) => t.id === oppId)
                const myScore = isHome ? r.homeScore : r.awayScore
                const oppScore = isHome ? r.awayScore : r.homeScore
                const won = r.winner === team.id
                return (
                  <div key={i} className="row spread" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div className="row">
                      <span className={`pill ${won ? 'win' : 'loss'}`}>{won ? 'W' : 'L'}</span>
                      <Badge team={oppTeam} size={24} />
                      <span>{isHome ? 'vs' : '@'} {oppTeam.name}</span>
                    </div>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{myScore}-{oppScore}</strong>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
