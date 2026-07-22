import React from 'react'
import { Badge } from './ui.jsx'

function AwardCard({ title, player, state, extra }) {
  if (!player) return null
  const team = state.teams.find((t) => t.id === player.teamId)
  return (
    <div className="tile">
      <div className="lbl">{title}</div>
      <div className="row" style={{ marginTop: 6 }}>
        {team && <Badge team={team} size={26} />}
        <div>
          <div style={{ fontWeight: 700 }}>{player.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>{player.pos}{team ? ` · ${team.name}` : ''}{extra ? ` · ${extra}` : ''}</div>
        </div>
      </div>
    </div>
  )
}

export default function Offseason({ state, awards, report, onStartNext }) {
  const champ = awards?.champion ? state.teams.find((t) => t.id === awards.champion) : null
  return (
    <div>
      <div className="panel" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--muted)' }}>SEASON {awards?.season || state.season} COMPLETE</div>
        {champ && (
          <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 26 }}>🏆</span>
            <Badge team={champ} size={36} />
            <h1 style={{ fontSize: 22 }}>{champ.name}</h1>
            <span className="muted">— Champions</span>
          </div>
        )}
      </div>

      {awards && (
        <div className="panel">
          <h2>Season awards</h2>
          <div className="stat-tiles">
            <AwardCard title="MVP" player={awards.mvp} state={state} extra={awards.mvp ? `${awards.mvp.ppg} ppg` : ''} />
            <AwardCard title="Scoring champion" player={awards.scoringChamp} state={state} extra={awards.scoringChamp ? `${awards.scoringChamp.ppg} ppg` : ''} />
          </div>
          <h3 style={{ marginTop: 16 }}>All-EuroLeague First Team</h3>
          <div className="stat-tiles">
            {awards.allEuroLeague.map((p) => (
              <AwardCard key={p.id} title={p.pos} player={p} state={state} extra={`${p.ppg}/${p.rpg}/${p.apg}`} />
            ))}
          </div>
        </div>
      )}

      {report ? (
        <div className="panel">
          <h2>Offseason report</h2>
          <div className="grid grid-2">
            <div>
              <h3>Retirements ({report.retirements.length})</h3>
              {report.retirements.length === 0 ? <p className="muted">None.</p> : (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {report.retirements.slice(0, 10).map((r, i) => (
                    <li key={i} className="muted" style={{ fontSize: 13 }}>{r.name} — age {r.age}, OVR {r.overall}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3>Biggest risers</h3>
              {report.risers.length === 0 ? <p className="muted">None.</p> : (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {report.risers.sort((a, b) => (b.after - b.before) - (a.after - a.before)).slice(0, 8).map((r, i) => (
                    <li key={i} style={{ fontSize: 13 }}>
                      {r.name} <span style={{ color: 'var(--green)' }}>+{r.after - r.before}</span> <span className="muted">→ {r.after} (age {r.age})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="row spread wrap" style={{ marginTop: 16 }}>
            <span className="muted">Season {report.newSeason} schedule is ready.</span>
          </div>
        </div>
      ) : (
        <div className="panel">
          <p className="muted">Process the offseason to age & develop players, handle retirements, and generate the next schedule.</p>
        </div>
      )}

      <div className="panel row spread wrap">
        <span className="muted">{report ? 'Head into the new season.' : 'Advance to the offseason.'}</span>
        <button className="btn-primary" onClick={onStartNext}>
          {report ? `Start Season ${report.newSeason} →` : 'Process offseason →'}
        </button>
      </div>
    </div>
  )
}
