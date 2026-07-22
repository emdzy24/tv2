import React, { useState } from 'react'
import { Badge } from './ui.jsx'

function TacticsEditor({ tactics, onChange }) {
  const set = (k, v) => onChange({ ...tactics, [k]: v })
  return (
    <div className="grid grid-2">
      <div>
        <h3>Pace</h3>
        <input
          type="range" min="0" max="100" value={tactics.pace}
          onChange={(e) => set('pace', +e.target.value)}
          style={{ width: '100%' }}
        />
        <div className="row spread muted" style={{ fontSize: 12 }}>
          <span>Slow</span><span>{tactics.pace}</span><span>Fast</span>
        </div>
        <h3 style={{ marginTop: 14 }}>Aggression</h3>
        <input
          type="range" min="0" max="100" value={tactics.aggression}
          onChange={(e) => set('aggression', +e.target.value)}
          style={{ width: '100%' }}
        />
        <div className="row spread muted" style={{ fontSize: 12 }}>
          <span>Safe</span><span>{tactics.aggression}</span><span>Press</span>
        </div>
      </div>
      <div>
        <h3>Offensive focus</h3>
        <div className="seg">
          {['inside', 'balanced', 'outside'].map((v) => (
            <button key={v} className={tactics.offFocus === v ? 'on' : ''} onClick={() => set('offFocus', v)}>
              {v}
            </button>
          ))}
        </div>
        <h3 style={{ marginTop: 14 }}>Defensive focus</h3>
        <div className="seg">
          {['perimeter', 'balanced', 'interior'].map((v) => (
            <button key={v} className={tactics.defFocus === v ? 'on' : ''} onClick={() => set('defFocus', v)}>
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function BoxScore({ team, box }) {
  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 8 }}>
        <Badge team={team} size={26} />
        <strong>{team.name}</strong>
      </div>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th className="num">MIN</th>
            <th className="num">PTS</th>
            <th className="num">REB</th>
            <th className="num">AST</th>
            <th className="num">STL</th>
            <th className="num">BLK</th>
          </tr>
        </thead>
        <tbody>
          {box.map((l) => (
            <tr key={l.id}>
              <td>{l.starter ? <strong>{l.name}</strong> : l.name}</td>
              <td className="num">{l.min}</td>
              <td className="num"><strong>{l.pts}</strong></td>
              <td className="num">{l.reb}</td>
              <td className="num">{l.ast}</td>
              <td className="num">{l.stl}</td>
              <td className="num">{l.blk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Match({ state, fixture, tactics, onTacticsChange, onPlay, result, onContinue }) {
  const home = state.teams.find((t) => t.id === fixture.home)
  const away = state.teams.find((t) => t.id === fixture.away)
  const userIsHome = fixture.home === state.userTeamId
  const [playing, setPlaying] = useState(false)

  if (result) {
    const r = result.userResult
    const homeWin = r.homeScore > r.awayScore
    const userWon = r.winner === state.userTeamId
    return (
      <div>
        <div className="panel">
          <div className="scoreline">
            <div className="team-side">
              <Badge team={home} />
              <div>
                <div style={{ fontWeight: 700 }}>{home.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>Home</div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="score">
                <span style={{ color: homeWin ? 'var(--text)' : 'var(--muted)' }}>{r.homeScore}</span>
                <span className="muted"> : </span>
                <span style={{ color: !homeWin ? 'var(--text)' : 'var(--muted)' }}>{r.awayScore}</span>
              </div>
              <div className={`pill ${userWon ? 'win' : 'loss'}`} style={{ marginTop: 6 }}>
                {userWon ? 'You won' : 'You lost'}
              </div>
            </div>
            <div className="team-side away">
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{away.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>Away</div>
              </div>
              <Badge team={away} />
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          <BoxScore team={home} box={r.homeBox} />
          <BoxScore team={away} box={r.awayBox} />
        </div>

        <div className="panel row spread wrap">
          <span className="muted">Other results this round were simulated too — check the standings.</span>
          <button className="btn-primary" onClick={onContinue}>Continue →</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="panel">
        <h3>Round {fixture.round} — Matchday</h3>
        <div className="scoreline" style={{ marginTop: 8 }}>
          <div className="team-side">
            <Badge team={home} />
            <div>
              <div style={{ fontWeight: 700 }}>{home.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>Home · OVR {home.overall}</div>
            </div>
          </div>
          <div className="muted" style={{ fontWeight: 800 }}>VS</div>
          <div className="team-side away">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700 }}>{away.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>Away · OVR {away.overall}</div>
            </div>
            <Badge team={away} />
          </div>
        </div>
        <div className="notice" style={{ marginTop: 12 }}>
          You are managing <strong>{userIsHome ? home.name : away.name}</strong> ({userIsHome ? 'home' : 'away'}). Set your tactics, then tip off.
        </div>
      </div>

      <div className="panel">
        <h2>Your tactics</h2>
        <TacticsEditor tactics={tactics} onChange={onTacticsChange} />
        <p className="footer-note" style={{ textAlign: 'left', marginTop: 12 }}>
          In-game (halftime) adjustments arrive in Milestone 2. For now, tactics are set pre-tip.
        </p>
      </div>

      <div className="panel row spread wrap">
        <span className="muted">Make sure your starting five is set on the Roster tab.</span>
        <button
          className="btn-primary"
          disabled={playing}
          onClick={() => { setPlaying(true); onPlay() }}
        >
          {playing ? 'Simulating…' : 'Play match ▶'}
        </button>
      </div>
    </div>
  )
}
