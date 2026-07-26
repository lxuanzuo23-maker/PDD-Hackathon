# TinyWins

An emotionally supportive accountability app. An AI coach adapts to how you
like to be spoken to, helps you start, interviews you to verify you actually
finished, and pays you in points you spend on a companion that visibly levels
up.

**Target user:** people who know what they need to do but can't start.

**Why not another to-do list:** a to-do list trusts a tap. TinyWins helps you
take the first two-minute step, then asks what you actually did and how it
felt before it pays out — and charges you points for days you skip.

## The loop

```
Onboarding quiz  →  set a goal  →  "I'm stuck"  →  coach's 2-minute step
      ↓                                                     ↓
   traits profile ──── adapts the coach's tone ────────→  Start timer
                                                            ↓
  Growth dashboard  ←  points / streak  ←  3-question honest check-in
      ↓
  Rewards: spend points, companion wears what you bought
```

## Screens

| Route | What it does |
|---|---|
| `/onboarding` | 6-step quiz: age, gender, habit to improve, new habit, optional vision board upload, today's mood |
| `/today` | Active goals with today's status, streak, balance; missed-day penalties surface here |
| `/coach` | Chat → empathetic reply + one 2-minute micro-step → timer → check-in |
| `/rewards` | Shelf of 9 collectibles; redeeming dresses the companion and fills a sticker collection |
| `/growth` | Per-goal points chart and day-by-day done/skipped history |
| `/profile` | Stats, the coach's current tone/motivation, vision board themes, recent moods |

## Architecture

- **Next.js 14** (App Router) + TypeScript, single repo, single deployed web service
- **SQLite via Prisma** — the system of record (ephemeral on Render, see `DISCLOSURES.md`)
- **All LLM traffic through `src/lib/llm.ts`** — provider is a one-line env change
  (`LLM_PROVIDER=minimax | tokenrouter | openai | anthropic`), and it supports
  image input for vision board analysis
- **Pure logic modules, no I/O, all unit-tested:** `points.ts` (economy),
  `goals.ts` (UTC period math), `growth.ts` (dashboard), `look.ts` (companion
  appearance), `traits.ts` (adaptive profile), `export.ts` (Nexla projection)
- **Band worker** — a separate Python service hosting persistent Goal Room agents
- Tailwind, mobile-first

### Design decisions worth knowing

- **Points are an append-only ledger.** The balance is always derived by summing
  it, never stored — that's what makes the daily anti-gaming cap auditable.
- **Missed-day penalties are lazy.** There is no background job; opening
  `/today` is what charges them, and the anchor date advances by exactly the
  periods charged so a refresh can't double-bill.
- **The companion's look is derived, never stored.** It's computed from
  redemptions, so the avatar can't drift from what the user actually paid for.
- **Check-in idempotency is per-period, not permanent** — one check-in per goal
  per UTC day, checked before the LLM call so a double-tap can't burn credits.

## API

```
GET    /api/health
GET    /api/onboarding/status               → { completed }
POST   /api/onboarding                      multipart FormData → { imageUrl?, analysisStatus }
GET    /api/goals                           → { active, ended }
POST   /api/goals                           { title, endDate, cadence } → GoalToday
GET    /api/goals/today                     → GoalsTodayResponse  (lazy penalty check runs here)
POST   /api/goals/:id/check-in              { answers: [what, hardest, mood] } → CheckInResponse
POST   /api/coach/chat                      { message, goalId?, sessionId } → CoachChatResponse
POST   /api/coach/feedback                  { approach } → { ok }
GET    /api/rewards                         → { items, companion, pointsBalance, owned, look }
POST   /api/rewards/:id/redeem              → { ok, newBalance, companion, owned, look, leveledUp }
GET    /api/growth?goalId=                  → GrowthResponse (per goal)
GET    /api/profile                         → ProfileResponse
GET    /api/export?dataset=&format=         → Nexla projection (token-gated)
POST   /api/tts                             { text } → audio/mpeg | 503
POST   /api/internal/band/coach-event       signed Band callback
POST   /api/internal/band/reflections       signed Band callback
```

Types live in [`src/lib/contract.ts`](src/lib/contract.ts) and are the single
source of truth shared by every route and screen.

## Setup

```bash
npm install
cp .env.example .env      # see "Environment" below
npx prisma migrate dev
npm run seed
npm run dev
```

The seed creates one demo user (no auth — see `DISCLOSURES.md`) with three
goals, 40 points, a level-2 companion, and a 9-item reward shelf. It
deliberately does **not** create a traits profile, so `/onboarding` is
reachable; use `SEED_ONBOARDED=1 npm run seed` to test the returning-user path
that skips the quiz.

## Run & test

```bash
npm test                  # vitest — 100+ cases across every pure module
npx tsc --noEmit          # typecheck
npm run seed              # re-seed demo data (also runs on Render boot)
npm run export:nexla      # write CSV projections for Nexla ingestion
npm run verify:minimax    # probe the MiniMax credentials
```

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file path |
| `LLM_PROVIDER` | `minimax` \| `tokenrouter` \| `openai` \| `anthropic` |
| `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID` | MiniMax credentials |
| `TOKENROUTER_API_KEY` / `TOKENROUTER_MODEL` | TokenRouter (OpenAI-compatible) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Fallback providers |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | Voice pep talk (optional) |
| `BAND_COACH_AGENT_ID` / `BAND_COACH_API_KEY` | Band coach agent |
| `BAND_REFLECTION_AGENT_ID` / `BAND_REFLECTION_API_KEY` | Band reflection agent |
| `INTERNAL_WEBHOOK_SECRET` | HMAC secret for Band → web callbacks |
| `TINY_WINS_WEB_URL` | Web service URL the Band worker calls back to |
| `NEXLA_EXPORT_TOKEN` | Bearer token for `/api/export`; unset ⇒ endpoint returns 503 |

Every integration degrades to a **labeled** offline state rather than a silent
fake — the core loop works with all of them dark.

## Integrations

### Band — persistent Goal Room agents
`services/band-worker/` is a Python service hosting two Band agents (a coach
and a reflection agent) that live in a per-goal "Goal Room". TinyWins appends
domain events (`goal.created`, `checkin.completed`, `penalty.applied`,
`goal.ended`, …) to a `GoalRoomEvent` log via `src/lib/goal-room.ts`; the
agents post back through signed internal webhooks
(`/api/internal/band/*`, HMAC-verified in `src/lib/band-security.ts`).
The web service stays the source of truth — the agents never write Prisma
directly.

### ElevenLabs — voice pep talk
`src/lib/tts.ts` is the only place TinyWins talks to ElevenLabs, exposed
through `POST /api/tts`. The coach's 2-minute-start card prefetches audio and
plays it on the Start-timer tap (a user gesture, which browsers require).
Repeated pep talks are served from an in-memory cache to conserve credits.
Without a key the card shows a labeled "voice offline" state and the demo arc
is unchanged.

### TokenRouter / MiniMax — model routing
Both are selectable providers behind `src/lib/llm.ts`. TokenRouter is used via
its OpenAI-compatible Chat Completions endpoint; MiniMax has its own client
path. Switching is a single env var, and `chatJSON` retries once with a
stricter instruction when a reply isn't valid JSON.

### Nexla — governed data product
TinyWins exposes a **read-only projection** of check-in and points history for
Nexla to ingest, as CSV (`npm run export:nexla`) or a token-gated
`GET /api/export`. **Nexla is not the app's database** — Prisma remains the
system of record; Nexla turns the projection into a Nexset (and optionally an
MCP server) so an agent can ask how a user is trending without direct database
access. Setup steps and honest limits are in [`NEXLA.md`](NEXLA.md).

## Prompt-Driven Development

Prompts in [`prompts/`](prompts) are the source of truth; the code is
generated output. Naming and the three team rules are in
[`prompts/CONVENTION.md`](prompts/CONVENTION.md); the full prompt → module →
usage → test chain, every hand-edit, and the documented iterations are logged
in [`PDD_EVIDENCE.md`](PDD_EVIDENCE.md).

```bash
uv tool install pdd-cli
pdd setup                                          # configure a pdd LLM provider
pdd --local sync <basename>                        # generate → example → test → fix
pdd --local generate prompts/points_typescript.prompt
pdd --local update prompts/<basename>_typescript.prompt <code_file>   # after any hand-edit
```

When code needs to change, edit the prompt and regenerate — don't hand-patch
generated files without updating the prompt (the rubric deducts for this, and
`PDD_EVIDENCE.md` logs the exceptions).

## What we built today

The P0 spec is in [`DESIGN.md`](DESIGN.md). Beyond it, the build grew: a
traits-driven adaptive coach, open-ended recurring goals with skip penalties,
a per-goal growth dashboard, a profile screen, visible avatar upgrades, and
the four integrations above. `PDD_EVIDENCE.md` records what changed and why,
including the mid-build contract reconciliation between the API and the UI.

## Known limitations

See [`DISCLOSURES.md`](DISCLOSURES.md) — no real auth, a single demo user,
SQLite resets on redeploy, the verifier judges plausibility rather than proving
truth, and sponsor tracks are only claimed where they demonstrably work.
