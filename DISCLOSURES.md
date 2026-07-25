# Disclosures

Honest accounting of what's real, what's mocked, and what's cut. Update this
continuously — don't leave it to the last hour.

## No real auth
There is one seeded demo user (`Demo User`). There is no login, no sessions,
no password. Every API call operates on that single user.

## Database resets on redeploy
SQLite runs on Render's ephemeral disk. Every redeploy wipes and re-seeds
the database via `npm run seed`. This is a known tradeoff for demo speed,
not a production design.

## Verifier is plausibility-scoring, not proof
The completion verifier judges plausibility and effort from two short
answers. It cannot and does not confirm a task was actually done — it's a
friction mechanism against casual lying, not a fraud-proof system.

## Mocked UI states (update as B builds)
- [ ] List any screens/components still running against mocked API
      responses instead of the real, deployed endpoints here.

## What was borrowed vs. built today
- Scaffold (this repo skeleton, Prisma schema, API route stubs, prompt
  files) was generated ahead of the clock starting, per the team's design
  doc, to save setup time. All feature logic, prompt iteration, and content
  were built during the 6-hour build window.

## Voice covers one moment only
The ElevenLabs pep talk exists on the coach's 2-minute-start card, nowhere
else. Without `ELEVENLABS_API_KEY` the card shows a labeled "voice offline"
state — the demo arc works identically with voice dark. Audio for a repeated
pep talk is served from an in-memory cache to conserve sponsor credits.

## Sponsor tracks claimed
- [ ] MiniMax — confirm the integration is actually working before claiming
      the track at submission.
- [ ] TokenRouter — wired as a selectable provider (`LLM_PROVIDER=tokenrouter`);
      only claim if the demo actually routes through it.
- [ ] ElevenLabs — only claim if the voice pep talk audibly plays in the demo
      (integration is wired; needs the key + a played moment in the video).
