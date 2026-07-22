import React, { useEffect, useState } from 'react'
import {
  currentUser, logout, loadSave, persist, clearSave, newCareer,
  standings as computeStandings, userNextFixture, simulateUserGame,
  isSeasonOver,
} from './state/store.js'
import Login from './components/Login.jsx'
import TeamSelect from './components/TeamSelect.jsx'
import Dashboard from './components/Dashboard.jsx'
import Roster from './components/Roster.jsx'
import Standings from './components/Standings.jsx'
import Stats from './components/Stats.jsx'
import Match from './components/Match.jsx'

const TABS = [
  ['dashboard', 'Dashboard'],
  ['roster', 'Roster & Lineup'],
  ['standings', 'Standings'],
  ['stats', 'Stats'],
]

export default function App() {
  const [user, setUser] = useState(() => currentUser())
  const [save, setSave] = useState(() => loadSave())
  const [tab, setTab] = useState('dashboard')
  const [view, setView] = useState('main') // 'main' | 'match'
  const [matchResult, setMatchResult] = useState(null)
  const [, force] = useState(0)

  // Persist + re-render helper after mutating the save object in place.
  function commit() {
    persist(save)
    force((n) => n + 1)
  }

  // --- not logged in ---
  if (!user) {
    return (
      <div className="app">
        <Login onLogin={(u) => setUser(u)} />
      </div>
    )
  }

  // --- logged in, no career yet ---
  if (!save) {
    return (
      <div className="app">
        <TopBar user={user} onLogout={handleLogout} />
        <TeamSelect
          onPick={(teamId) => {
            const s = newCareer(teamId)
            setSave(s)
            setTab('dashboard')
          }}
        />
      </div>
    )
  }

  function handleLogout() {
    logout()
    setUser(null)
  }

  function handleRestart() {
    if (!confirm('Restart career? This deletes your current save.')) return
    clearSave()
    setSave(null)
    setView('main')
    setMatchResult(null)
  }

  const team = save.teams.find((t) => t.id === save.userTeamId)
  const standings = computeStandings(save)
  const nextFixture = userNextFixture(save)
  const seasonOver = isSeasonOver(save)

  // --- match view ---
  if (view === 'match' && nextFixture) {
    return (
      <div className="app">
        <TopBar user={user} team={team} onLogout={handleLogout} onRestart={handleRestart} />
        <div className="row" style={{ marginBottom: 14 }}>
          <button onClick={() => { setView('main'); setMatchResult(null) }}>← Back</button>
        </div>
        <Match
          state={save}
          fixture={nextFixture}
          tactics={save.tactics[save.userTeamId]}
          onTacticsChange={(t) => { save.tactics[save.userTeamId] = t; commit() }}
          onPlay={() => {
            const res = simulateUserGame(save)
            setMatchResult(res)
            force((n) => n + 1)
          }}
          result={matchResult}
          onContinue={() => { setMatchResult(null); setView('main'); setTab('dashboard') }}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <TopBar user={user} team={team} onLogout={handleLogout} onRestart={handleRestart} />
      <div className="nav" style={{ marginBottom: 16 }}>
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <Dashboard
          state={save}
          standings={standings}
          nextFixture={nextFixture}
          seasonOver={seasonOver}
          onPlay={() => { setMatchResult(null); setView('match') }}
        />
      )}
      {tab === 'roster' && (
        <Roster
          team={team}
          lineup={save.lineups[save.userTeamId]}
          onLineupChange={(l) => { save.lineups[save.userTeamId] = l; commit() }}
        />
      )}
      {tab === 'standings' && <Standings state={save} standings={standings} />}
      {tab === 'stats' && <Stats state={save} />}

      <p className="footer-note">
        Basketball Manager · Milestone 1 prototype · mock data (no backend yet). Progress saves in your browser.
      </p>
    </div>
  )
}

function TopBar({ user, team, onLogout, onRestart }) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="dot" />
        <span>Basketball Manager</span>
        <small>· EuroLeague</small>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {team && <span className="muted" style={{ fontSize: 13 }}>Managing <strong style={{ color: 'var(--text)' }}>{team.name}</strong></span>}
        <span className="muted" style={{ fontSize: 13 }}>· {user.username}</span>
        {onRestart && <button onClick={onRestart}>Restart</button>}
        <button onClick={onLogout}>Log out</button>
      </div>
    </div>
  )
}
