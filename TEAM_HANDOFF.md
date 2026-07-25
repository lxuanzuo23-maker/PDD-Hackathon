# TinyWins — Pivot Plan & Team Handoff

Working notes from the setup/planning session, for all three teammates.
Original hackathon spec is still `DESIGN.md` — this document captures the
scope pivot on top of it and what's been decided/built so far.

## Where things stand

- Repo cloned, `npm install` done, `.env` configured with `LLM_PROVIDER="tokenrouter"`
  (confirmed domain: `api.tokenrouter.com`), Prisma migrated + seeded, dev
  server runs.
- The original MVP (single seeded task, fixed 2-question check, flat points)
  is being expanded into the scope below.

## The pivot, in one paragraph

Instead of one flat demo task, the app reads user traits (onboarding quiz +
ongoing adaptation) to drive an agent with adaptive behavior, acting as an
accountability buddy across whatever open-ended goals the user sets
(lose weight, buy a car, build a project, start a startup — anything). Each
goal gets recurring check-ins; a completion question asks how the task
*felt* (on top of what was done) to help catch dishonest check-ins. Missed
days cost points, checked lazily the next time the user opens the app
(no background job). At the end of a goal's period, a growth dashboard
graphs points earned and completion history together.

## Locked architecture decisions

| Question | Decision |
|---|---|
| How does the agent learn user traits? | Onboarding quiz sets a starting profile; profile is refined over time from check-in behavior |
| How are long-term goals structured? | A `Goal` object (start/end date) with recurring check-ins — not auto-decomposed into sub-tasks |
| How does the skipped-day penalty trigger? | Lazy: checked/applied next time the user opens the app, not a scheduled job |
| What does the growth graph show? | Combined dashboard: points-over-time trend + completion/skip history |
| Vision board upload (onboarding) | Both stored/displayed **and** analyzed by the agent for themes |
| Daily mood question | Recurring check-in (not just onboarding) — onboarding covers day 1 only; the daily version is still unbuilt |

## Reward/points system — bugs found (pre-pivot, still need fixing)

The existing skeleton has real drift between `points.ts`, `contract.ts`,
and the actual API routes:

- `/api/tasks/[id]/complete` never returns `newBalance`, `streakDays`, or
  `companion`, and never increments the streak (no `lastStreakAt` field
  exists yet).
- `points.ts` uses base points `{1:10, 2:20, 3:35}` and a per-day streak
  bonus; `contract.ts` (the frozen source of truth) says `{1:10, 2:20, 3:40}`
  and a flat `+5` bonus once per day. They disagree.
- `contract.ts` has the wrong vocabulary vs. the actual database: mood
  should be `"content"|"proud"|"sleepy"|"worried"` (contract says
  `"happy"|"neutral"|"worried"`); reward kind should be
  `"theme"|"accessory"|"skip-token"` (contract says
  `"companion"|"theme"|"streak-shield"`).
- Rewards routes return the companion under the key `companionState`;
  contract requires `companion`.
- Seed data sets companion xp to 40; reaching level 3 needs xp 100, so a
  correct redeem still wouldn't show a level-up without fixing the seed too.

This is **Person A's** job (F5/F7 in `DESIGN.md`), independent of the pivot.

## Prompt files — status and ownership

| Prompt | Status | Owner | Notes |
|---|---|---|---|
| `points_typescript` | exists, needs fixing | A | fold in penalty logic + fix drift above |
| `llm_typescript` | exists, needs extending | C | must gain image-capable input (see Vision board below) |
| `coach_typescript` | exists, needs updating | C | adapt tone using `TraitsProfile`; add "check in if I'm being annoying" behavior (see Open questions) |
| `verifier_typescript` | exists, needs updating | C | add the "how did this feel" honesty question |
| `ui-today_typescript` | exists, needs updating | B | show active goals, not a flat task list |
| `tts_typescript` | exists | C | unchanged, P2/stretch only |
| `goals_api` (replaces `tasks_api`) | not written yet | A | CRUD + lazy penalty check on load |
| `rewards_api` | not written yet | A | mostly unchanged; just fix the field-name drift above |
| `ui_coach` | not written yet | B | |
| `ui_rewards` | not written yet | B | |
| `ui_growth` / `growth_api` | not written yet | B (ui) / A (api) | combined points + completion dashboard |
| **`ui_onboarding_typescript`** | ✅ written | B | 6-step wizard: age, gender, current habit, new habit, optional vision board upload, mood scale |
| **`traits_typescript`** | ✅ written | C | builds profile, analyzes vision board, stub for ongoing adaptation |
| **`onboarding_api_typescript`** | ✅ written | A | persists onboarding, upserts (no duplicate profiles on re-submit) |

The three written prompt files are in `prompts/` now — ready to run through
`pdd generate` / `pdd sync` per `prompts/CONVENTION.md`.

## Two things to resolve before generating the onboarding code

1. **`contract.ts` additions** — `Mood`, `OnboardingRequest`,
   `OnboardingResponse`, `OnboardingStatusResponse`, `TraitsProfile` types
   are drafted inside `onboarding_api_typescript.prompt`. Since `contract.ts`
   is the frozen team file, all three of you should glance at the draft
   together before adding them for real.
2. **`llm.ts` image support** — the vision board feature needs `llm.ts` to
   send images to the model, which it can't do today (text-only). Person C
   should build this before `traits.ts` can be generated from its prompt.

## Schema additions needed (Person A)

Two new Prisma models, plus relations on `User`:

```prisma
model UserTraits {
  id                  String   @id @default(cuid())
  userId              String   @unique
  age                 Int
  gender              String
  habitToImprove      String?
  newHabitGoal        String?
  visionBoardImageUrl String?
  visionBoardThemes   String?  // JSON-encoded string[]
  communicationStyle  String   @default("encouraging")
  motivationStyle     String   @default("support")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  user                User     @relation(fields: [userId], references: [id])
}

model MoodCheckIn {
  id        String   @id @default(cuid())
  userId    String
  mood      String   // "rough" | "low" | "okay" | "good" | "great"
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
}
```

## Open questions (not yet decided)

- **Coach "checking in if annoying"**: should the coach react silently
  first (dial back tone if answers get short/curt) and only explicitly ask
  "want me to change my approach?" if that keeps happening — or ask
  directly the first time it seems off? Needs an answer before
  `coach_typescript.prompt` is finalized.
- Goals view, Coach page, and Growth dashboard specs — not yet walked
  through; still to come.

## Next steps

Whoever's picking up a page next should describe how it looks/behaves
(same as the onboarding walkthrough above), and the corresponding prompt
file(s) get written from that. Suggested order: goals view (Today
replacement) → coach → growth dashboard → rewards touch-ups.
