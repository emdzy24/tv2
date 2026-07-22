import React from 'react'
import { Badge } from './ui.jsx'

function TacticsEditor({ tactics, onChange }) {
  const set = (k, v) => onChange({ ...tactics, [k]: v })
  return (
    <div className="grid grid-2">
      <div>
        <h3>Pace</h3>
        <input type="range" min="0" max="100" value={tactics.pace}
          onChange={(e) => set('pace', +e.target.value)} style={{ width: '100%' }} />
        <div className="row spread muted" style={{ fontSize: 12 }}>
          <span>Slow</span><span>{tactics.pace}</span><span>Fast</span>
        </div>
        <h3 style={{ marginTop: 14 }}>Aggression</h3>
        <input type="range" min="0" max="100" value={tactics.aggression}
          onChange={(e) => set('aggression', +e.target.value)} style={{ width: '100%' }} />
        <div className="row spread muted" style={{ fontSize: 12 }}>
          <span>Safe</span><span>{tactics.aggression}</span><span>Press</span>
        </div>
      </div>
      <div>
        <h3>Offensive focus</h3>
        <div className="seg">
          {['inside', 'balanced', 'outside'].map((v) => (
            <button key={v} className={tactics.offFocus === v ? 'on' : ''} onClick={() => set('offFocus', v)}>{v}</button>
          ))}
        </div>
        <h3 style={{ marginTop: 14 }}>Defensive focus</h3>
        <div className="seg">
          {['perimeter', 'balanced', 'interior'].map((v) => (
            <button key={v} className={tactics.defFocus === v ? 'on' : ''} onClick={() => set('defFocus', v)}>{v}</button>
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
        <Badge team={team} size={26} /><strong>{team.name}</strong>
      </div>
      <div className="table-scroll">
      <table>
        <thead>
          <tr><th>Player</th><th className="num">MIN</th><th className="num">PTS</th><th className="num">REB</th><th className="num">AST</th><th className="num">STL</th><th className="num">BLK</th></tr>
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
    </div>
  )
}

function Scoreline({ home, away, homeScore, awayScore, sub }) {
  const homeWin = homeScore > awayScore
  return (
    <div className="scoreline">
      <div className="team-side">
        <Badge team={home} />
        <div><div style={{ fontWeight: 700 }}>{home.name}</div><div className="muted" style={{ fontSize: 12 }}>Home</div></div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="score">
          <span style={{ color: homeWin ? 'var(--text)' : 'var(--muted)' }}>{homeScore}</span>
          <span className="muted"> : </span>
          <span style={{ color: !homeWin ? 'var(--text)' : 'var(--muted)' }}>{awayScore}</span>
        </div>
        {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
      </div>
      <div className="team-side away">
        <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{away.name}</div><div className="muted" style={{ fontSize: 12 }}>Away</div></div>
        <Badge team={away} />
      </div>
    </div>
  )
}

export default function Match({
  state, home, away, userIsHome, roundLabel, seriesInfo,
  tactics, onTacticsChange,
  matchPhase, half1, result,
  onQuickSim, onPlayFirstHalf, onPlaySecondHalf, onContinue,
}) {
  const userTeam = userIsHome ? home : away

  // FINAL
  if (matchPhase === 'final' && result) {
    const userWon = result.winner === state.userTeamId
    const injuries = (result.injuries || []).filter((i) => i.teamId === state.userTeamId)
    return (
      <div>
        <div className="panel">
          <Scoreline home={home} away={away} homeScore={result.homeScore} awayScore={result.awayScore}
            sub={<span className={`pill ${userWon ? 'win' : 'loss'}`}>{userWon ? 'You won' : 'You lost'}</span>} />
        </div>
        {injuries.length > 0 && (
          <div className="panel">
            <div className="notice">🩹 Injury: {injuries.map((i) => `${i.name} (${i.weeks}w)`).join(', ')}</div>
          </div>
        )}
        <div className="grid grid-2">
          <BoxScore team={home} box={result.homeBox} />
          <BoxScore team={away} box={result.awayBox} />
        </div>
        <div className="panel row spread wrap">
          <span className="muted">Other games this round were simulated too.</span>
          <button className="btn-primary" onClick={onContinue}>Continue →</button>
        </div>
      </div>
    )
  }

  // HALFTIME
  if (matchPhase === 'halftime' && half1) {
    return (
      <div>
        <div className="panel">
          <h3>{roundLabel} · Halftime</h3>
          <Scoreline home={home} away={away} homeScore={half1.homeScore} awayScore={half1.awayScore} sub="End of 1st half" />
        </div>
        <div className="panel">
          <h2>Adjust your tactics</h2>
          <p className="muted" style={{ marginBottom: 12 }}>Managing <strong style={{ color: 'var(--text)' }}>{userTeam.name}</strong>. Change your approach for the second half, then resume.</p>
          <TacticsEditor tactics={tactics} onChange={onTacticsChange} />
        </div>
        <div className="panel row spread wrap">
          <span className="muted">Second-half adjustments apply immediately.</span>
          <button className="btn-primary" onClick={onPlaySecondHalf}>Play 2nd half ▶</button>
        </div>
      </div>
    )
  }

  // PRE-GAME
  return (
    <div>
      <div className="panel">
        <h3>{roundLabel}</h3>
        <div style={{ marginTop: 8 }}>
          <Scoreline home={home} away={away} homeScore={'—'} awayScore={'—'}
            sub={seriesInfo || `${home.name} OVR ${home.overall} · ${away.name} OVR ${away.overall}`} />
        </div>
        <div className="notice" style={{ marginTop: 12 }}>
          You are managing <strong>{userTeam.name}</strong> ({userIsHome ? 'home' : 'away'}). Set tactics, then tip off — you can adjust again at halftime.
        </div>
      </div>

      <div className="panel">
        <h2>Your tactics</h2>
        <TacticsEditor tactics={tactics} onChange={onTacticsChange} />
      </div>

      <div className="panel row spread wrap">
        <span className="muted">Set your starting five on the Roster tab first.</span>
        <div className="row" style={{ gap: 8 }}>
          <button onClick={onQuickSim}>Quick sim ⏩</button>
          <button className="btn-primary" onClick={onPlayFirstHalf}>Play match ▶</button>
        </div>
      </div>
    </div>
  )
}
