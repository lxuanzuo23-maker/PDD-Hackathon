# PDD Evidence

Traceability chain (prompt → module → where used → test) and the one
documented iteration where evidence changed a prompt. Owned by Person C;
update this continuously, not at the end.

## Artifact chains

| Prompt | Generated module | Used in | Test |
|---|---|---|---|
| `prompts/verifier_typescript.prompt` | `src/lib/verifier.ts` | `src/app/api/tasks/[id]/complete/route.ts` | `tests/verifier.test.ts` _(planned, C)_ |
| `prompts/coach_typescript.prompt` | `src/lib/coach.ts` | `src/app/api/coach/chat/route.ts` | `tests/coach.test.ts` _(planned, C)_ |
| `prompts/points_typescript.prompt` | `src/lib/points.ts` | `src/app/api/tasks/[id]/complete/route.ts` | `tests/points.test.ts` ✅ passing |
| `prompts/llm_typescript.prompt` | `src/lib/llm.ts` | `coach.ts`, `verifier.ts` | `tests/llm.test.ts` ✅ passing |
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
- 2026-07-25 `llm` / `coach` / `verifier`: C pivot update. The LLM wrapper
  now accepts vision content and exposes `imageMessage`; a stubbed-fetch test
  covers TokenRouter image serialization. Coach accepts an optional traits
  profile and reduces intensity before explicitly asking whether to change
  approach. Verifier accepts the third "How did this feel?" answer while
  retaining two-answer compatibility until the frozen contract and API route
  are migrated as a team. Prompts and code were updated together. Local test
  execution is pending because this environment cannot resolve the npm registry.
