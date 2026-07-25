# PDD Evidence

Traceability chain (prompt → module → where used → test) and the one
documented iteration where evidence changed a prompt. Owned by Person C;
update this continuously, not at the end.

## Artifact chains

| Prompt | Generated module | Used in | Test |
|---|---|---|---|
| `prompts/verifier_TypeScript.prompt` | `src/lib/verifier.ts` | `src/app/api/tasks/[id]/complete/route.ts` | `tests/verifier.test.ts` |
| `prompts/coach-persona_TypeScript.prompt` | `src/lib/coach.ts` | `src/app/api/coach/chat/route.ts` | `tests/coach.test.ts` |
| `prompts/points-engine_TypeScript.prompt` | `src/lib/points.ts` | `src/app/api/tasks/[id]/complete/route.ts` | `tests/points.test.ts` |
| `prompts/llm-wrapper_TypeScript.prompt` | `src/lib/llm.ts` | `coach.ts`, `verifier.ts` | `tests/llm.test.ts` |
| `prompts/ui-today_TypeScript.prompt` | `src/app/today/page.tsx` | Today screen | manual + `pdd test` (story) |

## The planned iteration (do this around T+3:30)

Test the verifier against 5 canned answer pairs: 2 honest, 2 lazy, 1 gaming
attempt.

- [ ] Run the 5 cases against v1 of `verifyCompletion`.
- [ ] Record the case that misscored here (what it was, what v1 returned,
      what it should have returned).
- [ ] Revise `prompts/verifier_TypeScript.prompt` to address the failure.
- [ ] Regenerate `src/lib/verifier.ts` from the revised prompt — never
      hand-edit the generated code and leave the prompt stale.
- [ ] Re-run the 5 cases and record the fix here.

### Iteration log
_(fill in during the build)_

**Failing case:** —
**v1 behavior:** —
**Prompt revision:** —
**v2 result:** —
