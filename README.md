# WYJ — find a founder before you announce the leap

Private founder matchmaking: your local agent understands your own profile and goals, you approve a pseudonymous matching brief, and WYJ proposes people worth meeting. Names and contact details unlock only after both people explicitly agree.

**Current direction:** [PIVOT.md](PIVOT.md). **Four-person assignments:** [WOULD_YOU_JUMP_HANDOFF.md](WOULD_YOU_JUMP_HANDOFF.md). These replace previous LinkedIn outreach and evidence-board plans.

## Build order

1. Private profile / goals on the owner's device.
2. Local Laya classification into suggested labels; user reviews them.
3. Exact approved brief sent to the matcher.
4. Complementary pairing proposed independently to both founders.
5. Per-pair mutual consent reveals only the contact details selected for that intro.
6. A first experiment and optional joint pitch.

Private profile processing must not fall back to a hosted model. A model suggesting labels does not grant consent. Shared matching and any future cloud reasoning receive only explicitly approved fields.

## Stack and run

Next.js 16, React, TypeScript, TanStack Query and Zod. Existing matching and opportunity proposals are deterministic. The backend uses Postgres when `DATABASE_URL` is configured; otherwise local development uses single-process PGlite stored in ignored `.wyj-local/data`, surviving server restarts.

```sh
pnpm install
pnpm dev -- --port 3002
pnpm test
pnpm typecheck
pnpm build
```

Copy `.env.example` to `.env.local` for optional provider keys. Core matching and consent do not require a hosted model. Never commit credentials.

Production deployment and environment setup: [DEPLOYMENT.md](DEPLOYMENT.md).

Production browser models are served from Vercel Blob. `pnpm build` prepares checksum-verified runtimes; model weights stay outside Git and inference stays on the visitor's device. See [deployment setup](DEPLOYMENT.md).

Next.js App Router + TypeScript, React, TanStack Query v5, plain CSS, Zod. Persistence: Supabase Postgres via `DATABASE_URL` (setup: [db/README.md](db/README.md)); disk-backed local PGlite when unset. One optional model provider. No TanStack Start migration during the hackathon. QueryClient is wired; live query hooks are an integration task. Private intake stays outside Query cache.

Laya is a narrow local classifier, not a generative model or a validated founder assessment. Bonsai 1.7B supplies free browser-local idea wording. Details and limits are in [PIVOT.md](PIVOT.md).

## Implementation status

`/agent` and `/onboarding` use three steps: Your idea → Your partner → Preview & publish. The founder writes the actual shareable idea, optionally imports their own background for local Laya skill/topic suggestions, and chooses partner needs once. A live professional profile shows exactly what will be shared. No room code or private-constraints field. Model suggestions never publish automatically.

`/ideas` keeps separate approved ideas. Free permits five published ideas per room session and unlimited eligible founder matches. `/plans` selects Free or Premium preview; billing is not connected and no payment is taken. `/premium` reuses WYJ's solution memo and founder-review tools for a structured idea-refinement workspace using approved ideas and explicitly entered answers. Premium preview has no idea-count cap. These are session-level demo allowances, not paid or persistent account entitlements.

`/matches` supports independent contact previews/approvals, live status, withdrawal, immutable per-pair snapshots, and a versioned working trial after reveal. Both founders approve a trial before it activates. Continuation answers remain private; only mutual yes is shared. Joint pitch uses approved idea snapshots, with separate exact-version export approval.

Browser Laya loads public ONNX weights into a dedicated worker; visitors install nothing. Prepare the deployment machine once with `pnpm browser:prepare`, then serve the generated assets with the app. See [browser setup](scripts/browser-laya/README.md). First use downloads about 630 MB of public model/runtime files; manual entry remains available. The teammate's ten-snippet evaluation found substantial skill/domain errors and only one completely correct profile; every suggestion requires review. Sought skills and availability remain manual. Manual entry works if the browser runtime is unavailable. There is no automatic companion or hosted fallback. Shared ideas, plan previews, pair snapshots and trials persist when Postgres is configured; the local PGlite fallback persists in `.wyj-local/data`. Run `pnpm db:migrate` before deploying with Postgres.

Legacy browser outreach/OpenCode tools are outside the current product path.

## Optional DeepSeek idea enhancement

`/premium` can call DeepSeek Flash after explicit approval of the exact published brief. The server requires the caller's Premium preview plan, session ownership, brief version and consent. It loads the saved brief by reference and projects only approved idea/skill/preference fields; aliases, participant IDs, contacts, raw profiles and questionnaire answers are omitted. The request schema rejects injected free text. `DEEPSEEK_API_KEY` stays server-only; optional `PREMIUM_DEEPSEEK_MODEL` defaults to `deepseek-flash`. Provider failure is shown as an error, never disguised as a model-generated template. Local memo construction remains a separate option.

## Automatic on-device preparation and free idea help

Opening the intake prepares Laya and Bonsai in separate browser workers without sending either model any user input. The form remains usable during loading. Free users can ask Bonsai 1.7B to sharpen their idea, review/edit the result, and explicitly apply it; publication approval is still separate. Unsupported WebGPU devices retain manual entry. Prepare assets on the deployment machine with `pnpm browser:prepare` and `pnpm bonsai:prepare`; generated public weights are ignored by Git. First use downloads roughly 950 MB combined, then public assets may be browser cached. See [Bonsai setup](scripts/browser-bonsai/README.md).

Suggested matches now need a shared topic and at least one direction of explicit partner skill/strength fit. Existing pending/revealed introductions remain visible.
