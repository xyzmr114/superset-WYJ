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

Next.js 16, React, TypeScript, TanStack Query and Zod. Existing matching and opportunity proposals are deterministic. The backend uses Postgres when `DATABASE_URL` is configured; otherwise it uses single-process PGlite and resets when the server restarts.

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

`/agent` and `/onboarding` now use the private founder workspace: own profile/idea in tab memory, browser-local Laya suggestions, manual correction, explicit strengths/partner preferences/stack/work style, exact outgoing payload and publication consent. No name or contact is collected during intake. The public blurb starts from a broad category template; private prose is never automatically copied into it.

`/ideas` keeps separate approved ideas. Free permits five published ideas per room session and unlimited eligible founder matches. `/plans` selects Free or Premium preview; billing is not connected and no payment is taken. `/premium` reuses WYJ's solution memo and founder-review tools for a structured idea-refinement workspace using approved ideas and explicitly entered answers. Premium preview has no idea-count cap. These are session-level demo allowances, not paid or persistent account entitlements.

`/matches` supports independent contact previews/approvals, live status, withdrawal, immutable per-pair snapshots, and a versioned working trial after reveal. Both founders approve a trial before it activates. Continuation answers remain private; only mutual yes is shared. Joint pitch uses approved idea snapshots, with separate exact-version export approval.

Browser Laya loads public ONNX weights into a dedicated worker; visitors install nothing. Prepare the deployment machine once with `pnpm browser:prepare`, then serve the generated assets with the app. See [browser setup](scripts/browser-laya/README.md). First use downloads about 630 MB of public model/runtime files; manual entry remains available. The teammate's ten-snippet evaluation found substantial skill/domain errors and only one completely correct profile; every suggestion requires review. Sought skills and availability remain manual. Manual entry works if the browser runtime is unavailable. There is no automatic companion or hosted fallback. Shared ideas, plan previews, pair snapshots and trials persist when Postgres is configured; the local PGlite fallback resets on restart. Run `pnpm db:migrate` before deploying with Postgres.

Legacy browser outreach/OpenCode tools are outside the current product path.

## Optional DeepSeek idea enhancement

`/premium` can call DeepSeek Flash after explicit approval of the exact published brief. The server requires the caller's Premium preview plan, session ownership, brief version and consent. It loads the saved brief by reference and projects only approved idea/skill/preference fields; aliases, participant IDs, contacts, raw profiles and questionnaire answers are omitted. The request schema rejects injected free text. `DEEPSEEK_API_KEY` stays server-only; optional `PREMIUM_DEEPSEEK_MODEL` defaults to `deepseek-flash`. Provider failure is shown as an error, never disguised as a model-generated template. Local memo construction remains a separate option.
