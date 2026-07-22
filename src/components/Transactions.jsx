import React, { useState } from 'react'
import { Badge, OvrBadge, PosChip } from './ui.jsx'
import { payroll } from '../state/store.js'

export default function Transactions({ state, onSign, onWaive, onTrade }) {
  const [msg, setMsg] = useState(null)
  const [sub, setSub] = useState('freeagency') // 'freeagency' | 'trade'
  const user = state.teams.find((t) => t.id === state.userTeamId)
  const pay = payroll(state, user.id)
  const capUsed = Math.min(100, Math.round((pay / (user.budget * 1.25)) * 100))

  function show(res) {
    setMsg(res)
    if (typeof window !== 'undefined') setTimeout(() => setMsg(null), 4000)
  }

  return (
    <div>
      <div className="panel">
        <h2>Finances — {user.name}</h2>
        <div className="stat-tiles">
          <div className="tile"><div className="lbl">Budget</div><div className="big">€{user.budget}M</div></div>
          <div className="tile"><div className="lbl">Payroll</div><div className="big">€{pay}M</div></div>
          <div className="tile"><div className="lbl">Cap room</div><div className="big" style={{ color: pay > user.budget ? 'var(--red)' : 'var(--green)' }}>€{(user.budget * 1.25 - pay).toFixed(1)}M</div></div>
          <div className="tile"><div className="lbl">Roster</div><div className="big">{user.players.length}/15</div></div>
        </div>
        <div style={{ marginTop: 12, height: 8, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${capUsed}%`, height: '100%', background: pay > user.budget ? 'var(--red)' : 'var(--green)' }} />
        </div>
        <p className="footer-note" style={{ textAlign: 'left' }}>Soft cap: you can spend up to 125% of budget. EuroLeague has no hard cap — this is an illustrative budget model.</p>
      </div>

      {msg && <div className="panel"><div className="notice" style={{ color: msg.ok ? 'var(--green)' : 'var(--orange-2)' }}>{msg.ok ? '✅ ' : '⚠️ '}{msg.msg || (msg.ok ? 'Done.' : 'Failed.')}</div></div>}

      <div className="panel">
        <div className="seg" style={{ marginBottom: 14 }}>
          <button className={sub === 'freeagency' ? 'on' : ''} onClick={() => setSub('freeagency')}>Free agency</button>
          <button className={sub === 'trade' ? 'on' : ''} onClick={() => setSub('trade')}>Trade</button>
        </div>
        {sub === 'freeagency'
          ? <FreeAgency state={state} onSign={(id) => show(onSign(id))} onWaive={(id) => show(onWaive(id))} />
          : <TradeBuilder state={state} onTrade={(o, g, r) => show(onTrade(o, g, r))} />}
      </div>
    </div>
  )
}

function FreeAgency({ state, onSign, onWaive }) {
  const user = state.teams.find((t) => t.id === state.userTeamId)
  return (
    <div className="grid grid-2">
      <div>
        <h3>Free agents ({state.freeAgents.length})</h3>
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {state.freeAgents.map((p) => (
            <div key={p.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row"><OvrBadge value={p.overall} /><PosChip pos={p.pos} /><span>{p.name}</span><span className="muted" style={{ fontSize: 12 }}>age {p.age} · €{p.salary}M</span></div>
              <button onClick={() => onSign(p.id)}>Sign</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3>Your roster ({user.players.length})</h3>
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {user.players.map((p) => (
            <div key={p.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row"><OvrBadge value={p.overall} /><PosChip pos={p.pos} /><span>{p.name}</span><span className="muted" style={{ fontSize: 12 }}>€{p.salary}M</span></div>
              <button onClick={() => onWaive(p.id)}>Waive</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TradeBuilder({ state, onTrade }) {
  const user = state.teams.find((t) => t.id === state.userTeamId)
  const others = state.teams.filter((t) => t.id !== user.id)
  const [otherId, setOtherId] = useState(others[0].id)
  const [give, setGive] = useState([])
  const [receive, setReceive] = useState([])
  const other = state.teams.find((t) => t.id === otherId)

  const toggle = (arr, set, id) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  const val = (ids, team) => ids.reduce((s, id) => s + (team.players.find((p) => p.id === id)?.overall || 0), 0)

  function PlayerPick({ team, selected, onToggle }) {
    return (
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {team.players.map((p) => (
          <label key={p.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div className="row"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => onToggle(p.id)} /><OvrBadge value={p.overall} /><PosChip pos={p.pos} /><span>{p.name}</span></div>
          </label>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="row wrap" style={{ marginBottom: 12, gap: 10 }}>
        <span className="muted">Trade with</span>
        <select value={otherId} onChange={(e) => { setOtherId(e.target.value); setReceive([]) }}>
          {others.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="grid grid-2">
        <div>
          <h3>You give ({user.name})</h3>
          <PlayerPick team={user} selected={give} onToggle={(id) => toggle(give, setGive, id)} />
        </div>
        <div>
          <h3>You receive ({other.name})</h3>
          <PlayerPick team={other} selected={receive} onToggle={(id) => toggle(receive, setReceive, id)} />
        </div>
      </div>
      <div className="row spread wrap" style={{ marginTop: 14 }}>
        <span className="muted">Giving OVR {val(give, user)} · Receiving OVR {val(receive, other)}</span>
        <button className="btn-primary" disabled={give.length === 0 && receive.length === 0}
          onClick={() => { onTrade(otherId, give, receive); setGive([]); setReceive([]) }}>
          Propose trade
        </button>
      </div>
    </div>
  )
}
