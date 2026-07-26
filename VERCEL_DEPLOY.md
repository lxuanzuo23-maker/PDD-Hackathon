# Vercel web deployment

TinyWins can run its Next.js web application on Vercel. The persistent Band
worker remains a separate Render worker because Vercel functions do not support
its long-lived Python WebSocket process.

## Required topology

```text
Vercel              Next.js web app and API routes
Managed Postgres    Prisma database shared by web and worker callbacks
Render worker       Band Goal Coach and Reflection Guide
RocketRide Cloud    Vision Board Insight pipeline
```

## One-time dashboard setup

1. Import this repository in Vercel and use the `main` branch.
2. Create a managed Postgres database (Vercel Marketplace/Neon is suitable).
3. Add its pooled connection URL as `DATABASE_URL`.
4. Add the application secrets listed in `.env.example`; set
   `NEXT_PUBLIC_UI_DATA_MODE=live`.
5. Set `TINY_WINS_WEB_URL` on the Render Band worker to the final Vercel URL.

## Database migration

The current committed Prisma migrations target SQLite for the existing Render
demo. Do **not** point Vercel at SQLite: it is ephemeral in serverless
functions. Before production use, create a Postgres Prisma schema/migration
baseline and run `prisma migrate deploy` from a trusted CI/admin environment.

`npm run vercel-build` intentionally only runs `prisma generate && next build`;
database migrations are not run during each Vercel build.

## Deploy

After Vercel CLI authentication and environment configuration:

```bash
npx vercel link
npx vercel --prod
```

Verify `/api/health`, onboarding, a goal check-in, the Growth page, and the
ElevenLabs play action on the deployed URL.
