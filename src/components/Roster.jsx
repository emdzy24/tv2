import React, { useState } from 'react'
import { OvrBadge, PosChip } from './ui.jsx'
import { ATTRS } from '../data/euroleague.js'

const ATTR_LABELS = {
  insideScoring: 'INS',
  outsideScoring: 'OUT',
  playmaking: 'PLM',
  rebounding: 'REB',
  perimeterDefense: 'PDF',
  interiorDefense: 'IDF',
  athleticism: 'ATH',
  basketballIQ: 'IQ',
  stamina: 'STA',
}

export default function Roster({ team, lineup, onLineupChange }) {
  const [expanded, setExpanded] = useState(null)
  const starters = new Set(lineup)

  function toggleStarter(p) {
    if (p.injuredWeeks > 0) return
    const next = new Set(starters)
    if (next.has(p.id)) {
      next.delete(p.id)
    } else {
      if (next.size >= 5) return // max 5 starters
      next.add(p.id)
    }
    onLineupChange([...next])
  }

  return (
    <div>
      <div className="panel">
        <div className="row spread wrap">
          <div>
            <h2 style={{ marginBottom: 2 }}>{team.name} — Roster</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              Tap a player to pick your starting five ({starters.size}/5). Injured players can't start.
            </div>
          </div>
          <div className="tile" style={{ minWidth: 120 }}>
            <div className="lbl">Team OVR</div>
            <div className="big">{team.overall}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>ST</th>
              <th>Player</th>
              <th>Pos</th>
              <th className="num">Age</th>
              <th className="num">OVR</th>
              <th className="num">POT</th>
              <th className="num">Morale</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((p) => (
              <React.Fragment key={p.id}>
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      checked={starters.has(p.id)}
                      disabled={p.injuredWeeks > 0}
                      onChange={() => toggleStarter(p)}
                    />
                  </td>
                  <td>
                    <button
                      style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--text)', fontWeight: 600 }}
                      onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    >
                      {p.name}
                    </button>
                  </td>
                  <td><PosChip pos={p.pos} /></td>
                  <td className="num">{p.age}</td>
                  <td className="num"><OvrBadge value={p.overall} /></td>
                  <td className="num muted">{p.potential}</td>
                  <td className="num">{p.morale}</td>
                  <td>
                    {p.injuredWeeks > 0 ? (
                      <span className="pill loss">Injured {p.injuredWeeks}w</span>
                    ) : starters.has(p.id) ? (
                      <span className="pill win">Starter</span>
                    ) : (
                      <span className="pill">Bench</span>
                    )}
                  </td>
                </tr>
                {expanded === p.id && (
                  <tr>
                    <td colSpan={8} style={{ background: 'var(--bg-2)' }}>
                      <div className="row wrap" style={{ gap: 8, padding: '6px 0' }}>
                        {ATTRS.map((a) => (
                          <div key={a} className="tile" style={{ padding: '8px 10px', minWidth: 78 }}>
                            <div className="lbl">{ATTR_LABELS[a]}</div>
                            <div className="big" style={{ fontSize: 18 }}>{p.attrs[a]}</div>
                          </div>
                        ))}
                        <div className="tile" style={{ padding: '8px 10px', minWidth: 90 }}>
                          <div className="lbl">Salary</div>
                          <div className="big" style={{ fontSize: 18 }}>€{p.salary}M</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
