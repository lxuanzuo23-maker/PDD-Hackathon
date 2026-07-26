# PDD Evidence

Traceability chain (prompt → module → where used → test) and the one
documented iteration where evidence changed a prompt. Owned by Person C;
update this continuously, not at the end.

## Artifact chains

| Prompt | Generated module | Used in | Test |
|---|---|---|---|
| `prompts/verifier_typescript.prompt` | `src/lib/verifier.ts` | `src/app/api/goals/[id]/check-in/route.ts` | `tests/verifier.test.ts` _(planned, C)_ |
| `prompts/coach_typescript.prompt` | `src/lib/coach.ts` | `src/app/api/coach/chat/route.ts` | `tests/coach.test.ts` ✅ |
| `prompts/points_typescript.prompt` | `src/lib/points.ts` | check-in route, `/api/goals/today` (penalty) | `tests/points.test.ts` ✅ passing |
| `prompts/goals_typescript.prompt` | `src/lib/goals.ts` | all goals routes, `/api/growth` | `tests/goals.test.ts` ✅ |
| `prompts/goals_api_typescript.prompt` | `src/app/api/goals/**` | Today + check-in flow | route-level, manual |
| `prompts/growth_typescript.prompt` | `src/lib/growth.ts` | `src/app/api/growth/route.ts` | `tests/growth.test.ts` ✅ |
| `prompts/growth_api_typescript.prompt` | `src/app/api/growth/route.ts` | Growth screen | route-level, manual |
| `prompts/rewards_api_typescript.prompt` | `src/app/api/rewards/**` | Rewards screen | route-level, manual |
| `prompts/look_typescript.prompt` | `src/lib/look.ts` | both rewards routes | `tests/look.test.ts` ✅ |
| `prompts/onboarding_api_typescript.prompt` | `src/app/api/onboarding/**` | Onboarding quiz | route-level, manual |
| `prompts/traits_typescript.prompt` | `src/lib/traits.ts` | onboarding route, coach tone | `tests/traits.test.ts` ✅ |
| `prompts/profile_api_typescript.prompt` | `src/app/api/profile/route.ts` | You screen | route-level, manual |
| `prompts/ui-profile_typescript.prompt` | `src/app/profile/page.tsx` | You screen | manual |
| `prompts/llm_typescript.prompt` | `src/lib/llm.ts` | `coach.ts`, `verifier.ts`, `traits.ts` | `tests/llm.test.ts` ✅ passing |
| `prompts/ui-today_typescript.prompt` | `src/app/today/page.tsx` | Today screen | manual + `pdd test` (story) |
| `prompts/tts_typescript.prompt` | `src/lib/tts.ts` | `src/app/api/tts/route.ts`, coach 2-minute-start card | `tests/tts.test.ts` ✅ passing |

`src/lib/contract.ts` + `tests/contract.test.ts` ✅ (4 tests passing) pin the API/points
constants the prompts reference.

## Tooling status (2026-07-25)

- pdd-cli **0.0.289** installed via pipx; `.pddrc` committed (prompts/ → src/lib/, tests/).
- All 5 prompts pass `pdd contracts check`: 0 warnings, 0 errors each.
- `pdd --local --estimate generate prompts/verifier_typescript.prompt` resolves the full
  chain and prices the run without provider calls (2,068 input tokens, "Provider call
  made: false") — proof the wiring works end to end.
- Blocked on an LLM key for real `sync`/`generate`/`update` runs: Person C adds
  `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GEMINI_API_KEY` to `.env` and runs `pdd setup`
  (MiniMax is the app's runtime LLM, not a pdd provider).

## Hand-edit log (back-propagate once keys are live)

Three build/deploy fixes were hand-applied on 2026-07-25 before their modules had prompt
files. Each module's prompt must be written (or `pdd --local update` run) before its next
change:

| File | Edit | Module (no prompt yet) |
|---|---|---|
| `src/app/api/tasks/route.ts` | type-guard `difficulty` so the strict build passes | `tasks_api` (A) |
| `src/app/coach/page.tsx` | wrap `useSearchParams()` in a Suspense boundary | `ui_coach` (B) |
| `src/app/coach/page.tsx` | prefetch pep-talk audio on micro-step, play-on-tap button, labeled "voice offline" state | `ui_coach` (B) |
| `src/app/api/rewards/route.ts` | `export const dynamic = "force-dynamic"` — live data must not be build-time cached | `rewards_api` (A) |

## The planned iteration (do this around T+3:30)

Test the verifier against 5 canned answer pairs: 2 honest, 2 lazy, 1 gaming
attempt.

- [ ] Run the 5 cases against v1 of `verifyCompletion`.
- [ ] Record the case that misscored here (what it was, what v1 returned,
      what it should have returned).
- [ ] Revise `prompts/verifier_typescript.prompt` to address the failure.
- [ ] Regenerate `src/lib/verifier.ts` from the revised prompt — never
      hand-edit the generated code and leave the prompt stale.
- [ ] Re-run the 5 cases and record the fix here.

### Iteration log
_(fill in during the build)_

**Failing case:** —
**v1 behavior:** —
**Prompt revision:** —
**v2 result:** —

## Module change log (chain kept in sync)

- 2026-07-25 `llm`: added TokenRouter (sponsor track) as a routed provider.
  Prompt (`prompts/llm_typescript.prompt`), code (`src/lib/llm.ts`), and test
  (`tests/llm.test.ts`, covers the prompt's 4 acceptance criteria with a
  stubbed fetch) updated **in the same commit** per convention rule 2.
  `pdd --local sync llm` re-verification pending an LLM key (see Tooling status).
- 2026-07-25 `llm`: live account probing corrected an initial provider mix-up.
  The `.io` service returned an opaque 500 before authentication; the configured
  key successfully listed 117 models and completed a chat through the verified
  `.com` endpoint (`POST /v1/chat/completions`) using
  `google/gemini-3.5-flash-lite`. Prompt, code, and test now assert the
  verified endpoint, Chat Completions request/response shape, and fallback from
  the obsolete `auto:balance` setting.
- 2026-07-25 `tts`: NEW module — ElevenLabs voice pep talk (sponsor track, P2).
  Born prompt-first: `prompts/tts_typescript.prompt` → `src/lib/tts.ts` →
  `/api/tts` route → `tests/tts.test.ts` (all 5 acceptance criteria, stubbed
  fetch), one commit. Voice-off is a labeled 503 fallback; live playback
  verification pending `ELEVENLABS_API_KEY`. Coach-page prefetch/play button
  is a `ui_coach` edit — logged below, prompt still owed by B.
- 2026-07-25 Person B pivot UI: prompt-first chains added for the UI data
  boundary, onboarding, shared check-in, Coach, Growth, Rewards, and the
  rewritten Today page. The screens use explicit `NEXT_PUBLIC_UI_DATA_MODE`
  fixtures with a visible label only; live route failures remain labeled
  errors while Person A/C deliver the pivot API contracts.
- 2026-07-25 `look` (NEW chain) + `rewards_api` + `ui-rewards`: found by
  walking the demo, not by a failing test. Redeeming a reward deducted points
  and added XP but changed **nothing** about the avatar, so the interaction
  read as "my balance went down and nothing happened" — the payoff beat of
  the 90-second script landed flat on a human watching it. The original spec
  did say display-only shelf items were acceptable for P0, so this is a
  deliberate scope increase, not a missed requirement.
  New pure module `src/lib/look.ts` (prompt → code → `tests/look.test.ts`,
  11 cases) derives the companion's appearance from redemptions rather than
  storing it as separate state, so the avatar cannot drift from what was
  actually paid for. Decisions worth noting: duplicate accessories don't
  stack on the sprite, worn items cap at 4 so a heavy spender doesn't bury
  the companion, the most recent theme wins so a new backdrop visibly
  replaces the old, an unrecognized `themeKey` renders no backdrop instead of
  a broken one, and `skip-token` is inventory rather than an outfit.
  Both rewards routes now return `owned` + `look`, re-read **after** the
  redeem write so the item just bought is included. `leveledUp` moved
  server-side so the celebration can't disagree with what was persisted.
  Schema: `RewardItem` gained `emoji` and a nullable `themeKey`
  (migration `reward_emoji_theme`); the seed catalog grew from 3 to 9 items
  priced 5–80 so a demo user holding 40 points can afford something
  immediately and still have things to climb toward.
  UI gotcha captured in the prompt: theme backdrop classes are written as
  literal strings in a lookup map, because Tailwind's scanner can't see
  dynamically built class names and would silently ship an unstyled panel.
- 2026-07-25 `coach`: shape fix found by walking the demo, and a real
  iteration worth recording. `coach.ts` returned a flat
  `{ microStep: string, timerSeconds }` while the UI reads
  `microStep.description` — so the 2-minute-start card **never rendered** and
  beat 1 of the 90-second script was silently dead. Nothing errored; the
  field was simply ignored. Fixed by returning the frozen
  `CoachChatResponse` shape, and — because the nested form is less natural
  for a model to emit and it will drift back — by adding a `normalizeReply`
  step that lifts a flat string into the nested object, defaults
  `timerSeconds` to 120, and drops whitespace-only descriptions instead of
  rendering a blank card. Prompt, code, and `tests/coach.test.ts` (10 cases,
  stubbed `chatJSON`, covering every acceptance criterion including both
  drift forms) updated in the same commit per convention rule 2.
  The route now also loads the stored `UserTraits` and passes
  `communicationStyle` / `motivationStyle` into the coach, so tone adaptation
  is driven by the user's real onboarding profile rather than a hardcoded
  persona — this is what makes the "adaptive agent" claim true rather than
  aspirational. Added `POST /api/coach/feedback` (the UI already called it;
  it 404'd), which writes the user's chosen approach back to
  `communicationStyle` — the one place a user can directly overrule the trait
  heuristics. It returns 409 rather than inventing a profile when the user
  hasn't onboarded, since age/gender would have to be fabricated.
  **Known gap:** `recentCurtReplies` is never populated in production — the
  UI sends a `sessionId` but there's no server-side session store, so the
  "getting annoyed" ladder only activates if a caller supplies the count.
  Logged rather than faked.
- 2026-07-25 `traits` + `profile`: NEW chains, born prompt-first. The team
  converged onto one machine, so the A/B/C split was retired for these.
  `traits.ts` was generated from the pre-existing
  `prompts/traits_typescript.prompt` (unblocking the last `tsc` error and the
  onboarding submit path) with `tests/traits.test.ts` covering all its stated
  acceptance criteria, including that `analyzeVisionBoard` resolves to
  `{ themes: [] }` rather than throwing on provider failure, invalid JSON, or
  a missing key. `profile_api` and `ui-profile` are new chains added because
  the quiz answers had nowhere to surface: the traits drive coach behaviour,
  so the profile screen shows them back to the user, explicitly labelled as a
  first guess that shifts with use rather than a verdict.
  **Seed change in the same pass:** `prisma/seed.ts` no longer creates a
  `UserTraits` row by default. Its presence made `/api/onboarding/status`
  report `completed: true`, which silently redirected `/onboarding` to
  `/today` — the quiz was unreachable. Set `SEED_ONBOARDED=1` to seed it and
  exercise the returning-user path instead. Also switched the seeded
  "Ship the side project MVP" goal from `weekly` to `daily`: only daily
  cadence ships, and the period math in `goals.ts` would have charged that
  row a penalty every day.
- 2026-07-25 Person A contract reconciliation. B's UI shipped first against
  its own local types in `src/lib/ui-data.ts`; A's API shipped against
  `contract.ts`. The two disagreed on paths (`/api/goals` vs
  `/api/goals/today`, `checkin` vs `check-in`, `/api/onboarding` vs
  `/api/onboarding/status`), on payloads (JSON vs multipart onboarding;
  2-element vs 3-element check-in answers), and on the growth model
  (account-wide vs per-goal). Resolved in A's favour on structure and in B's
  favour on names/shape: `contract.ts` was re-frozen to match `ui-data.ts`
  1:1, and the routes were rewritten to serve it. New prompt-first chain for
  `goals` (`prompts/goals_typescript.prompt` → `src/lib/goals.ts` →
  `tests/goals.test.ts`); `growth`, `goals_api`, `growth_api`, and
  `onboarding_api` prompts rewritten alongside their code in the same commit
  per convention rule 2.
- 2026-07-25 A hand-edit, logged per convention rule 1: `tests/llm.test.ts`
  (module `llm`, owned by C) called `chat(imageMessage(...))` with a bare
  message where `chat` takes `ChatMessage[]`, failing both `tsc` and the
  vision test. A wrapped it in an array — the test's own assertion reads
  `request.messages[0]`, so a one-element array was the intent. No change to
  `llm.ts` or its prompt.
- 2026-07-25 A hand-edit, logged per convention rule 1:
  `src/app/api/coach/chat/route.ts` (module `coach`, owned by C) referenced
  `prisma.task`, which A's pivot removed, breaking `tsc` and therefore the
  deploy. A applied the mechanical rename only (`taskId` → `goalId`,
  `Task` → `Goal`) and left the coach logic untouched. Two `coach` items
  remain owed by C: threading `TraitsProfile` through the route for tone
  adaptation, and returning the nested
  `microStep: { description, timerSeconds }` shape the UI and contract
  expect instead of today's flat `{ microStep: string, timerSeconds }`.
- 2026-07-25 `llm` / `coach` / `verifier`: C pivot update. The LLM wrapper
  now accepts vision content and exposes `imageMessage`; a stubbed-fetch test
  covers TokenRouter image serialization. Coach accepts an optional traits
  profile and reduces intensity before explicitly asking whether to change
  approach. Verifier accepts the third "How did this feel?" answer while
  retaining two-answer compatibility until the frozen contract and API route
  are migrated as a team. Prompts and code were updated together. Local test
  execution is pending because this environment cannot resolve the npm registry.
