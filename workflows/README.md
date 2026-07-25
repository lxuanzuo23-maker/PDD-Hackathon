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
flowchart TD

    User[User]

    UI[Next.js 14 Frontend<br/>React + Tailwind]

    API[Backend API<br/>Next.js API Routes]

    Prompt[PDD Prompt Layer<br/>prompts/*.md<br/><br/>coach.prompt.md<br/>planner.prompt.md<br/>reward.prompt.md]

    Agent[AI Agent Layer<br/>Motivation Coach<br/>Goal Planner<br/>Task Generator]

    Router[TokenRouter<br/>LLM Routing Layer]

    MiniMax[MiniMax LLM<br/>Reasoning + Generation]

    Memory[mem0 Memory Layer<br/>User History<br/>Preferences<br/>Past Goals]

    DB[(Prisma + SQLite<br/>User<br/>Tasks<br/>Points)]

    Reward[Reward Engine<br/>Points<br/>Achievements]

    Voice[ElevenLabs<br/>Voice Interaction]

    Deploy[Render Cloud Deployment]


    User --> UI

    UI --> API

    API --> Agent

    Prompt --> Agent

    Agent --> Router

    Router --> MiniMax

    Agent --> Memory

    Agent --> DB

    DB --> Reward

    Reward --> UI

    Agent --> Voice

    API --> Deploy

3. Trigger from the app or CLI, show the run in the dashboard during the demo.

Note: exact SDK/package details may have drifted; if reality disagrees with this file,
trust the Render docs page and the sponsor table, and update this file.

This folder is excluded from the Next.js tsconfig so an SDK type issue can never break
the main build.
