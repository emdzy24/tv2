// Offseason processing: age players, develop/decline them, retire the old,
// refill rosters with free agents, and reset the world for a new season.

import { recomputeOverall, computeTeamOverall, makePlayer, POSITIONS } from '../data/euroleague.js'
import { generateSchedule } from './schedule.js'
import { DEFAULT_TACTICS } from './sim.js'

const ATTR_KEYS = [
  'insideScoring', 'outsideScoring', 'playmaking', 'rebounding',
  'perimeterDefense', 'interiorDefense', 'athleticism', 'basketballIQ', 'stamina',
]

function makeRng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Age-based development delta applied to attributes.
// Young + high-potential players grow; veterans decline. Returns a summary.
function developPlayer(rng, p) {
  const before = p.overall
  p.age += 1

  let delta = 0
  if (p.age <= 23) delta = 2 + Math.round(rng() * 2) // 2-4 growth
  else if (p.age <= 27) delta = Math.round(rng() * 2) // 0-2
  else if (p.age <= 30) delta = rng() < 0.5 ? 0 : -1
  else if (p.age <= 33) delta = -(1 + Math.round(rng() * 1)) // -1..-2
  else delta = -(2 + Math.round(rng() * 2)) // -2..-4

  // Cap growth at potential.
  if (delta > 0 && p.overall >= p.potential) delta = 0

  // Apply the delta to every attribute (with small jitter) so the overall
  // moves by roughly `delta`. Overall is the mean of the attributes.
  for (const k of ATTR_KEYS) {
    const jitter = rng() < 0.3 ? Math.sign(delta) : 0
    p.attrs[k] = Math.max(40, Math.min(99, p.attrs[k] + delta + jitter))
  }

  p.overall = recomputeOverall(p)
  if (p.overall > p.potential) p.potential = p.overall
  // Reset seasonal state.
  p.injuredWeeks = 0
  p.form = 0
  p.morale = 60 + Math.round(rng() * 20)
  if (p.contractYears > 0) p.contractYears -= 1

  return { id: p.id, name: p.name, before, after: p.overall, age: p.age }
}

function shouldRetire(p, rng) {
  if (p.age >= 38) return true
  if (p.age >= 36) return rng() < 0.6
  if (p.age >= 34 && p.overall < 72) return rng() < 0.5
  if (p.age >= 33 && p.overall < 65) return rng() < 0.4
  return false
}

// Fill a roster back up to `min` players with generated free agents.
function refill(team, rng, season, targetMin = 12) {
  let counter = 0
  while (team.players.length < targetMin) {
    const counts = team.players.reduce((m, p) => ((m[p.pos] = (m[p.pos] || 0) + 1), m), {})
    let pos = POSITIONS[0]
    let deficit = -Infinity
    for (const pp of POSITIONS) {
      const d = 2 - (counts[pp] || 0)
      if (d > deficit) { deficit = d; pos = pp }
    }
    const base = 60 + Math.floor(rng() * 16)
    const age = 19 + Math.floor(rng() * 12)
    const id = `s${season}_${team.id}_${counter++}`
    team.players.push(
      makePlayer(`${id}-${Math.floor(rng() * 1e9)}`, { id, pos, base, age }),
    )
  }
}

// Run the full offseason. Mutates and returns a fresh season state.
export function runOffseason(state) {
  const rng = makeRng(hashNum(`offseason-${state.season}`))
  const report = { season: state.season, retirements: [], risers: [], sliders: [] }

  for (const team of state.teams) {
    const survivors = []
    for (const p of team.players) {
      if (shouldRetire(p, rng)) {
        report.retirements.push({ name: p.name, age: p.age + 1, team: team.id, overall: p.overall })
        continue
      }
      const summary = developPlayer(rng, p)
      const change = summary.after - summary.before
      if (change >= 3) report.risers.push({ ...summary, team: team.id })
      if (change <= -3) report.sliders.push({ ...summary, team: team.id })
      survivors.push(p)
    }
    team.players = survivors
    refill(team, rng, state.season + 1)
    team.players.sort((a, b) => b.overall - a.overall)
    team.overall = computeTeamOverall(team.players)
    team.budget = +(8 + team.overall * 0.4).toFixed(1)
  }

  // New season reset.
  const newSeason = state.season + 1
  const schedule = generateSchedule(state.teams.map((t) => t.id))
  const lineups = {}
  const tactics = {}
  for (const t of state.teams) {
    lineups[t.id] = t.players.slice(0, 5).map((p) => p.id)
    tactics[t.id] = state.tactics?.[t.id] || { ...DEFAULT_TACTICS }
  }

  state.season = newSeason
  state.schedule = schedule
  state.lineups = lineups
  state.tactics = tactics
  state.results = []
  state.phase = 'preseason'
  state.playoffs = null
  report.newSeason = newSeason
  return report
}

function hashNum(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
