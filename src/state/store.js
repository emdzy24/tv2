// Game state management with mock auth + localStorage persistence.
//
// This is the MOCK data layer. It stands in for what will later be Supabase
// (auth + Postgres). The public shape of these functions is intentionally close
// to what a real backend client would expose, so swapping is straightforward.

import { buildLeague, makePlayer, computeTeamOverall, POSITIONS } from '../data/euroleague.js'
import { generateSchedule, computeStandings } from '../engine/schedule.js'
import { simulateGame, DEFAULT_TACTICS } from '../engine/sim.js'
import {
  buildPlayoffs, homeTeamForGame, applyGameToSeries, nextRound,
  autoSimSeries, findUserSeries,
} from '../engine/playoffs.js'
import { computeAwards } from '../engine/awards.js'
import { runOffseason } from '../engine/offseason.js'

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

// --- free agents ---------------------------------------------------------
function generateFreeAgents(count) {
  const list = []
  for (let i = 0; i < count; i++) {
    const pos = POSITIONS[i % POSITIONS.length]
    const base = 56 + Math.floor((i * 37) % 20) // 56-76 spread, deterministic
    const age = 20 + ((i * 13) % 15)
    const id = `fa${i}`
    list.push(makePlayer(`freeagent-${i}`, { id, pos, base, age }))
  }
  return list.sort((a, b) => b.overall - a.overall)
}

// --- new game ------------------------------------------------------------
export function newCareer(userTeamId) {
  const teams = buildLeague()
  const schedule = generateSchedule(teams.map((t) => t.id))
  const lineups = {}
  const tactics = {}
  for (const t of teams) {
    lineups[t.id] = t.players.slice(0, 5).map((p) => p.id)
    tactics[t.id] = { ...DEFAULT_TACTICS }
  }

  const state = {
    version: 2,
    season: 1,
    userTeamId,
    teams,
    schedule,
    lineups,
    tactics,
    results: [],
    phase: 'regular', // 'regular' | 'playoffs' | 'offseason'
    playoffs: null,
    freeAgents: generateFreeAgents(24),
    awardsHistory: [],
    champions: [],
    transactions: [],
  }
  persist(state)
  return state
}

// --- helpers -------------------------------------------------------------
export function getTeam(state, id) {
  return state.teams.find((t) => t.id === id)
}
function teamsMap(state) {
  return new Map(state.teams.map((t) => [t.id, t]))
}
export function standings(state) {
  return computeStandings(state.teams, state.schedule.fixtures)
}
export function userNextFixture(state) {
  if (state.phase !== 'regular') return null
  return state.schedule.fixtures.find(
    (f) => !f.played && (f.home === state.userTeamId || f.away === state.userTeamId),
  )
}
export function isSeasonOver(state) {
  return state.schedule.fixtures.every((f) => f.played)
}

function findPlayer(state, playerId) {
  for (const t of state.teams) {
    const p = t.players.find((pl) => pl.id === playerId)
    if (p) return { team: t, player: p }
  }
  return null
}

function applyInjuries(state, injuries) {
  for (const inj of injuries || []) {
    const found = findPlayer(state, inj.playerId)
    if (found) found.player.injuredWeeks = Math.max(found.player.injuredWeeks || 0, inj.weeks)
  }
}

// Decrement injury clocks league-wide (once per matchday/round).
function recoverInjuries(state) {
  for (const t of state.teams) {
    for (const p of t.players) {
      if (p.injuredWeeks > 0) p.injuredWeeks = Math.max(0, p.injuredWeeks - 1)
    }
  }
}

function applyMorale(state, roundResults) {
  for (const r of roundResults) {
    const winner = getTeam(state, r.winner)
    const loserId = r.winner === r.homeId ? r.awayId : r.homeId
    const loser = getTeam(state, loserId)
    if (winner) winner.players.forEach((p) => (p.morale = Math.min(99, (p.morale || 60) + 1)))
    if (loser) loser.players.forEach((p) => (p.morale = Math.max(30, (p.morale || 60) - 1)))
  }
}

// --- regular-season play -------------------------------------------------
function simFixture(state, fixture) {
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
  applyInjuries(state, result.injuries)
  return result
}

// Sim every remaining game in the same round as `fixture`, then post effects
// and phase transition. Returns the round's results.
function finishRound(state, fixture, precomputedUserResult) {
  const round = fixture.round
  const roundResults = []

  if (precomputedUserResult) {
    // Record the user's externally-simulated (halftime) result.
    fixture.played = true
    fixture.homeScore = precomputedUserResult.homeScore
    fixture.awayScore = precomputedUserResult.awayScore
    state.results.push({ round, ...precomputedUserResult })
    applyInjuries(state, precomputedUserResult.injuries)
    roundResults.push(precomputedUserResult)
  }

  for (const f of state.schedule.fixtures) {
    if (f.round === round && !f.played) roundResults.push(simFixture(state, f))
  }
  applyMorale(state, roundResults)

  if (isSeasonOver(state)) startPlayoffs(state)
  persist(state)
  return roundResults
}

// Quick-sim the user's next fixture (auto tactics) + rest of the round.
export function simulateUserGame(state) {
  const fixture = userNextFixture(state)
  if (!fixture) return null
  recoverInjuries(state)
  const userResult = simFixture(state, fixture)
  const round = fixture.round
  for (const f of state.schedule.fixtures) {
    if (f.round === round && !f.played) simFixture(state, f)
  }
  applyMorale(state, state.results.filter((r) => r.round === round))
  if (isSeasonOver(state)) startPlayoffs(state)
  persist(state)
  return { fixture, userResult }
}

// Finish the user's fixture with an externally-computed result (halftime flow).
export function finishUserFixture(state, fixture, userResult) {
  recoverInjuries(state)
  const results = finishRound(state, fixture, userResult)
  return { fixture, userResult, results }
}

// --- playoffs ------------------------------------------------------------
function autoSimAiSeries(state) {
  const byId = teamsMap(state)
  for (const s of state.playoffs.bracket) {
    if (!s.winner && s.aId !== state.userTeamId && s.bId !== state.userTeamId) {
      autoSimSeries(s, byId, state.lineups, state.tactics, `s${state.season}`)
    }
  }
}

export function startPlayoffs(state) {
  state.phase = 'playoffs'
  state.playoffs = buildPlayoffs(standings(state))
  maybeAdvancePlayoffs(state)
  persist(state)
}

function maybeAdvancePlayoffs(state) {
  const po = state.playoffs
  autoSimAiSeries(state)
  let guard = 0
  while (po.round !== 'done' && po.bracket.every((s) => s.winner) && guard++ < 12) {
    nextRound(po, standings(state))
    if (po.round === 'done') {
      finalizePlayoffs(state)
      return
    }
    autoSimAiSeries(state)
  }
}

function finalizePlayoffs(state) {
  const champion = state.playoffs.champion
  const awards = computeAwards(state, champion)
  state.awardsHistory.push(awards)
  state.champions.push({ season: state.season, teamId: champion })
  state.phase = 'offseason'
  state.lastAwards = awards
}

// The user's next playoff game (pseudo-fixture), or null if not currently playing.
export function userPlayoffGame(state) {
  if (state.phase !== 'playoffs' || !state.playoffs) return null
  const series = findUserSeries(state.playoffs, state.userTeamId)
  if (!series || series.winner) return null
  const gameIndex = series.games.length
  const home = homeTeamForGame(series, gameIndex)
  const away = home === series.aId ? series.bId : series.aId
  return { home, away, round: state.playoffs.round, seriesId: series.id, gameIndex, series }
}

function recordUserPlayoffResult(state, result) {
  const series = findUserSeries(state.playoffs, state.userTeamId)
  applyGameToSeries(series, result)
  applyInjuries(state, result.injuries)
  applyMorale(state, [result])
  if (series.winner) maybeAdvancePlayoffs(state)
  persist(state)
}

// Quick-sim the user's next playoff game with current tactics.
export function simulateUserPlayoffGame(state) {
  const pg = userPlayoffGame(state)
  if (!pg) return null
  recoverInjuries(state)
  const home = getTeam(state, pg.home)
  const away = getTeam(state, pg.away)
  const result = simulateGame(home, away, {
    homeLineup: state.lineups[home.id],
    awayLineup: state.lineups[away.id],
    homeTactics: state.tactics[home.id],
    awayTactics: state.tactics[away.id],
    seedKey: `s${state.season}-po-${pg.seriesId}-g${pg.gameIndex}`,
  })
  recordUserPlayoffResult(state, result)
  return { pg, userResult: result }
}

// Finish the user's playoff game with an externally-computed result (halftime).
export function finishUserPlayoffGame(state, result) {
  recoverInjuries(state)
  recordUserPlayoffResult(state, result)
  return result
}

export function seriesLabel(round) {
  return { QF: 'Quarterfinals (Best of 5)', SF: 'Semifinal (Final Four)', F: 'Final', done: 'Complete' }[round] || round
}

// --- offseason -----------------------------------------------------------
// Step 1: age/develop/retire players, refill rosters, build next schedule.
// Moves phase to 'preseason' and produces a report (season already advanced).
export function processOffseason(state) {
  const report = runOffseason(state)
  state.freeAgents = generateFreeAgents(24)
  state.lastOffseasonReport = report
  persist(state)
  return report
}

// Step 2: begin the new regular season.
export function beginNextSeason(state) {
  state.phase = 'regular'
  state.lastOffseasonReport = null
  state.lastAwards = null
  persist(state)
}

// --- transactions: free agency ------------------------------------------
export function payroll(state, teamId) {
  const t = getTeam(state, teamId)
  return +t.players.reduce((s, p) => s + (p.salary || 0), 0).toFixed(1)
}

export function signFreeAgent(state, playerId) {
  const team = getTeam(state, state.userTeamId)
  const idx = state.freeAgents.findIndex((p) => p.id === playerId)
  if (idx < 0) return { ok: false, msg: 'Player not available.' }
  if (team.players.length >= 15) return { ok: false, msg: 'Roster full (max 15).' }
  const player = state.freeAgents[idx]
  const newPayroll = payroll(state, team.id) + (player.salary || 0)
  if (newPayroll > team.budget * 1.25) {
    return { ok: false, msg: `Over budget: €${newPayroll.toFixed(1)}M payroll vs €${team.budget}M budget.` }
  }
  state.freeAgents.splice(idx, 1)
  team.players.push(player)
  team.players.sort((a, b) => b.overall - a.overall)
  team.overall = computeTeamOverall(team.players)
  state.transactions.unshift({ season: state.season, type: 'sign', text: `Signed ${player.name} (${player.pos}, OVR ${player.overall})` })
  persist(state)
  return { ok: true }
}

export function waivePlayer(state, playerId) {
  const team = getTeam(state, state.userTeamId)
  if (team.players.length <= 8) return { ok: false, msg: 'Roster minimum is 8.' }
  const idx = team.players.findIndex((p) => p.id === playerId)
  if (idx < 0) return { ok: false, msg: 'Not on your roster.' }
  const [player] = team.players.splice(idx, 1)
  // Remove from lineup if present.
  state.lineups[team.id] = (state.lineups[team.id] || []).filter((id) => id !== playerId)
  team.overall = computeTeamOverall(team.players)
  state.freeAgents.unshift(player)
  state.freeAgents.sort((a, b) => b.overall - a.overall)
  state.transactions.unshift({ season: state.season, type: 'waive', text: `Waived ${player.name}` })
  persist(state)
  return { ok: true }
}

// --- transactions: trades ------------------------------------------------
// Evaluate + (if accepted) execute a trade of user players for another team's.
export function proposeTrade(state, otherTeamId, giveIds, receiveIds) {
  const user = getTeam(state, state.userTeamId)
  const other = getTeam(state, otherTeamId)
  if (!other || otherTeamId === state.userTeamId) return { ok: false, msg: 'Pick a valid team.' }
  if (giveIds.length === 0 && receiveIds.length === 0) return { ok: false, msg: 'Select players to trade.' }

  const give = giveIds.map((id) => user.players.find((p) => p.id === id)).filter(Boolean)
  const receive = receiveIds.map((id) => other.players.find((p) => p.id === id)).filter(Boolean)

  // Roster size validity.
  const userSize = user.players.length - give.length + receive.length
  const otherSize = other.players.length - receive.length + give.length
  if (userSize < 8 || userSize > 15 || otherSize < 8 || otherSize > 15) {
    return { ok: false, msg: 'Trade would break a roster size limit (8-15).' }
  }

  // AI acceptance: values the deal by talent it receives vs gives, with a
  // small preference for its own needs. Accepts if net value is non-negative.
  const val = (p) => p.overall + Math.max(0, p.potential - p.overall) * 0.4
  const otherGets = give.reduce((s, p) => s + val(p), 0)
  const otherGives = receive.reduce((s, p) => s + val(p), 0)
  const accepted = otherGets >= otherGives * 0.98

  if (!accepted) {
    return { ok: false, msg: `${other.name} rejected the offer — they want more value.` }
  }

  // Execute.
  user.players = user.players.filter((p) => !giveIds.includes(p.id)).concat(receive)
  other.players = other.players.filter((p) => !receiveIds.includes(p.id)).concat(give)
  state.lineups[user.id] = (state.lineups[user.id] || []).filter((id) => !giveIds.includes(id))
  state.lineups[other.id] = (state.lineups[other.id] || []).filter((id) => !receiveIds.includes(id))
  ;[user, other].forEach((t) => {
    t.players.sort((a, b) => b.overall - a.overall)
    t.overall = computeTeamOverall(t.players)
  })
  const desc = `Traded ${give.map((p) => p.name).join(', ') || '—'} to ${other.name} for ${receive.map((p) => p.name).join(', ') || '—'}`
  state.transactions.unshift({ season: state.season, type: 'trade', text: desc })
  persist(state)
  return { ok: true, msg: 'Trade accepted!' }
}

// --- stats ---------------------------------------------------------------
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
