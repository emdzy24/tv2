// Round-robin schedule generation (double round-robin: home & away).
// Uses the "circle method" so every team plays every other team twice.

export function generateSchedule(teamIds) {
  const ids = [...teamIds]
  if (ids.length % 2 !== 0) ids.push(null) // bye placeholder
  const n = ids.length
  const rounds = n - 1
  const half = n / 2

  const firstLeg = []
  const arr = [...ids]

  for (let r = 0; r < rounds; r++) {
    const round = []
    for (let i = 0; i < half; i++) {
      const home = arr[i]
      const away = arr[n - 1 - i]
      if (home !== null && away !== null) {
        // Alternate home/away by round for fairness.
        if (r % 2 === 0) round.push({ home, away })
        else round.push({ home: away, away: home })
      }
    }
    firstLeg.push(round)
    // Rotate all but the first element.
    arr.splice(1, 0, arr.pop())
  }

  // Second leg: reverse home/away.
  const secondLeg = firstLeg.map((round) =>
    round.map((g) => ({ home: g.away, away: g.home })),
  )

  const allRounds = [...firstLeg, ...secondLeg]

  // Flatten into fixtures with round numbers.
  const fixtures = []
  allRounds.forEach((round, ri) => {
    round.forEach((g) => {
      fixtures.push({
        round: ri + 1,
        home: g.home,
        away: g.away,
        played: false,
        homeScore: null,
        awayScore: null,
      })
    })
  })

  return { rounds: allRounds.length, fixtures }
}

// Standings computed from played fixtures.
export function computeStandings(teams, fixtures) {
  const table = new Map(
    teams.map((t) => [
      t.id,
      { id: t.id, name: t.name, w: 0, l: 0, pf: 0, pa: 0, played: 0 },
    ]),
  )

  for (const f of fixtures) {
    if (!f.played) continue
    const h = table.get(f.home)
    const a = table.get(f.away)
    if (!h || !a) continue
    h.pf += f.homeScore
    h.pa += f.awayScore
    a.pf += f.awayScore
    a.pa += f.homeScore
    h.played++
    a.played++
    if (f.homeScore > f.awayScore) {
      h.w++
      a.l++
    } else {
      a.w++
      h.l++
    }
  }

  return [...table.values()].sort((x, y) => {
    if (y.w !== x.w) return y.w - x.w
    return y.pf - y.pa - (x.pf - x.pa)
  })
}
