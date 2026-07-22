// Stat-based match simulation engine.
//
// Deterministic given a seed. Produces a final score plus a per-player box score.
// The model is intentionally simple but reacts to lineups, tactics, player
// ratings, form, morale and home advantage. It will be tuned over time.

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

function hashSeed(...parts) {
  let h = 2166136261
  const str = parts.join('|')
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Default tactics if a team hasn't set any.
export const DEFAULT_TACTICS = {
  pace: 50, // 0 slow .. 100 fast
  offFocus: 'balanced', // 'inside' | 'outside' | 'balanced'
  defFocus: 'balanced', // 'perimeter' | 'interior' | 'balanced'
  aggression: 50, // affects fouls / steals
}

// Rotation: which players are on the floor and their share of minutes.
// `lineup` is an array of up to 5 starter ids; bench fills the rest.
function buildRotation(team, lineup) {
  const available = team.players.filter((p) => p.injuredWeeks <= 0)
  const byId = new Map(available.map((p) => [p.id, p]))

  const starters = (lineup || [])
    .map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, 5)

  // Fill starters up to 5 with best available not already chosen.
  const chosen = new Set(starters.map((p) => p.id))
  const rest = available
    .filter((p) => !chosen.has(p.id))
    .sort((a, b) => b.overall - a.overall)
  while (starters.length < 5 && rest.length) starters.push(rest.shift())

  // Bench = next best 3-4.
  const bench = rest.slice(0, 4)

  // Minute weights (total ~200 player-minutes across 40-min game / 5 on floor).
  const rotation = []
  starters.forEach((p, i) =>
    rotation.push({ player: p, minutes: 30 - i * 2, starter: true }),
  )
  bench.forEach((p, i) => rotation.push({ player: p, minutes: 16 - i * 3, starter: false }))

  // Normalize to 200 minutes.
  const totalMin = rotation.reduce((s, r) => s + Math.max(4, r.minutes), 0)
  const scale = 200 / totalMin
  rotation.forEach((r) => (r.minutes = Math.max(4, r.minutes) * scale))
  return rotation
}

function offensiveRating(p, tactics) {
  const a = p.attrs
  let inside = a.insideScoring
  let outside = a.outsideScoring
  if (tactics.offFocus === 'inside') inside += 6
  if (tactics.offFocus === 'outside') outside += 6
  const scoring = (inside + outside) / 2
  const create = a.playmaking * 0.4 + a.basketballIQ * 0.2
  const formBonus = (p.form || 0) * 1.2
  const moraleBonus = ((p.morale || 60) - 60) * 0.15
  return scoring * 0.6 + create * 0.4 + formBonus + moraleBonus
}

function defensiveRating(p, tactics) {
  const a = p.attrs
  let perim = a.perimeterDefense
  let interior = a.interiorDefense
  if (tactics.defFocus === 'perimeter') perim += 6
  if (tactics.defFocus === 'interior') interior += 6
  return (perim + interior) / 2 * 0.7 + a.athleticism * 0.15 + a.basketballIQ * 0.15
}

// Simulate one team's scoring given its rotation, opponent defense and tactics.
// `factor` scales the segment length (1 = full game, 0.5 = one half).
function simTeamOffense(rng, rotation, oppDefense, tactics, homeEdge, factor = 1) {
  const possBase = (74 + (tactics.pace - 50) * 0.16) * factor // scaled possessions
  const possessions = Math.round(possBase + (rng() - 0.5) * 6 * factor)

  // Team offensive strength vs opponent defense.
  let teamOff = 0
  let usagePool = []
  rotation.forEach((r) => {
    const off = offensiveRating(r.player, tactics)
    const weight = (r.minutes / 40) * (0.5 + off / 100)
    teamOff += off * (r.minutes / 200)
    usagePool.push({ r, off, usage: weight })
  })
  const usageTotal = usagePool.reduce((s, u) => s + u.usage, 0)

  const efficiency =
    1.01 + (teamOff - oppDefense) / 120 + homeEdge // points per possession-ish
  const clampedEff = Math.max(0.82, Math.min(1.32, efficiency))

  // Distribute possessions/points to players by usage.
  const box = usagePool.map((u) => {
    const share = u.usage / usageTotal
    const playerPoss = possessions * share
    const noise = 0.8 + rng() * 0.5
    const pts = Math.max(0, Math.round(playerPoss * clampedEff * noise))
    // Peripheral stats.
    const a = u.r.player.attrs
    const min = Math.round(u.r.minutes * factor)
    const reb = Math.round((a.rebounding / 100) * (min / 40) * (rng() * 6 + 2))
    const ast = Math.round((a.playmaking / 100) * (min / 40) * (rng() * 5 + 1))
    const stl = Math.round((a.perimeterDefense / 100) * (rng() * 2))
    const blk = Math.round((a.interiorDefense / 100) * (rng() * 1.6))
    return {
      id: u.r.player.id,
      name: u.r.player.name,
      pos: u.r.player.pos,
      min,
      pts,
      reb,
      ast,
      stl,
      blk,
      starter: u.r.starter,
    }
  })

  const score = box.reduce((s, b) => s + b.pts, 0)
  return { score, box }
}

// Roll possible injuries for a team's rotation over a full game.
// Returns array of { teamId, playerId, name, weeks }. Kept intentionally rare.
function rollInjuries(rng, rotation, teamId, tactics) {
  const out = []
  const aggr = (tactics?.aggression ?? 50) / 100
  for (const r of rotation) {
    const p = r.player
    const durability = (p.attrs.athleticism + p.attrs.stamina) / 2
    // Base ~1.5% per rotation player, up with minutes, down with durability.
    const chance =
      0.012 * (r.minutes / 24) * (1 + aggr * 0.4) * (1 + (70 - durability) / 120)
    if (rng() < Math.max(0.002, chance)) {
      const weeks = 1 + Math.floor(rng() * 5) // 1-5 weeks
      out.push({ teamId, playerId: p.id, name: p.name, weeks })
    }
  }
  return out
}

// Internal core used by both full-game and per-half simulation.
function runGame(homeTeam, awayTeam, opts, factor, segKey, withInjuries) {
  const {
    homeLineup,
    awayLineup,
    homeTactics = DEFAULT_TACTICS,
    awayTactics = DEFAULT_TACTICS,
    seedKey = '',
  } = opts

  const rng = makeRng(hashSeed(homeTeam.id, awayTeam.id, seedKey, segKey))

  const homeRot = buildRotation(homeTeam, homeLineup)
  const awayRot = buildRotation(awayTeam, awayLineup)

  const homeDef =
    homeRot.reduce((s, r) => s + defensiveRating(r.player, homeTactics) * (r.minutes / 200), 0)
  const awayDef =
    awayRot.reduce((s, r) => s + defensiveRating(r.player, awayTactics) * (r.minutes / 200), 0)

  const home = simTeamOffense(rng, homeRot, awayDef, homeTactics, 0.03, factor)
  const away = simTeamOffense(rng, awayRot, homeDef, awayTactics, -0.01, factor)

  const injuries = withInjuries
    ? [
        ...rollInjuries(rng, homeRot, homeTeam.id, homeTactics),
        ...rollInjuries(rng, awayRot, awayTeam.id, awayTactics),
      ]
    : []

  return {
    homeId: homeTeam.id,
    awayId: awayTeam.id,
    homeScore: home.score,
    awayScore: away.score,
    homeBox: home.box,
    awayBox: away.box,
    injuries,
  }
}

function breakTie(res, rng) {
  if (res.homeScore === res.awayScore) {
    if (rng() < 0.52) res.homeScore += 2 + Math.round(rng() * 3)
    else res.awayScore += 2 + Math.round(rng() * 3)
  }
  res.winner = res.homeScore > res.awayScore ? res.homeId : res.awayId
  res.homeBox = res.homeBox.sort((a, b) => b.pts - a.pts)
  res.awayBox = res.awayBox.sort((a, b) => b.pts - a.pts)
  return res
}

// Main entry: simulate a full game between two team objects.
export function simulateGame(homeTeam, awayTeam, opts = {}) {
  const res = runGame(homeTeam, awayTeam, opts, 1, 'full', opts.injuries !== false)
  const rng = makeRng(hashSeed(homeTeam.id, awayTeam.id, opts.seedKey || '', 'tie'))
  return breakTie(res, rng)
}

// Simulate a single half (half = 1 or 2). Injuries only rolled in the 2nd half.
// Returns a raw (untied) segment result — combine both halves with combineHalves.
export function simulateHalf(homeTeam, awayTeam, opts, half) {
  return runGame(homeTeam, awayTeam, opts, 0.5, 'h' + half, half === 2)
}

// Merge two half results into one final game result.
export function combineHalves(h1, h2, homeTeam, awayTeam, seedKey = '') {
  const mergeBox = (a, b) => {
    const map = new Map()
    for (const line of [...a, ...b]) {
      const cur = map.get(line.id) || { ...line, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }
      cur.min += line.min
      cur.pts += line.pts
      cur.reb += line.reb
      cur.ast += line.ast
      cur.stl += line.stl
      cur.blk += line.blk
      cur.starter = line.starter
      map.set(line.id, cur)
    }
    return [...map.values()]
  }
  const res = {
    homeId: homeTeam.id,
    awayId: awayTeam.id,
    homeScore: h1.homeScore + h2.homeScore,
    awayScore: h1.awayScore + h2.awayScore,
    homeBox: mergeBox(h1.homeBox, h2.homeBox),
    awayBox: mergeBox(h1.awayBox, h2.awayBox),
    injuries: [...(h1.injuries || []), ...(h2.injuries || [])],
  }
  const rng = makeRng(hashSeed(homeTeam.id, awayTeam.id, seedKey, 'tie'))
  return breakTie(res, rng)
}
