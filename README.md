# TinyWins

An emotionally supportive accountability app: an AI coach helps you start,
verifies you finished, and pays you in points you spend on your companion.

**Target user:** people who know what they need to do but can't start.

## Architecture
- Next.js 14 (App Router) + TypeScript, single repo, single deployed service
- SQLite via Prisma (ephemeral on Render — see DISCLOSURES.md)
- LLM: MiniMax for coach + verifier, routed through `src/lib/llm.ts` so
  swapping providers is a one-line env var change
- Tailwind, mobile-first

## Setup
```bash
npm install
cp .env.example .env   # fill in MINIMAX_API_KEY / MINIMAX_GROUP_ID or a fallback key
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## Run & test
```bash
npm test          # vitest — points, verifier, coach, llm
npm run seed       # re-seed demo data (also runs on Render boot)
```

## Prompt-Driven Development (PDD CLI)
Prompts in `/prompts` are the source of truth; code is generated output.

```bash
uv tool install pdd-cli
pdd setup                 # detects agentic CLIs, configures API keys/models
pdd generate --output src/lib/verifier.ts prompts/verifier_TypeScript.prompt
pdd generate --output src/lib/coach.ts     prompts/coach-persona_TypeScript.prompt
pdd generate --output src/lib/points.ts    prompts/points-engine_TypeScript.prompt
pdd generate --output src/lib/llm.ts       prompts/llm-wrapper_TypeScript.prompt
```

When code needs to change, edit the prompt and regenerate — don't hand-patch
generated files without updating the prompt (the rubric deducts for this).

## What we built today
See the concrete P0 feature spec in [`DESIGN.md`](DESIGN.md). Build only that
demo arc: Today → Coach 2-minute start → micro-interview → win result →
Rewards companion redeem. Anything not listed under P0 Features is cut.

## Known limitations
See `DISCLOSURES.md`.
