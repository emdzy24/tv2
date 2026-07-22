// Game state management with mock auth + localStorage persistence.
//
// This is the MOCK data layer. It stands in for what will later be Supabase
// (auth + Postgres). The public shape of these functions is intentionally close
// to what a real backend client would expose, so swapping is straightforward.

import { buildLeague } from '../data/euroleague.js'
import { generateSchedule, computeStandings } from '../engine/schedule.js'
import { simulateGame, DEFAULT_TACTICS } from '../engine/sim.js'

const SAVE_KEY = 'bm_save_v1'
const AUTH_KEY = 'bm_auth_v1'

// --- mock auth -----------------------------------------------------------
export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || null
  } catch {
    return null
  }
}

export function login(username) {
  const name = (username || '').trim()
  if (!name) throw new Error('Username required')
  const user = { username: name, id: 'u_' + name.toLowerCase().replace(/\s+/g, '_') }
  localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  return user
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
}

// --- save / load ---------------------------------------------------------
export function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || null
  } catch {
    return null
  }
}

export function persist(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY)
}

// --- new game ------------------------------------------------------------
// Create a fresh career for the given club id.
export function newCareer(userTeamId) {
  const teams = buildLeague()
  const schedule = generateSchedule(teams.map((t) => t.id))

  // Default lineups: top-5 by overall per team.
  const lineups = {}
  const tactics = {}
  for (const t of teams) {
    lineups[t.id] = t.players.slice(0, 5).map((p) => p.id)
    tactics[t.id] = { ...DEFAULT_TACTICS }
  }

  const state = {
    version: 1,
    season: 1,
    userTeamId,
    teams,
    schedule,
    lineups,
    tactics,
    currentFixtureIndex: 0,
    results: [], // { fixtureIndex, ...simResult }
    createdAt: null, // stamped by caller (Date not available in engine layer here is fine)
  }
  persist(state)
  return state
}

// --- gameplay helpers ----------------------------------------------------
export function getTeam(state, id) {
  return state.teams.find((t) => t.id === id)
}

export function standings(state) {
  return computeStandings(state.teams, state.schedule.fixtures)
}

// The user's next unplayed fixture.
export function userNextFixture(state) {
  return state.schedule.fixtures.find(
    (f) => !f.played && (f.home === state.userTeamId || f.away === state.userTeamId),
  )
}

// Play a single fixture (by reference) and record result.
function playFixture(state, fixture) {
  const home = getTeam(state, fixture.home)
  const away = getTeam(state, fixture.away)
  const result = simulateGame(home, away, {
    homeLineup: state.lineups[home.id],
    awayLineup: state.lineups[away.id],
    homeTactics: state.tactics[home.id],
    awayTactics: state.tactics[away.id],
    seedKey: `s${state.season}-r${fixture.round}`,
  })
  fixture.played = true
  fixture.homeScore = result.homeScore
  fixture.awayScore = result.awayScore
  state.results.push({ round: fixture.round, ...result })
  return result
}

// Advance the league by simulating all remaining fixtures in the CURRENT round,
// including the user's game (which should be simmed via simulateUserGame with
// chosen tactics first, but this also handles it if not).
export function advanceRound(state) {
  const nextUnplayed = state.schedule.fixtures.find((f) => !f.played)
  if (!nextUnplayed) return { done: true, results: [] }
  const round = nextUnplayed.round
  const results = []
  for (const f of state.schedule.fixtures) {
    if (f.round === round && !f.played) {
      results.push(playFixture(state, f))
    }
  }
  applyPostRoundEffects(state)
  persist(state)
  return { done: false, round, results }
}

// Play just the user's next fixture (with their current tactics/lineup), then
// sim the rest of that round for other teams.
export function simulateUserGame(state) {
  const fixture = userNextFixture(state)
  if (!fixture) return null
  const userResult = playFixture(state, fixture)
  // Sim the rest of the same round.
  for (const f of state.schedule.fixtures) {
    if (f.round === fixture.round && !f.played) playFixture(state, f)
  }
  applyPostRoundEffects(state)
  persist(state)
  return { fixture, userResult }
}

// Light per-round effects: morale drift from results, minor injury chance,
// recover injured players. Keeps the "living league" feel for the prototype.
function applyPostRoundEffects(state) {
  for (const t of state.teams) {
    for (const p of t.players) {
      if (p.injuredWeeks > 0) p.injuredWeeks = Math.max(0, p.injuredWeeks - 1)
    }
  }
  // Morale nudges based on latest results.
  const latestRound = Math.max(...state.results.map((r) => r.round), 0)
  for (const r of state.results.filter((x) => x.round === latestRound)) {
    const winner = getTeam(state, r.winner)
    const loserId = r.winner === r.homeId ? r.awayId : r.homeId
    const loser = getTeam(state, loserId)
    if (winner) winner.players.forEach((p) => (p.morale = Math.min(99, p.morale + 1)))
    if (loser) loser.players.forEach((p) => (p.morale = Math.max(30, p.morale - 1)))
  }
}

export function isSeasonOver(state) {
  return state.schedule.fixtures.every((f) => f.played)
}

// Aggregate player season stats from recorded box scores (user team focus,
// but works for any team).
export function seasonStatsForTeam(state, teamId) {
  const totals = new Map()
  for (const r of state.results) {
    const box = r.homeId === teamId ? r.homeBox : r.awayId === teamId ? r.awayBox : null
    if (!box) continue
    for (const line of box) {
      const cur =
        totals.get(line.id) ||
        { id: line.id, name: line.name, pos: line.pos, gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }
      cur.gp++
      cur.pts += line.pts
      cur.reb += line.reb
      cur.ast += line.ast
      cur.stl += line.stl
      cur.blk += line.blk
      totals.set(line.id, cur)
    }
  }
  return [...totals.values()]
    .map((s) => ({
      ...s,
      ppg: s.gp ? +(s.pts / s.gp).toFixed(1) : 0,
      rpg: s.gp ? +(s.reb / s.gp).toFixed(1) : 0,
      apg: s.gp ? +(s.ast / s.gp).toFixed(1) : 0,
    }))
    .sort((a, b) => b.ppg - a.ppg)
}

export { DEFAULT_TACTICS }
