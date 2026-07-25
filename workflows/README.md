# Render Workflows (podium requirement)

Every podium place needs "PDD artifact chain + Render Workflows", so this cannot be skipped.

Render Workflows = tasks defined as plain functions with Render's SDK, run on demand in
separate instances (their orchestration engine for background jobs / AI tasks).
Docs: https://render.com/docs/workflows

## Our plan (smallest honest integration)

Wrap ONE real piece of the product as a workflow task: the end-of-day recap generator
(input: today's check-ins; output: an encouraging recap + tomorrow's suggested first task).
It is real, demoable, and does not block the core path if it lags.

## Setup (Person A, after the web service is green, ~20 min)

1. In the Render dashboard: New -> Workflow, point it at this repo.
2. `npm install @renderinc/sdk` and define the task here, e.g.:

```ts
import { task } from "@renderinc/sdk/workflows";

export const dailyRecap = task({ name: "dailyRecap" }, async (userId: string) => {
  // fetch today's check-ins, call the coach LLM, return recap text
});
```

3. Trigger from the app or CLI, show the run in the dashboard during the demo.

Note: exact SDK/package details may have drifted; if reality disagrees with this file,
trust the Render docs page and the sponsor table, and update this file.

This folder is excluded from the Next.js tsconfig so an SDK type issue can never break
the main build.
