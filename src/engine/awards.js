// End-of-season awards: MVP, scoring champion, All-EuroLeague first team.
// Computed from regular-season box scores plus team success.

import { computeStandings } from './schedule.js'

// Aggregate per-player regular-season stats across the whole league.
export function leaguePlayerStats(state) {
  const teamOf = new Map()
  for (const t of state.teams) for (const p of t.players) teamOf.set(p.id, t.id)

  const totals = new Map()
  for (const r of state.results) {
    for (const [box, teamId] of [
      [r.homeBox, r.homeId],
      [r.awayBox, r.awayId],
    ]) {
      for (const line of box) {
        const cur =
          totals.get(line.id) ||
          { id: line.id, name: line.name, pos: line.pos, teamId, gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }
        cur.gp++
        cur.pts += line.pts
        cur.reb += line.reb
        cur.ast += line.ast
        cur.stl += line.stl
        cur.blk += line.blk
        totals.set(line.id, cur)
      }
    }
  }

  return [...totals.values()].map((s) => ({
    ...s,
    teamId: teamOf.get(s.id) || s.teamId,
    ppg: s.gp ? s.pts / s.gp : 0,
    rpg: s.gp ? s.reb / s.gp : 0,
    apg: s.gp ? s.ast / s.gp : 0,
  }))
}

// Simple performance index blended with team wins for MVP.
function pir(s) {
  return s.ppg + s.rpg * 1.2 + s.apg * 1.5 + s.stl / Math.max(1, s.gp) * 2 + s.blk / Math.max(1, s.gp) * 2
}

export function computeAwards(state, champion) {
  const stats = leaguePlayerStats(state).filter((s) => s.gp >= Math.max(3, Math.round(state.results.length / 40)))
  const standings = computeStandings(state.teams, state.schedule.fixtures)
  const winByTeam = new Map(standings.map((s) => [s.id, s.w]))
  const maxW = Math.max(...standings.map((s) => s.w), 1)

  // MVP: performance index weighted slightly by team success.
  const mvp = [...stats]
    .map((s) => ({ s, score: pir(s) * (0.8 + 0.4 * ((winByTeam.get(s.teamId) || 0) / maxW)) }))
    .sort((a, b) => b.score - a.score)[0]?.s

  const scoringChamp = [...stats].sort((a, b) => b.ppg - a.ppg)[0]

  // All-EuroLeague first team: best PIR per position, filling PG,SG,SF,PF,C.
  const byPos = { PG: [], SG: [], SF: [], PF: [], C: [] }
  for (const s of stats) if (byPos[s.pos]) byPos[s.pos].push(s)
  const allEuro = ['PG', 'SG', 'SF', 'PF', 'C'].map((pos) => {
    const list = byPos[pos].sort((a, b) => pir(b) - pir(a))
    return list[0] || null
  })

  return {
    season: state.season,
    mvp: mvp ? snapshot(mvp) : null,
    scoringChamp: scoringChamp ? snapshot(scoringChamp) : null,
    allEuroLeague: allEuro.filter(Boolean).map(snapshot),
    champion,
  }
}

function snapshot(s) {
  return {
    id: s.id,
    name: s.name,
    pos: s.pos,
    teamId: s.teamId,
    ppg: +s.ppg.toFixed(1),
    rpg: +s.rpg.toFixed(1),
    apg: +s.apg.toFixed(1),
  }
}
