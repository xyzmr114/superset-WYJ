# WYJ — find a founder before you announce the leap

Private founder matchmaking: your local agent understands your own profile and goals, you approve a pseudonymous matching brief, and WYJ proposes people worth meeting. Names and contact details unlock only after both people explicitly agree.

**Current direction:** [PIVOT.md](PIVOT.md). **Four-person assignments:** [WOULD_YOU_JUMP_HANDOFF.md](WOULD_YOU_JUMP_HANDOFF.md). These replace previous LinkedIn outreach and evidence-board plans.

## Build order

1. Private profile / goals on the owner's device.
2. Local Laya classification into suggested labels; user reviews them.
3. Exact approved brief sent to the room matcher.
4. Complementary pairing proposed independently to both founders.
5. Per-pair mutual consent reveals only the contact details selected for that intro.
6. A first experiment and optional joint pitch.

Private profile processing must not fall back to a hosted model. A model suggesting labels does not grant consent. Shared matching and any future cloud reasoning receive only explicitly approved fields.

## Stack and run

Next.js 16, React, TypeScript, TanStack Query and Zod. Existing matching and opportunity proposals are deterministic. The current backend uses single-process memory; no hosted database is required for the room demo. It resets when the server restarts.

```sh
pnpm install
pnpm dev -- --port 3002
pnpm test
pnpm typecheck
pnpm build
```

Copy `.env.example` to `.env.local` for optional provider keys. Core matching and consent do not require a hosted model. Never commit credentials.

Next.js App Router + TypeScript, React, TanStack Query v5, plain CSS, Zod. Persistence: Supabase Postgres via `DATABASE_URL` (setup: [db/README.md](db/README.md)); in-memory PGlite when unset. One optional model provider. No TanStack Start migration during the hackathon. QueryClient is wired; live query hooks are an integration task. Private intake stays outside Query cache.

Laya is a local classifier candidate, not yet validated for founder matching. On the integration laptop it is installed in ignored `.wyj-local/venv`; checkpoint evaluation and the client adapter belong to Vernika. Details and limits are in [PIVOT.md](PIVOT.md).

## Implementation status

Reusable code already includes private browser-memory intake, a reviewed matching card, session-scoped APIs, matching, mutual reveal and versioned joint pitch approvals. The new private workspace, actual local classifier path and stronger per-pair identity snapshots are assigned in the handoff; this docs update does not claim they are implemented.

The existing `/agent` page still shows the previous outreach product until the new workspace replaces it. Browser automation, reply monitoring, OpenCode/OpenTUI and social posting are legacy code outside the new critical path.
