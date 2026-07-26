# Prompt-file convention (agree on this before writing feature code)

We use the pdd CLI's native convention so the automated PDD compliance score can read our work.

## Naming

One module = one prompt file, named `<basename>_typescript.prompt`, living in this folder.
**The basename must equal the generated file's stem** — that is how pdd (and the compliance
scorer) traces prompt → code. Output dirs come from `.pddrc` (default `src/lib/`); files
outside `src/lib/` need an explicit `--output`.

Modules and owners (✅ = prompt exists today):

| Basename | Prompt file | Generates | Owner |
|---|---|---|---|
| `points` ✅ | `points_typescript.prompt` | `src/lib/points.ts` + `tests/points.test.ts` | A |
| `llm` ✅ | `llm_typescript.prompt` | `src/lib/llm.ts` (MiniMax wrapper, 1-line swappable) | C |
| `coach` ✅ | `coach_typescript.prompt` | `src/lib/coach.ts` | C |
| `verifier` ✅ | `verifier_typescript.prompt` | `src/lib/verifier.ts` | C |
| `ui-today` ✅ | `ui-today_typescript.prompt` | `src/app/today/page.tsx` (via `--output`) | B |
| `ui-data` ✅ | `ui-data_typescript.prompt` | `src/lib/ui-data.ts` | B |
| `ui-onboarding` ✅ | `ui-onboarding_typescript.prompt` | `src/app/onboarding/page.tsx` | B |
| `ui-checkin` ✅ | `ui-checkin_typescript.prompt` | `src/components/CheckInFlow.tsx` | B |
| `ui-growth` ✅ | `ui-growth_typescript.prompt` | `src/app/growth/page.tsx` | B |
| `tts` ✅ | `tts_typescript.prompt` | `src/lib/tts.ts` + `/api/tts` route + `tests/tts.test.ts` | C |
| `band` ✅ | `band_typescript.prompt` | `src/lib/band.ts` (web side of `services/band-worker/` loop) | C |
| `tasks_api` | _write before next edit_ | `src/app/api/tasks/**` route handlers | A |
| `rewards_api` | _write before next edit_ | `src/app/api/rewards/**` route handlers | A |
| `ui-coach` ✅ | `ui-coach_typescript.prompt` | `src/app/coach/page.tsx` | B |
| `ui-rewards` ✅ | `ui-rewards_typescript.prompt` | `src/app/rewards/page.tsx` | B |

## Every prompt file must contain

1. **Intent**: what this module is for, in 2 sentences.
2. **Acceptance criteria**: executable statements ("returns multiplier between 0.5 and 2.0").
3. **Interfaces**: reference the exact types from `src/lib/contract.ts` it must use.
4. **Output paths**: the file(s) it generates and the test file.

## The three rules (these are worth 25 of our 100 points)

1. **Never hand-edit generated code silently.** Small fix in a hurry? Fine, but immediately run
   `pdd --local update prompts/<basename>_typescript.prompt <code_file>` so the prompt catches up,
   or edit the prompt and regenerate. If the module has no prompt yet, log the edit in
   `PDD_EVIDENCE.md` and write the prompt before the next change. The rubric explicitly
   deducts for drifted prompts.
2. **Commit the chain together**: `.prompt` file + generated code + test in the same commit,
   message prefixed with the basename, e.g. `verifier: v2, reject vague answers`.
3. **Log iterations.** When test evidence makes you change a prompt, add one line to
   `PDD_EVIDENCE.md` at that moment, not at 6:50 PM.

## Workflow per module

pdd-cli is installed (`pipx install pdd-cli`, v0.0.289) and the repo has a `.pddrc`
(prompt dir `prompts/`, code out `src/lib/`, tests `tests/`).

**One-time (Person C, first 30 min):** pdd needs its own LLM key — MiniMax is the app's
runtime provider, NOT a pdd provider. Put `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` or
`GEMINI_API_KEY` in `.env`, then run `pdd setup` (interactive wizard, does a test call).
Alternative: cloud mode (`pdd sync` without `--local`) authenticates via GitHub SSO.

```bash
# write the .prompt file first, then:
pdd --local sync <basename>       # full loop: generate, example, test, fix
# or piecemeal when time-boxed:
pdd --local generate prompts/points_typescript.prompt   # → src/lib/points.ts via .pddrc
pdd --local generate --output src/app/today/page.tsx prompts/ui-today_typescript.prompt
pdd --local update prompts/<basename>_typescript.prompt <code_file>   # after any hand-edit
pdd --local test prompts/<basename>_typescript.prompt <code_file>

# sanity checks that need NO api key (both pass today):
pdd contracts check prompts/<basename>_typescript.prompt
pdd --local --estimate generate prompts/<basename>_typescript.prompt
```

Commit `.pdd/meta/` and `.pdd/evidence/` as PDD evidence; `cache/locks/worktrees/core_dumps`
stay gitignored.

If pdd fights you on some step, fall back to generate + update only, and keep this
convention manually. The method scores the points; the tool is just the fast path.
