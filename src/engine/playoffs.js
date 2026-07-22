// Playoff engine — EuroLeague-style: top 8 seeds.
// Quarterfinals: best-of-5, higher seed hosts games 1, 2 and 5 (2-2-1).
// Final Four: single-game semifinals and a single-game final.
//
// Bracket wiring (seed pairs): QF1 = 1v8, QF2 = 4v5, QF3 = 2v7, QF4 = 3v6.
// Semis pair QF winners (QF1 vs QF2) and (QF3 vs QF4); winners meet in the Final.

import { simulateGame } from './sim.js'

function makeSeries(id, high, low, bestOf) {
  return {
    id,
    aId: high.id, // higher seed
    bId: low.id, // lower seed
    aSeed: high.seed,
    bSeed: low.seed,
    bestOf,
    aWins: 0,
    bWins: 0,
    games: [], // recorded results
    winner: null,
  }
}

// standings: array of standings rows (has .id). teamsById for names/seeds.
export function buildPlayoffs(standings) {
  const top8 = standings.slice(0, 8).map((s, i) => ({ id: s.id, seed: i + 1 }))
  const seed = (n) => top8.find((t) => t.seed === n)
  const qf = [
    makeSeries('QF1', seed(1), seed(8), 5),
    makeSeries('QF2', seed(4), seed(5), 5),
    makeSeries('QF3', seed(2), seed(7), 5),
    makeSeries('QF4', seed(3), seed(6), 5),
  ]
  return {
    round: 'QF',
    bracket: qf,
    history: { QF: qf },
    champion: null,
  }
}

// Which team hosts a given game index (0-based) of a series.
export function homeTeamForGame(series, gameIndex) {
  if (series.bestOf === 1) return series.aId
  // 2-2-1 pattern for Bo5: games 0,1 -> higher seed; 2,3 -> lower seed; 4 -> higher.
  const pattern = [series.aId, series.aId, series.bId, series.bId, series.aId]
  return pattern[gameIndex] || series.aId
}

export function seriesClinch(series) {
  return Math.ceil(series.bestOf / 2 + 0.5) // wins needed (3 for Bo5, 1 for Bo1)
}

// Apply a completed game result to a series; sets winner if clinched.
export function applyGameToSeries(series, result) {
  series.games.push(result)
  if (result.winner === series.aId) series.aWins++
  else series.bWins++
  const need = seriesClinch(series)
  if (series.aWins >= need) series.winner = series.aId
  else if (series.bWins >= need) series.winner = series.bId
  return series
}

// Build the next round's bracket from finished series winners.
export function nextRound(playoffs, standings) {
  const seedOf = (id) => standings.findIndex((s) => s.id === id) + 1
  const asSeed = (id) => ({ id, seed: seedOf(id) })

  if (playoffs.round === 'QF') {
    const [q1, q2, q3, q4] = playoffs.bracket.map((s) => s.winner)
    const sf = [
      makeSeries('SF1', asSeed(q1), asSeed(q2), 1),
      makeSeries('SF2', asSeed(q3), asSeed(q4), 1),
    ]
    // Ensure higher seed is aId.
    sf.forEach((s) => normalizeSeeds(s))
    playoffs.round = 'SF'
    playoffs.bracket = sf
    playoffs.history.SF = sf
  } else if (playoffs.round === 'SF') {
    const [s1, s2] = playoffs.bracket.map((s) => s.winner)
    const f = [makeSeries('F', asSeed(s1), asSeed(s2), 1)]
    f.forEach((s) => normalizeSeeds(s))
    playoffs.round = 'F'
    playoffs.bracket = f
    playoffs.history.F = f
  } else if (playoffs.round === 'F') {
    playoffs.round = 'done'
    playoffs.champion = playoffs.bracket[0].winner
  }
  return playoffs
}

function normalizeSeeds(s) {
  if (s.bSeed < s.aSeed) {
    ;[s.aId, s.bId] = [s.bId, s.aId]
    ;[s.aSeed, s.bSeed] = [s.bSeed, s.aSeed]
  }
}

// Auto-simulate one full series to completion (used for AI-only series).
export function autoSimSeries(series, teamsById, lineups, tactics, seasonKey) {
  while (!series.winner) {
    const gi = series.games.length
    const homeId = homeTeamForGame(series, gi)
    const awayId = homeId === series.aId ? series.bId : series.aId
    const result = simulateGame(teamsById.get(homeId), teamsById.get(awayId), {
      homeLineup: lineups[homeId],
      awayLineup: lineups[awayId],
      homeTactics: tactics[homeId],
      awayTactics: tactics[awayId],
      seedKey: `${seasonKey}-po-${series.id}-g${gi}`,
    })
    applyGameToSeries(series, result)
  }
  return series
}

export function findUserSeries(playoffs, userId) {
  return playoffs.bracket.find((s) => s.aId === userId || s.bId === userId) || null
}
