# Disclosures

Per the rules: honest labeling of what's mocked, broken, borrowed, or fake.
Update this file the moment something ships in a limited state, not at 7:40 PM.

## Standing disclosures (true from build start)

- The repo was empty at build start. The initial scaffold (Next.js config, frozen API
  contract types, health endpoint, this file) was generated with AI assistance (Claude)
  at the venue at build start, before feature code.
- No real authentication. Single demo user; anyone with the URL sees the demo account.
- Database is SQLite on Render's ephemeral disk: data resets on redeploy. A seed script
  restores the demo state on boot. Fine for demo, not production.
- The completion verifier is an LLM plausibility check on the user's answers. It raises
  the honesty bar; it is not proof the task happened.
- Runtime LLM: MiniMax. If MiniMax is unreachable, the coach shows a labeled
  "coach offline" state. There are no hidden canned replies.

## Added during the day

<!-- e.g. "Rewards shelf has one redeemable item; theme items are display-only." -->
- (nothing yet)
