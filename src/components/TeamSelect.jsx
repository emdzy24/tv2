import React, { useMemo, useState } from 'react'
import { buildLeague } from '../data/euroleague.js'
import { Badge, OvrBadge } from './ui.jsx'

export default function TeamSelect({ onPick }) {
  const teams = useMemo(() => buildLeague(), [])
  const [selected, setSelected] = useState(null)

  return (
    <div>
      <div className="panel">
        <h1>Choose your club</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          Take charge of a EuroLeague team as head coach and general manager. You can restart anytime.
        </p>
      </div>

      <div className="panel">
        <div className="team-grid">
          {teams.map((t) => (
            <div
              key={t.id}
              className={`team-card ${selected?.id === t.id ? 'selected' : ''}`}
              onClick={() => setSelected(t)}
            >
              <div className="row spread">
                <Badge team={t} />
                <OvrBadge value={t.overall} />
              </div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>{t.name}</div>
              <div className="muted" style={{ fontSize: 13 }}>{t.city}, {t.country}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel row spread wrap">
        <div className="muted">
          {selected ? (
            <>Selected: <strong style={{ color: 'var(--text)' }}>{selected.name}</strong> — {selected.players.length} players, overall {selected.overall}</>
          ) : (
            'Select a club to continue.'
          )}
        </div>
        <button className="btn-primary" disabled={!selected} onClick={() => onPick(selected.id)}>
          Start career with {selected ? selected.name : '…'}
        </button>
      </div>
    </div>
  )
}
