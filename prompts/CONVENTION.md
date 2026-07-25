# Prompt-file convention (agree on this before writing feature code)

We use the pdd CLI's native convention so the automated PDD compliance score can read our work.

## Naming

One module = one prompt file, named `<basename>_typescript.prompt`, living in this folder.

Planned modules and owners:

| Basename | Generates | Owner |
|---|---|---|
| `points_engine` | `src/lib/points.ts` + `tests/points_engine.test.ts` | A |
| `tasks_api` | `src/app/api/tasks/**` route handlers | A |
| `rewards_api` | `src/app/api/rewards/**` route handlers | A |
| `llm_client` | `src/lib/llm.ts` (MiniMax wrapper, 1-line swappable) | C |
| `coach` | `src/lib/coach.ts` + coach route | C |
| `verifier` | `src/lib/verifier.ts` + used in complete route | C |
| `ui_today` | `src/app/page.tsx` Today screen | B |
| `ui_coach` | `src/app/coach/page.tsx` | B |
| `ui_rewards` | `src/app/rewards/page.tsx` | B |

## Every prompt file must contain

1. **Intent**: what this module is for, in 2 sentences.
2. **Acceptance criteria**: executable statements ("returns multiplier between 0.5 and 2.0").
3. **Interfaces**: reference the exact types from `src/lib/contract.ts` it must use.
4. **Output paths**: the file(s) it generates and the test file.

## The three rules (these are worth 25 of our 100 points)

1. **Never hand-edit generated code silently.** Small fix in a hurry? Fine, but immediately run
   `pdd update <basename> <code_file>` so the prompt catches up, or edit the prompt and regenerate.
   The rubric explicitly deducts for drifted prompts.
2. **Commit the chain together**: `.prompt` file + generated code + test in the same commit,
   message prefixed with the basename, e.g. `verifier: v2, reject vague answers`.
3. **Log iterations.** When test evidence makes you change a prompt, add one line to
   `PDD_EVIDENCE.md` at that moment, not at 6:50 PM.

## Workflow per module

```bash
# write the .prompt file first, then:
pdd sync <basename>          # full loop: generate, example, test, fix
# or piecemeal when time-boxed:
pdd generate --output src/lib/points.ts prompts/points_engine_typescript.prompt
pdd test <basename>
```

If pdd fights you on some step, fall back to generate + update only, and keep this
convention manually. The method scores the points; the tool is just the fast path.
