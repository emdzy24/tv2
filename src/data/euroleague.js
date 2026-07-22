// EuroLeague mock data.
//
// Team names, cities and colors are real. Player ratings/attributes are
// ILLUSTRATIVE and generated deterministically — they are NOT official stats.
// A handful of well-known players are seeded per club for flavor; the rest of
// each roster is procedurally generated with realistic European names.
//
// This whole module is mock data for the prototype. It will later be replaced
// by a real data layer (Supabase). Everything here is deterministic so the same
// league is produced on every load.

// --- deterministic RNG (mulberry32) --------------------------------------
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

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']

// Detailed attribute keys used by the sim engine and UI.
export const ATTRS = [
  'insideScoring',
  'outsideScoring',
  'playmaking',
  'rebounding',
  'perimeterDefense',
  'interiorDefense',
  'athleticism',
  'basketballIQ',
  'stamina',
]

// Name pools for procedurally generated role players.
const FIRST_NAMES = [
  'Luka', 'Nikola', 'Vasilije', 'Kostas', 'Giannis', 'Sergio', 'Alberto',
  'Tomas', 'Mateusz', 'Rokas', 'Edy', 'Marius', 'Dovydas', 'Jonas', 'Sasha',
  'Ognjen', 'Filip', 'Marko', 'Dimitris', 'Georgios', 'Nando', 'Facundo',
  'Gabriel', 'Adam', 'Petr', 'Jan', 'Vincent', 'Amath', 'Elie', 'Yves',
  'Deni', 'Guerschon', 'Willy', 'Juan', 'Alec', 'Shane', 'Chris', 'Kevin',
]
const LAST_NAMES = [
  'Nedovic', 'Micic', 'Spanoulis', 'Sloukas', 'Calathes', 'Rubio', 'Abrines',
  'Hezonja', 'Musa', 'Nunn', 'Lessort', 'Motiejunas', 'Vesely', 'Hilliard',
  'Walkup', 'Grigonis', 'Papapetrou', 'Kalinic', 'Guduric', 'Dobric', 'Lundberg',
  'Wanamaker', 'Mitrovic', 'Petrusev', 'Jovic', 'Nunnally', 'Baldwin', 'Howard',
  'Cordinier', 'Diallo', 'Fall', 'Okobo', 'Strazel', 'Brown', 'Thompson', 'James',
]

// Seeded star players per team for realism (name + primary position + tier 90-100
// overall base). Everyone else is generated. These are approximate flavor picks.
const STARS = {
  RMB: [['Facundo Campazzo', 'PG', 90], ['Mario Hezonja', 'SF', 88], ['Walter Tavares', 'C', 89]],
  BAR: [['Nikola Kalinic', 'SF', 85], ['Jan Vesely', 'C', 86], ['Tomas Satoransky', 'PG', 85]],
  PAN: [['Kostas Sloukas', 'PG', 88], ['Kendrick Nunn', 'SG', 90], ['Mathias Lessort', 'C', 88]],
  OLY: [['Sasha Vezenkov', 'PF', 90], ['Kostas Papanikolaou', 'SF', 84], ['Moustapha Fall', 'C', 85]],
  FEN: [['Scottie Wilbekin', 'PG', 86], ['Nigel Hayes-Davis', 'PF', 87], ['Marko Guduric', 'SG', 85]],
  EFE: [['Shane Larkin', 'PG', 89], ['Elijah Bryant', 'SG', 84], ['Vincent Poirier', 'C', 84]],
  MON: [['Mike James', 'PG', 91], ['Elie Okobo', 'SG', 86], ['Donatas Motiejunas', 'C', 85]],
  ASV: [['Nando De Colo', 'SG', 86], ['Theo Maledon', 'PG', 84], ['Youssoupha Fall', 'C', 82]],
  BAS: [['Markus Howard', 'SG', 88], ['Chima Moneke', 'PF', 84], ['Tadas Sedekerskis', 'SF', 82]],
  CZV: [['Nikola Kalinic', 'SF', 84], ['Nemanja Nedovic', 'SG', 85], ['Filip Petrusev', 'C', 86]],
  PAR: [['Zach LeDay', 'PF', 85], ['Kevin Punter', 'SG', 87], ['Sterling Brown', 'SF', 83]],
  MTA: [['Lorenzo Brown', 'PG', 86], ['Wade Baldwin', 'PG', 85], ['Roman Sorkin', 'C', 80]],
  VIR: [['Marco Belinelli', 'SG', 83], ['Isaia Cordinier', 'SG', 85], ['Toko Shengelia', 'PF', 87]],
  MIL: [['Nikola Mirotic', 'PF', 89], ['Shavon Shields', 'SF', 85], ['Zach LeDay', 'PF', 84]],
  ZAL: [['Sylvain Francisco', 'PG', 84], ['Ignas Brazdeikis', 'SF', 84], ['Achille Polonara', 'PF', 82]],
  BAY: [['Carsen Edwards', 'SG', 85], ['Nick Weiler-Babb', 'SG', 82], ['Devin Booker', 'C', 82]],
  PBB: [['TJ Shorts', 'PG', 86], ['Nadir Hifi', 'SG', 84], ['Maodo Lo', 'PG', 82]],
  ALB: [['Matteo Spagnolo', 'PG', 80], ['Louis Olinde', 'SF', 78], ['Johannes Thiemann', 'C', 79]],
  BER: [['Justus Hollatz', 'PG', 78], ['Malte Delow', 'SG', 76], ['Christ Koumadje', 'C', 78]],
}

// The 18 clubs. `id` is a stable short code used as seed + key.
const TEAMS = [
  { id: 'RMB', name: 'Real Madrid', city: 'Madrid', country: 'Spain', colors: ['#ffffff', '#feb31e'] },
  { id: 'BAR', name: 'FC Barcelona', city: 'Barcelona', country: 'Spain', colors: ['#a50044', '#004d98'] },
  { id: 'PAN', name: 'Panathinaikos', city: 'Athens', country: 'Greece', colors: ['#0a5c36', '#ffffff'] },
  { id: 'OLY', name: 'Olympiacos', city: 'Piraeus', country: 'Greece', colors: ['#e30613', '#ffffff'] },
  { id: 'FEN', name: 'Fenerbahce Beko', city: 'Istanbul', country: 'Turkey', colors: ['#ffed00', '#003a70'] },
  { id: 'EFE', name: 'Anadolu Efes', city: 'Istanbul', country: 'Turkey', colors: ['#003b7a', '#e30613'] },
  { id: 'MON', name: 'AS Monaco', city: 'Monaco', country: 'Monaco', colors: ['#e2001a', '#ffffff'] },
  { id: 'ASV', name: 'LDLC ASVEL', city: 'Villeurbanne', country: 'France', colors: ['#1a1a1a', '#00a94f'] },
  { id: 'BAS', name: 'Baskonia', city: 'Vitoria-Gasteiz', country: 'Spain', colors: ['#003399', '#ffffff'] },
  { id: 'CZV', name: 'Crvena Zvezda', city: 'Belgrade', country: 'Serbia', colors: ['#e30613', '#ffffff'] },
  { id: 'PAR', name: 'Partizan', city: 'Belgrade', country: 'Serbia', colors: ['#1a1a1a', '#ffffff'] },
  { id: 'MTA', name: 'Maccabi Tel Aviv', city: 'Tel Aviv', country: 'Israel', colors: ['#ffd700', '#003a70'] },
  { id: 'VIR', name: 'Virtus Bologna', city: 'Bologna', country: 'Italy', colors: ['#1a1a1a', '#ffffff'] },
  { id: 'MIL', name: 'EA7 Milano', city: 'Milan', country: 'Italy', colors: ['#e30613', '#ffffff'] },
  { id: 'ZAL', name: 'Zalgiris', city: 'Kaunas', country: 'Lithuania', colors: ['#0a5c36', '#ffffff'] },
  { id: 'BAY', name: 'FC Bayern', city: 'Munich', country: 'Germany', colors: ['#dc052d', '#ffffff'] },
  { id: 'PBB', name: 'Paris Basketball', city: 'Paris', country: 'France', colors: ['#1a1a1a', '#e30613'] },
  { id: 'ALB', name: 'ALBA Berlin', city: 'Berlin', country: 'Germany', colors: ['#ffe600', '#004a99'] },
]

function seedFromString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Build a full player object from a base overall + role, using the RNG for spread.
function buildPlayer(rng, { id, name, pos, base, age, isStar }) {
  const jitter = (spread) => Math.round((rng() - 0.5) * 2 * spread)
  const clamp = (v) => Math.max(40, Math.min(99, v))

  // Position shapes the attribute profile.
  const bigMan = pos === 'C' || pos === 'PF'
  const guard = pos === 'PG' || pos === 'SG'

  const attrs = {
    insideScoring: clamp(base + (bigMan ? 6 : -4) + jitter(6)),
    outsideScoring: clamp(base + (guard ? 6 : -6) + jitter(7)),
    playmaking: clamp(base + (pos === 'PG' ? 10 : guard ? 2 : -8) + jitter(6)),
    rebounding: clamp(base + (bigMan ? 10 : -6) + jitter(6)),
    perimeterDefense: clamp(base + (guard ? 4 : -2) + jitter(7)),
    interiorDefense: clamp(base + (bigMan ? 8 : -6) + jitter(6)),
    athleticism: clamp(base + jitter(8)),
    basketballIQ: clamp(base + (isStar ? 4 : 0) + jitter(6)),
    stamina: clamp(base + jitter(5)),
  }

  const overall = Math.round(
    (attrs.insideScoring +
      attrs.outsideScoring +
      attrs.playmaking +
      attrs.rebounding +
      attrs.perimeterDefense +
      attrs.interiorDefense +
      attrs.athleticism +
      attrs.basketballIQ) /
      8,
  )

  // Potential: younger players can grow; older players are near their ceiling.
  const growth = Math.max(0, Math.round((27 - age) * 0.8) + jitter(3))
  const potential = clamp(overall + (age < 24 ? growth : 0))

  return {
    id,
    name,
    pos,
    age,
    overall,
    potential,
    attrs,
    // Live state used during a season.
    morale: 60 + Math.round(rng() * 30), // 60-90
    form: 0, // -5..+5 recent form
    injuredWeeks: 0,
    // Contract (illustrative €M/season) — used by finances later.
    salary: +(0.2 + Math.max(0, overall - 60) * 0.12 + rng() * 0.4).toFixed(1),
    contractYears: 1 + Math.floor(rng() * 4),
  }
}

let pidCounter = 1000
function nextPid() {
  return `p${pidCounter++}`
}

function generateRoster(team) {
  const rng = makeRng(seedFromString(team.id))
  const players = []
  const usedNames = new Set()

  // Seed real stars first.
  const stars = STARS[team.id] || []
  for (const [name, pos, base] of stars) {
    usedNames.add(name)
    players.push(
      buildPlayer(rng, {
        id: nextPid(),
        name,
        pos,
        base,
        age: 24 + Math.floor(rng() * 10),
        isStar: true,
      }),
    )
  }

  // Fill to 12 players, roughly balancing positions.
  const targetByPos = { PG: 2, SG: 3, SF: 2, PF: 2, C: 2 }
  const countByPos = () =>
    players.reduce((m, p) => ((m[p.pos] = (m[p.pos] || 0) + 1), m), {})

  while (players.length < 12) {
    const counts = countByPos()
    // Pick the most-needed position.
    let pos = POSITIONS[0]
    let deficit = -Infinity
    for (const p of POSITIONS) {
      const d = (targetByPos[p] || 0) - (counts[p] || 0)
      if (d > deficit) {
        deficit = d
        pos = p
      }
    }

    // Generate a unique name.
    let name
    let guard = 0
    do {
      const fn = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]
      const ln = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]
      name = `${fn} ${ln}`
    } while (usedNames.has(name) && guard++ < 50)
    usedNames.add(name)

    const base = 62 + Math.floor(rng() * 18) // role players 62-80
    players.push(
      buildPlayer(rng, {
        id: nextPid(),
        name,
        pos,
        base,
        age: 19 + Math.floor(rng() * 16),
        isStar: false,
      }),
    )
  }

  // Sort by overall descending for a sensible default depth chart.
  players.sort((a, b) => b.overall - a.overall)
  return players
}

// Build the full league: teams with generated rosters. Deterministic.
export function buildLeague() {
  pidCounter = 1000
  return TEAMS.map((t) => {
    const players = generateRoster(t)
    const teamOverall = Math.round(
      players.slice(0, 8).reduce((s, p) => s + p.overall, 0) / 8,
    )
    return {
      ...t,
      players,
      overall: teamOverall,
      budget: +(8 + teamOverall * 0.4).toFixed(1), // illustrative €M
    }
  })
}

// Recompute a player's overall from current attributes (after development).
export function recomputeOverall(p) {
  const a = p.attrs
  return Math.round(
    (a.insideScoring +
      a.outsideScoring +
      a.playmaking +
      a.rebounding +
      a.perimeterDefense +
      a.interiorDefense +
      a.athleticism +
      a.basketballIQ) /
      8,
  )
}

// Team overall = average of the top-8 players by overall.
export function computeTeamOverall(players) {
  const top = [...players].sort((a, b) => b.overall - a.overall).slice(0, 8)
  return Math.round(top.reduce((s, p) => s + p.overall, 0) / Math.max(1, top.length))
}

// Create a single player deterministically from a seed string. Used by the
// offseason (free agents / prospects) and free agency.
export function makePlayer(seedStr, { id, name, pos, base, age, isStar = false }) {
  const rng = makeRng(seedFromString(seedStr))
  if (!name) {
    const fn = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]
    const ln = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]
    name = `${fn} ${ln}`
  }
  return buildPlayer(rng, { id, name, pos, base, age, isStar })
}

export { POSITIONS }

export function teamPrimaryColor(team) {
  return team.colors[0]
}
export function teamSecondaryColor(team) {
  return team.colors[1]
}

export { TEAMS }
