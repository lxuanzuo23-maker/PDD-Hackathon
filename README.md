# TinyWins

An emotionally supportive accountability app: an AI coach shrinks any task to a 2-minute
first step, interviews you when you claim it's done, and pays points by effort, not by tap.
Points level up your companion.

Built at the PDD Hackathon, prompt-first. Prompts in `/prompts` are the source of truth;
code is generated output.

## Problem

<!-- TODO before submission: 2 sentences. People who know what to do but can't start. -->

## Target user

<!-- TODO: specific, not "everyone". -->

## Setup

```bash
npm install
cp .env.example .env   # add MINIMAX_API_KEY
npm run dev            # http://localhost:3000
```

## Run & test commands

```bash
npm run dev              # local dev server
npm test                 # unit tests
npm run build && npm start
npm run verify:minimax   # confirms the LLM key works
```

## Architecture

Next.js 15 (App Router) on Render, single service. API routes under `src/app/api/*`,
contract frozen in `src/lib/contract.ts`. LLM calls (coach + verifier) go through
`src/lib/llm.ts` to MiniMax. See `prompts/CONVENTION.md` for the PDD module map.

<!-- TODO: update if the shape changes. -->

## PDD evidence

See `PDD_EVIDENCE.md` for the prompt -> module -> usage -> test chains and the iteration log.

## What we built today

Everything. The repo was empty at build start; the scaffold (this commit) was generated
at the venue at build start, with AI assistance, and is disclosed in `DISCLOSURES.md`.

<!-- TODO before submission: 3 bullets on what shipped. -->

## Known limitations

See `DISCLOSURES.md`. Honest list, per the rules: unfinished is eligible, faking is not.

## Attribution

Next.js, Tailwind, Vitest, Prisma (licenses in node_modules). AI assistance: Claude
(scaffold + module generation via pdd CLI), MiniMax (runtime coach/verifier LLM).
