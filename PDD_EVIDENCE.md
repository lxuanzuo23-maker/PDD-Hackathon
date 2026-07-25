# PDD Evidence

The artifact chains that qualify us: prompt -> generated module -> where it's used -> test.
Person C curates; everyone adds their own rows as modules land.

## Artifact chains

| Prompt | Generated module | Used in | Test |
|---|---|---|---|
| `prompts/verifier_typescript.prompt` | `src/lib/verifier.ts` | `POST /api/tasks/[id]/complete` | `tests/verifier.test.ts` |
| <!-- add each module as it lands --> | | | |

## Iteration log (evidence that changed a prompt or test)

The rubric gives points for at least one documented iteration. Planned: at ~T+3:30,
run the verifier against 5 canned answers (2 honest, 2 lazy, 1 gaming attempt), log the
misscore here, revise the prompt, regenerate, log the fix.

| Time | Module | Evidence observed | Change made |
|---|---|---|---|
| | | | |

## Tooling

Generated via pdd CLI (`pdd sync <basename>` / `pdd generate` + `pdd update`).
Run reports live in `.pdd/meta/` and are committed as additional evidence.
