# Basketball Manager

A EuroLeague basketball **management simulation game** for the web. Play as both
head coach and general manager of a real EuroLeague club — build your roster, set
deep tactics, sim games, and compete across multiple seasons against AI and other
managers.

> 🚧 Early development — **Milestones 1 & 2 are playable** (mock data, no
> backend yet): full multi-season career with playoffs, awards, development,
> injuries, finances and transactions. See **[GUIDELINES.md](./GUIDELINES.md)**
> for the full vision, feature set, tech direction, and build roadmap.

## Getting started

```bash
npm install
npm run dev      # start the dev server (Vite) — open the printed localhost URL
npm run build    # production build into dist/
npm run preview  # serve the production build
```

No accounts or servers required yet: the prototype uses **mock EuroLeague data**
and saves your career in the browser (localStorage). A real backend (Supabase
auth + database + multiplayer) replaces this in a later milestone.

## What works today

**Milestone 1 — core loop**
- **Mock login** (enter a manager name — no password yet).
- **Pick a club** from all 18 real EuroLeague teams (real rosters seeded with
  known stars + generated depth; ratings are illustrative).
- **Roster & lineup** — browse detailed player attributes, set your starting five.
- **Matchday** — set tactics (pace, aggression, offensive/defensive focus) and
  sim your game with a stat-based engine + full box score; the rest of the round
  simulates around you.
- **Standings** — live table, top-8 playoff line, point-differential tiebreak.
- **Stats** — per-game season averages for your squad.

**Milestone 2 — depth & career**
- **In-game adjustments** — play a match in two halves and change tactics at
  halftime (or Quick-sim to skip).
- **Injuries** — players can get hurt mid-game and miss weeks; they recover over time.
- **Playoffs** — top-8 bracket: best-of-5 quarterfinals then a single-game Final
  Four, with a champion crowned. You play your own playoff games.
- **Awards** — season MVP, scoring champion, and All-EuroLeague First Team.
- **Offseason & multi-season career** — players age, develop toward their
  potential or decline, veterans retire, rosters refill, and a fresh season
  begins with a new schedule.
- **Finances** — per-team budget, payroll, and a soft salary cap.
- **Transactions** — sign/waive free agents and propose trades (AI accepts or
  rejects based on value).

Progress **auto-saves** to your browser; restart anytime.

## At a glance

- **Genre:** Realistic management sim (coach + GM)
- **League:** EuroLeague — 18 real teams, real players
- **Sim:** Stat-based match engine with deep, adjustable tactics
- **Modes:** Multi-season career; multiplayer leagues (planned)
- **Accounts:** Required login with cloud saves
- **Platform:** Web
- **Stack (planned):** React + Supabase (Postgres, auth, realtime)

## Roadmap (short version)

1. **Playable prototype** — login → pick team → set lineup/tactics → sim a game → standings.
2. **Depth** — development, injuries, finances, trades, full season + playoffs + awards.
3. **Multiplayer** — shared & private leagues, head-to-head, async matches.

See [GUIDELINES.md](./GUIDELINES.md) for details.
