# Would You Jump?

A confidential founder-formation hackathon prototype. **Runnable scaffold, not a completed service.**

## Start

Use Node 22+ and pnpm 11. If pnpm is missing, install it with `npm install -g pnpm@11.25.0`.

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. No API keys are needed for the local synthetic demo.

```sh
pnpm typecheck
pnpm test
pnpm build
```

## Stack

Next.js App Router + TypeScript, React, TanStack Query v5, plain CSS, Zod. Planned persistence: Supabase Postgres accessed by authenticated server routes. One optional model provider. No TanStack Start migration during the hackathon. QueryClient is wired; live query hooks are an integration task. Private intake stays outside Query cache.

## What works

Landing → join → private intake → explicitly approved demo card → deterministic synthetic matches → interactive pitch workspace. Private intake exists only while onboarding is mounted. Matching cards exist in app memory and reset on refresh. Public GitHub adapter is provided but not wired into the UI. Opportunity text is a labeled template without live evidence.

## What is deliberately disabled

All API contract routes return 501. Authentication, persistence, actual publication, real consent, identity reveal, and server-side pitch generation/approval/export are not implemented. The pitch workspace supports a clearly labeled local approval/export simulation and has live API integration ready. Never treat the demo card checkbox as production consent enforcement. Do not collect real sensitive data until the backend is integrated.

## Team ownership

| Person | Files | First milestone |
|---|---|---|
| Abhinav | `app/api/`, `lib/server/`, `db/` | Session + card + reciprocal match + mutual reveal |
| Anusha | `app/join/`, `app/onboarding/`, `app/matches/`, corresponding `components/`, `lib/client/` | Refine intake and connect real query/mutation hooks |
| Vernika | `lib/matching/`, `lib/evidence/`, `lib/generation/`, `fixtures/` | Public evidence + better opportunity proposal |
| You | `lib/contracts.ts`, app shell/providers/styles, `app/pitch/`, deployment | Integrate, implement pitch workspace, rehearse |

Use branches `feat/backend`, `feat/frontend`, `feat/matching`, `feat/integration`. Keep shared contracts stable; discuss interface changes before editing. Merge small working increments. No secrets in commits or browser bundles.

## Today: 11:30–16:30

- 11:30–12:00: install, claim ownership, verify fixtures/contracts.
- 12:00–13:00: first integrated two-session match/reveal flow.
- 13:00–14:00: public evidence and opportunity generation.
- 14:00–15:00: joint draft approval/export and two-device demo.
- 15:00–15:45: privacy/authorization checks and volunteer feedback.
- 15:45: feature freeze. Until 16:30: fix blockers, rehearse, record backup.

Cut hosted model generation before cutting consent enforcement. Synthetic demo is the fallback; label it clearly.

See [full handoff](WOULD_YOU_JUMP_HANDOFF.md) for exact API contracts and acceptance checks. This README's five-hour schedule supersedes that document's initial six-hour estimate.

## Pitch workspace milestone

Open `/pitch` for the synthetic local demo. Use `/pitch?matchId=ID` after a real mutual introduction, or `/pitch?pitchId=ID` for an existing draft. Includes editing, saved-version review, approval states, server-authorized export calls, and stale-version handling. See [pitch integration notes](components/pitch/README.md).

## Founder agent

Open `/agent` for the chat workflow. The models.dev catalog powers provider/model selection; the harness uses native or compatible adapters. Set a provider key in `.env.local` and restart. See [agent setup](docs/AGENT_SETUP.md). The agent can search public projects, inspect founder questions, rank example counterparts, and prepare a memo for the pitch editor. Telegram remains a later channel adapter.
