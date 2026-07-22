import React from 'react'
import { Badge } from './ui.jsx'

function SeriesRow({ state, s }) {
  const a = state.teams.find((t) => t.id === s.aId)
  const b = state.teams.find((t) => t.id === s.bId)
  const isUser = s.aId === state.userTeamId || s.bId === state.userTeamId
  const aWon = s.winner === s.aId
  const bWon = s.winner === s.bId
  return (
    <div className="panel" style={{ padding: 12, borderColor: isUser ? 'var(--orange)' : 'var(--border)' }}>
      <div className="row spread" style={{ opacity: s.winner && !aWon ? 0.55 : 1 }}>
        <div className="row"><span className="muted" style={{ width: 18 }}>{s.aSeed}</span><Badge team={a} size={24} /><span style={{ fontWeight: aWon ? 800 : 600 }}>{a.name}</span></div>
        <strong style={{ color: aWon ? 'var(--green)' : 'var(--text)' }}>{s.aWins}</strong>
      </div>
      <div className="row spread" style={{ marginTop: 6, opacity: s.winner && !bWon ? 0.55 : 1 }}>
        <div className="row"><span className="muted" style={{ width: 18 }}>{s.bSeed}</span><Badge team={b} size={24} /><span style={{ fontWeight: bWon ? 800 : 600 }}>{b.name}</span></div>
        <strong style={{ color: bWon ? 'var(--green)' : 'var(--text)' }}>{s.bWins}</strong>
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        {s.bestOf > 1 ? `Best of ${s.bestOf}` : 'Single game'}{s.winner ? ' · final' : ''}
      </div>
    </div>
  )
}

function RoundColumn({ state, title, series }) {
  if (!series || series.length === 0) return null
  return (
    <div>
      <h3>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {series.map((s) => <SeriesRow key={s.id} state={state} s={s} />)}
      </div>
    </div>
  )
}

export default function Playoffs({ state }) {
  const po = state.playoffs
  if (!po) return <div className="panel"><p className="muted">Playoffs haven't started yet.</p></div>
  const champ = po.champion ? state.teams.find((t) => t.id === po.champion) : null

  return (
    <div>
      <div className="panel">
        <h2>Playoffs — Season {state.season}</h2>
        <p className="muted">Top 8 seeds. Quarterfinals best-of-5, then a single-game Final Four.</p>
      </div>
      {champ && (
        <div className="panel" style={{ textAlign: 'center', borderColor: 'var(--gold)' }}>
          <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold)' }}>🏆 EUROLEAGUE CHAMPION</div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
            <Badge team={champ} size={40} /><h1 style={{ fontSize: 24 }}>{champ.name}</h1>
          </div>
        </div>
      )}
      <div className="panel">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <RoundColumn state={state} title="Quarterfinals" series={po.history.QF} />
          <RoundColumn state={state} title="Final Four — Semis" series={po.history.SF} />
          <RoundColumn state={state} title="Final" series={po.history.F} />
        </div>
      </div>
    </div>
  )
}
