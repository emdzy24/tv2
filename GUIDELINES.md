# Team Quiz — Project Guidelines

A local, single-screen **team quiz game** with a Jeopardy-style board. Teams take
turns picking a category and a difficulty, answer against a timer, and rival
teams can steal missed questions for half the points. Questions are generated
on the spot by an AI agent in the selected language.

This document is the source of truth for what we're building. Decisions marked
**[OPEN]** are not settled yet.

---

## 1. Format

- **Play style:** One shared screen (laptop / TV / projector). No player phones,
  no lobby codes, no network play in v1.
- **Teams:** 2–5, named in setup.
- **Board:** All selected categories are shown as columns. Each category has
  exactly three questions: **2**, **4**, and **6** points (2 = easiest,
  6 = hardest). A cell is consumed once played.
- **Turn:** Rotating. The active team picks any unplayed cell (category +
  difficulty).
- **Steal:** If the active team misses, the next team in turn order may steal.
  A successful steal scores **half** the cell's value (1 / 2 / 3 points).
- **Game end:** Chosen in setup. **[OPEN — which options]**

## 2. Setup screen

Configured before the game starts:

| Setting | Values |
|---|---|
| Language | English, Spanish, Lithuanian |
| Teams | 2–5, with names |
| Categories | Host picks, or randomize **[OPEN — from a preset catalogue, custom text, or both]** |
| Time per question | 60 / 120 / 180 seconds |
| Difficulty profile | Casual / Balanced / Hard (shifts how hard the generated questions are at each point value) |
| Speed bonus | On / Off (default On) |
| Game end | **[OPEN]** |

## 3. Question types

| Value | Type | Answering |
|---|---|---|
| **2 pts** | Multiple choice, 4 options | Pick an option |
| **4 pts** | Open text | Type the answer |
| **6 pts** | Open text | Type the answer |

- Open-text answers are typed on the shared screen by the active team.
- Grading of open text: **[OPEN — AI grader vs. host marks it]**

## 4. Scoring

- Correct on your own turn: **2 / 4 / 6** points.
- Correct on a steal: **1 / 2 / 3** points (half, rounded as shown).
- Wrong answer: **0** points. No penalty, no negative scores.
- No answer / timeout: **0** points.
- **Speed bonus (optional setting):** **+1** point if answered within the first
  15 seconds of the timer.
- No final wager round.
- Tie at the end: **[OPEN]**

## 5. Question generation

Questions are **generated live by an AI agent** at the moment a cell is picked —
there is no pre-written question bank. Each request is parameterized by:

- **language** (en / es / lt)
- **category** (the picked column)
- **difficulty** (2 / 4 / 6, shaped by the game's difficulty profile)
- **format** (multiple choice with 4 options for 2 pts; open text for 4 and 6)

Requirements this creates:

- **Model:** Claude `claude-opus-5` via the Anthropic API, using structured
  outputs so every question comes back in a fixed schema (question text,
  options, correct answer, accepted alternate answers).
- **No duplicates within a game** — previously used questions are excluded.
- **Prefetch:** generation takes seconds, so questions are fetched in the
  background while the board is on screen; a spinner between "pick" and
  "question" would kill the pace.
- **Key safety:** an API key cannot ship in browser code. This needs a small
  server-side proxy. **[OPEN — where it runs]**
- **Failure path:** what happens if generation fails or times out mid-game.
  **[OPEN]**

## 6. Persistence

**[OPEN]** — whether anything survives a refresh (scores, game in progress,
past results) or every game is ephemeral.

## 7. Tech direction (proposed, not locked)

- **Frontend:** React + TypeScript, single-page, keyboard-friendly (it's driven
  by one person at one keyboard).
- **Question service:** a thin serverless endpoint that holds the Anthropic API
  key and returns validated question JSON.
- **State:** in-memory game state; the whole game is one session.
- **i18n:** all UI strings in per-language files; question *content* comes from
  the generator in the chosen language.

## 8. Build sequence

1. **Setup screen + board** — configure a game, render the category/points grid,
   turn rotation, scoreboard.
2. **Question flow** — pick a cell, timer, answer, reveal, steal, scoring.
3. **AI generation** — live questions in all three languages, with prefetch.
4. **Polish** — sounds, animations, end-of-game screen.

---

## 9. Open questions

1. Who grades open-text answers — AI, or the host clicks correct/wrong?
2. Steal: only the next team, or every other team in order? How long do they get?
3. Game-end options to offer in settings.
4. How many categories on the board?
5. Does the steal also earn the speed bonus?
6. After a steal, who picks next?
7. Tie-breaker rule.
8. Category list: preset catalogue, free text, or both?
9. Where the AI proxy runs (and whose API key).
10. Behaviour when generation fails.
11. Does anything persist across a refresh?
