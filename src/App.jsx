import React, { useState } from 'react'
import {
  currentUser, logout, loadSave, persist, clearSave, newCareer,
  standings as computeStandings, userNextFixture, userPlayoffGame,
  simulateUserGame, finishUserFixture, simulateUserPlayoffGame, finishUserPlayoffGame,
  processOffseason, beginNextSeason, seriesLabel,
  signFreeAgent, waivePlayer, proposeTrade, getTeam,
} from './state/store.js'
import { simulateHalf, combineHalves } from './engine/sim.js'
import Login from './components/Login.jsx'
import TeamSelect from './components/TeamSelect.jsx'
import Dashboard from './components/Dashboard.jsx'
import Roster from './components/Roster.jsx'
import Standings from './components/Standings.jsx'
import Stats from './components/Stats.jsx'
import Match from './components/Match.jsx'
import Playoffs from './components/Playoffs.jsx'
import Offseason from './components/Offseason.jsx'
import Transactions from './components/Transactions.jsx'

export default function App() {
  const [user, setUser] = useState(() => currentUser())
  const [save, setSave] = useState(() => loadSave())
  const [tab, setTab] = useState('dashboard')
  const [view, setView] = useState('main') // 'main' | 'match'
  const [matchPhase, setMatchPhase] = useState('pregame') // pregame|halftime|final
  const [half1, setHalf1] = useState(null)
  const [matchResult, setMatchResult] = useState(null)
  const [matchCtx, setMatchCtx] = useState(null) // captured game context for the match view
  const [, force] = useState(0)
  const rerender = () => force((n) => n + 1)

  function commit() { persist(save); rerender() }

  if (!user) {
    return <div className="app"><Login onLogin={setUser} /></div>
  }
  if (!save) {
    return (
      <div className="app">
        <TopBar user={user} onLogout={handleLogout} />
        <TeamSelect onPick={(teamId) => { setSave(newCareer(teamId)); setTab('dashboard') }} />
      </div>
    )
  }

  function handleLogout() { logout(); setUser(null) }
  function handleRestart() {
    if (!confirm('Restart career? This deletes your current save.')) return
    clearSave(); setSave(null); setView('main'); resetMatch()
  }
  function resetMatch() { setMatchPhase('pregame'); setHalf1(null); setMatchResult(null) }

  const team = getTeam(save, save.userTeamId)
  const standings = computeStandings(save)

  // Determine the user's current playable game (regular fixture or playoff game).
  function getMatchTarget() {
    if (save.phase === 'regular') {
      const f = userNextFixture(save)
      if (!f) return null
      return {
        isPlayoff: false, fixture: f,
        home: getTeam(save, f.home), away: getTeam(save, f.away),
        seedKey: `s${save.season}-r${f.round}`,
        label: `Round ${f.round}`, seriesInfo: null,
      }
    }
    if (save.phase === 'playoffs') {
      const pg = userPlayoffGame(save)
      if (!pg) return null
      return {
        isPlayoff: true, pg,
        home: getTeam(save, pg.home), away: getTeam(save, pg.away),
        seedKey: `s${save.season}-po-${pg.seriesId}-g${pg.gameIndex}`,
        label: seriesLabel(pg.round),
        seriesInfo: `Series ${pg.series.aWins}-${pg.series.bWins} · Game ${pg.gameIndex + 1}`,
      }
    }
    return null
  }
  const matchTarget = getMatchTarget()

  // --- offseason / preseason takes over the screen ---
  // ...but not while the user is still viewing the result of the game that
  // ended their season — let them dismiss it first (Continue → view 'main').
  const viewingMatchResult = view === 'match' && matchCtx && matchResult
  if ((save.phase === 'offseason' || save.phase === 'preseason') && !viewingMatchResult) {
    return (
      <div className="app">
        <TopBar user={user} team={team} onLogout={handleLogout} onRestart={handleRestart} />
        <Offseason
          state={save}
          awards={save.lastAwards}
          report={save.lastOffseasonReport}
          onStartNext={() => {
            if (!save.lastOffseasonReport) processOffseason(save)
            else { beginNextSeason(save); setTab('dashboard') }
            rerender()
          }}
        />
      </div>
    )
  }

  // --- match view (halftime flow) — uses matchCtx captured at kickoff so the
  // result screen survives phase changes (e.g. season ending after the game) ---
  if (view === 'match' && matchCtx) {
    const { home, away, isPlayoff, seedKey, fixture } = matchCtx
    const userIsHome = home.id === save.userTeamId
    const buildOpts = () => ({
      homeLineup: save.lineups[home.id], awayLineup: save.lineups[away.id],
      homeTactics: save.tactics[home.id], awayTactics: save.tactics[away.id],
      seedKey,
    })

    return (
      <div className="app">
        <TopBar user={user} team={team} onLogout={handleLogout} onRestart={handleRestart} />
        <div className="row" style={{ marginBottom: 14 }}>
          <button onClick={() => { setView('main'); resetMatch() }}>← Back</button>
        </div>
        <Match
          state={save} home={home} away={away} userIsHome={userIsHome}
          roundLabel={matchCtx.label} seriesInfo={matchCtx.seriesInfo}
          tactics={save.tactics[save.userTeamId]}
          onTacticsChange={(t) => { save.tactics[save.userTeamId] = t; commit() }}
          matchPhase={matchPhase} half1={half1} result={matchResult}
          onQuickSim={() => {
            const r = isPlayoff ? simulateUserPlayoffGame(save) : simulateUserGame(save)
            setMatchResult(r.userResult); setMatchPhase('final'); rerender()
          }}
          onPlayFirstHalf={() => {
            const h1 = simulateHalf(home, away, buildOpts(), 1)
            setHalf1(h1); setMatchPhase('halftime'); rerender()
          }}
          onPlaySecondHalf={() => {
            const h2 = simulateHalf(home, away, buildOpts(), 2)
            const full = combineHalves(half1, h2, home, away, seedKey)
            if (isPlayoff) finishUserPlayoffGame(save, full)
            else finishUserFixture(save, fixture, full)
            setMatchResult(full); setMatchPhase('final'); rerender()
          }}
          onContinue={() => { setView('main'); resetMatch(); setTab('dashboard') }}
        />
      </div>
    )
  }

  // --- main tabbed view ---
  const tabs = [
    ['dashboard', 'Dashboard'],
    ['roster', 'Roster & Lineup'],
    ...(save.phase === 'playoffs' || save.playoffs ? [['playoffs', 'Playoffs']] : []),
    ['standings', 'Standings'],
    ['stats', 'Stats'],
    ['transactions', 'Transactions'],
  ]
  const activeTab = tabs.some(([id]) => id === tab) ? tab : 'dashboard'

  return (
    <div className="app">
      <TopBar user={user} team={team} onLogout={handleLogout} onRestart={handleRestart} />
      <div className="nav" style={{ marginBottom: 16 }}>
        {tabs.map(([id, label]) => (
          <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <Dashboard
          state={save} standings={standings} matchTarget={matchTarget} phase={save.phase}
          onPlay={() => { if (matchTarget) { setMatchCtx(matchTarget); resetMatch(); setView('match') } }}
        />
      )}
      {activeTab === 'roster' && (
        <Roster team={team} lineup={save.lineups[save.userTeamId]}
          onLineupChange={(l) => { save.lineups[save.userTeamId] = l; commit() }} />
      )}
      {activeTab === 'playoffs' && <Playoffs state={save} />}
      {activeTab === 'standings' && <Standings state={save} standings={standings} />}
      {activeTab === 'stats' && <Stats state={save} />}
      {activeTab === 'transactions' && (
        <Transactions
          state={save}
          onSign={(id) => { const r = signFreeAgent(save, id); rerender(); return r }}
          onWaive={(id) => { const r = waivePlayer(save, id); rerender(); return r }}
          onTrade={(o, g, r2) => { const r = proposeTrade(save, o, g, r2); rerender(); return r }}
        />
      )}

      <p className="footer-note">
        Basketball Manager · Milestones 1-2 · mock data (no backend yet). Progress saves in your browser.
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
