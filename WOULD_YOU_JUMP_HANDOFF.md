# WYJ pivot — four-person handoff

**Read `PIVOT.md` first. This is the current assignment, replacing earlier plans.**

Build private founder matchmaking: own profile → local suggested labels → exact approved pseudonymous brief → proposed pairing → independent mutual consent → reveal. No LinkedIn scraping or outbound messaging in the critical path.

## Parallel work, clear ownership

| Owner | Deliverable | Owned files | Done when |
|---|---|---|---|
| **Abhinav** | Enforce brief publication and pair-specific identity consent on the server | `lib/server/**`, `app/api/session/**`, `app/api/me/**`, `app/api/matches/**`, `db/**` | Two independent sessions can publish and match. No identity is present after zero or one approval. Both approvals reveal the exact contact snapshots approved for that pair. Outsiders cannot read the match. |
| **Anusha** | Private agent + brief-approval experience | `components/private/**` (new), `components/onboarding/**`, `app/agent/page.tsx`, `app/onboarding/page.tsx`, `app/join/page.tsx`, `lib/client/private-profile.ts` | A founder pastes their own profile, keeps private goals local, reviews/corrects suggested labels, and explicitly publishes the preview. Raw text never enters a Next API request, query key, analytics payload or hosted model prompt. Editing the preview resets publication consent. |
| **Vernika** | Local Laya classification, matching quality and generic public evidence | `scripts/local-classifier/**` (new), `lib/private/classifier-contract.ts` (new), `lib/matching/**`, `lib/evidence/**`, `lib/generation/**` | Report real checkpoint results for the agreed labels. Supply local inference adapter or an explicit unavailable result. Pairings use approved skills/interests and complementarity. Public evidence queries contain generic approved domain tags, no profile text or identities. |
| **You + Codex** | Integration, match interaction/reveal UI, contract coordination and demo | `lib/contracts.ts`, `lib/client/api.ts`, `app/matches/page.tsx`, `components/matches/**`, app shell/styles/providers, pitch integration, root docs | New workspace becomes the primary product. Both founders see Interested / Pass and exactly what an intro will reveal. A real two-session walkthrough proves private text stays local and reveal waits for both people. |

Do not edit another owner's files to fix an interface silently. Keep changes small and state the field or behavior change in the handoff. Everyone can read every module; the boundaries above are to prevent conflicting edits.

## First 10 minutes

- **Abhinav:** verify current `toView()` gating; implement/freeze the approval identity snapshot contract below.
- **Anusha:** build the private workspace and reviewed brief UI; wire manual approved fields first so the end-to-end path is usable.
- **Vernika:** try real Laya weights on a few labeled profile snippets; return an honest result immediately. The integration laptop already has `.wyj-local/venv` with Laya 0.4.13 installed.
- **You + Codex:** connect the new workspace route, implement the interest/reveal interaction, and prepare two isolated sessions.

## By 25 minutes

Merge one working increment per owner. Local classification may still say unavailable; the manual brief and real mutual reveal must already work. Stop work on legacy LinkedIn/social tools.

## Next 15 minutes

Integrate local classification if verified, test the two-session flow, and fix only failures in the core path. Use the remaining time for the demo, not another framework or feature.

## Frozen contracts

### Approved matching brief: reuse `MatchingCard`

Existing fields remain `alias`, `offers`, `seeks`, `interests`, `availability`, `approvedBlurb`, with server-assigned `id`, `eventId`, `version`. Keep alias <=40 characters, offers/seeks <=5 entries each, interests <=4 entries, and the preview blurb <=240 characters. Never add raw profile, private goal, employer or contact fields to this type.

`PUT /api/me/card` receives these approved fields plus `publishConsent: true`. The server derives participant identity from the session cookie. The frontend must not publish automatically after classification.

### Local classifier: proposed shared interface

```ts
type LocalClassification = {
  status: 'ready' | 'needs_review' | 'unavailable';
  engine: 'laya-local';
  suggested: {
    offers: string[];
    seeks: string[];
    interests: string[];
    availability: 'exploring' | 'weekends' | 'full_time';
  };
  message: string; // no raw input echoed into logs
};
```

Only allowlisted category labels cross this boundary. Do not generate a free-form public bio from private prose. Availability and sought skills can remain user-entered when the source does not state them. Confidence is diagnostic, not permission or proof.

Preferred browser-local inference uses `laya-ts` with local ONNX inference. If a Python companion is faster, the browser talks directly to the user's own loopback endpoint, suggested `127.0.0.1:11435`, not the shared Next server. Allow only the configured app Origin; bind loopback; no payload logs. Anusha should accept this contract and show editable manual fields when unavailable.

### Introduction consent: implemented integration contract

```json
{
  "decision": "approve",
  "identity": {"displayName": "Chosen name", "contact": "Chosen email or contact"}
}
```

Keep `decision: 'decline'` supported. Approval stores an immutable per-pair snapshot of the chosen details, approved brief version and timestamp. Do not look up mutable global identity records to decide what a previous approval released. Do not return this snapshot to the counterpart until both approve. Repeated approval requests must not silently replace an already approved snapshot.

Frontend: first click opens an identity preview; the explicit approval button submits it. Private notes are never in this request. Reuse existing pitch approval/export as a separate consent scope after reveal.

## Integration checks

1. Type a recognizable canary into optional background; confirm it never appears in shared matching or hosted-model requests.
2. A and B publish complementary briefs. A third session cannot fetch their pairing.
3. A approves; B's contact is absent from A's JSON response, not merely hidden in the DOM.
4. B approves; only then do both see the approved contact snapshots.
5. Decline/withdraw before mutual reveal prevents disclosure.
6. Contact changes outside the match must not change an already approved snapshot.
7. Classifier unavailable/uncertain never triggers a cloud fallback or automatic publication.
8. Preserve identities/private notes outside joint pitch generation and export unless separately approved.

## Delivery

Pull before starting and before pushing. Suggested branches remain `feat/backend`, `feat/frontend`, `feat/matching`, `feat/integration`. Existing local integration branch is `feat/pitch-workspace`. Run appropriate tests and `pnpm typecheck`; integration runs the build. Never commit keys, browser profiles, classifier weights or private input fixtures.

## Integration update — preserve on merge

You + Codex have integrated `/matches`, the consent preview, waiting/passed/introduced filters, 3-second status polling, withdrawal and the joint-pitch link. Tested using two independent browser sessions.

**Abhinav:** the required backend bridge was implemented alongside the UI. Preserve `lib/server/intro-consent.ts`, `Match.introConsents` in `store.ts`, the consent route, snapshot-based `toView()` in `matches.ts`, and the shared `mutuallyApproved()` gate in `pitches.ts`. Approve now requires `identity`; decline and withdraw carry no identity. Withdraw clears only the caller's pending consent. A repeated approval is idempotent only for the same details; different details require withdrawal first. Once both reveal, withdrawal cannot recall disclosed details. Legacy approval bits alone never unlock identity or pitch. `myConsent` exposes receipt metadata only, never the counterpart's pending snapshot.

Candidate generation now excludes built-in fixture participants and requires at least one shared approved interest. Current server fixtures remain for older tests; they are not consent participants in the new flow.

`lib/server/intro-consent.test.ts` covers gating, outsider access, immutable snapshots, withdrawal and legacy approvals. `scripts/acceptance-pivot.ts` is the focused pivot acceptance script. The broader `acceptance.ts` also uses explicit pair-specific identities.

The Postgres integration preserves these contracts: `decideIntroduction()` is asynchronous and persists conditional updates; `matchRow()` reconstructs `introConsents` from the identity, timestamp and brief-version columns in migration 003. Migration 004 keeps pair ordering consistent with JavaScript. Configure and migrate Postgres as described in `db/README.md`; without `DATABASE_URL`, PGlite is limited to one process and resets on restart.

**Remaining owners:** Anusha's private workspace still needs to replace the old `/agent` screen and early global identity collection; Vernika's real local classification/evaluation remains pending. Do not describe either as completed by this integration.

## Latest integration — local intake, multiple ideas, trials and plans

Pulled main before starting; no teammate commits were present. User explicitly requested the local pipeline, richer partner preferences, working trials and Free/Premium. Three subagents implemented runtime, matching and trial/plan tools in parallel; integration now touches the owner boundaries listed above. Pull before resuming work; extend these interfaces rather than restoring the old screens.

- **Anusha:** `/agent` and `/onboarding` now mount `components/private/PrivateWorkspace.tsx`. Preserve private memory, explicit local-classifier action, reviewed labels, exact outgoing payload and checkbox reset. Name/contact no longer collected at intake. A separate private constraints field is never sent to Laya. New ideas publish via `POST /api/me/ideas`; legacy `PUT /api/me/card` remains for older clients and cannot replace an idea collection.
- **Vernika:** `scripts/local-classifier/server.py` runs on each owner's loopback; `lib/private/local-classifier.ts` calls it directly, validates fixed labels, omits cookies and never uses a hosted fallback. The merged teammate runtime uses its ten-snippet evaluation and English threshold 0.7; only offered skills/interests are suggested, with sought skills and availability manual. The model is not reliable enough to auto-fill publication. Preferences are explicit self-description, not inferred personality. Matching uses shared direction, complementary skills and approved preference reasons/tie breaks; app requests unlimited ranking. Public GitHub queries still use generic mapped domains only.
- **Abhinav:** `lib/server/ideas.ts` stores per-session idea collections and preview plan selection. Free limit=5, Premium preview limit=null, `billingConnected:false`; no real payment entitlement. `GET/POST /api/me/ideas`, `GET/POST /api/me/plan` are new. `MatchingCard.ideaId` is optional for legacy compatibility; `Match.aCard/bCard` freeze exact idea snapshots, and `MatchView.myBrief` identifies which of my ideas a pairing concerns. Intro receipt versions and joint drafts read pair snapshots, never the mutable current card.
- **Working trial:** `GET/POST /api/matches/:id/trial` requires mutual introduction. POST propose `{plan,version}`, approve `{version}`, feedback `{version,decision}`. Proposals do not auto-approve; edits invalidate both approvals; stale version rejected; active plan fixed. Contributions are caller-relative. Only mutual continuation is shared; no counterpart feedback/completion bit exposes a pass.
- **Plans/tools:** `/ideas`, `/plans`, `/premium` are live. Premium is explicitly a no-charge development preview. Idea refinement reuses the memo renderer/Markdown/founder review and runs locally from approved idea plus user-entered answers, without cloud calls.

Ideas, preview plans, frozen idea pairs and trials now use Postgres through migration 005. Participant-row locks serialize quota changes/publication; trial version checks and consent snapshots use conditional SQL updates. Run `pnpm db:migrate` before deployment. The PGlite fallback still resets on restart and supports one process. Quotas remain per session, not durable person accounts; preview plan selection is not paid billing. Laya visitors need their own local runtime or manual entry.

### Upstream reconciliation

Merged teammate travel/ai-agents taxonomy, public evidence queries, travel fixtures, intro-call step, Laya contract, loopback companion and ten-snippet evaluation. `lib/private/local-classifier.ts` is a small UI wrapper around the teammate's canonical `classifier-contract.ts`; profile+idea go directly as `{text}` to the loopback runtime, never the private constraints. There is one canonical `scripts/local-classifier/server.py`, not two competing runtimes. The earlier integration-only four-example smoke was superseded by this shared path. Preserve both the approved-idea pitch grounding and the teammate travel/intro behavior.

## Browser Laya + DeepSeek integration update

- **Browser default:** `lib/private/browser-classifier.ts` and `scripts/browser-laya/worker.mjs` replace companion calls in the private workspace. `classifyInBrowser(profile,idea,onProgress?,signal?)` returns the canonical review-required labels. Cancel/unmount releases worker memory; private constraints are not arguments. Keep the older companion adapter separate; never silently fall back to it or cloud inference.
- **Assets/deployment:** `pnpm browser:prepare` builds pinned Laya/ORT browser assets and exports/quantizes the checkpoint. Deploy ignored `public/models/laya/**` and `public/laya-runtime/**` alongside WYJ. First use is about 630 MB; visitors install nothing. A plain clone without asset preparation must offer manual entry honestly. Browser quantized predictions have not inherited the Python smoke's accuracy claims.
- **DeepSeek boundary:** `lib/premium/enhancement-contract.ts` is shared by UI preview/server projection. `POST /api/premium/enhance` strictly accepts `{ideaId,briefVersion,consent:true}`. Premium plan + cookie owner + exact saved version required. Server reads only that published idea and sends projected approved fields to DeepSeek Flash. No private free text, alias/ID/contact or local questionnaire answers is accepted. Server-only key, timeout and visible provider errors; no silent model/template substitution.
- **Premium UI:** separate preview/checkbox, pending/error/cancel states, reset on idea/version change, response provenance and editable Markdown. Local memo answers remain local. Selecting a model result does not publish it or send it to another founder.

The API and actual DeepSeek browser walkthrough returned a real refinement from a separately approved brief. Raw private-questionnaire canary remained outside the provider request. Existing in-memory plans/storage limits still apply.

Verified in the actual in-app browser: cold model download, completed local classification, warm-model classification, cancellation and a successful restart. Model/runtime file loading uses fixed same-origin GETs only. The WebGPU ORT bundle needs its asyncify WASM pair; preserve those files in the preparation script. Both real browser inference and real DeepSeek output were demonstrated before push.

Latest persistence merge: the backend now uses async `requireSession`, `planFor`, `ideasFor` and SQL-backed stores. DeepSeek enhancement awaits these gates before reading the approved projection. Postgres persists configured deployments; zero-setup PGlite still resets on restart. Preserve migrations through 005 and run the deployment migration step.

## Current intake and free agent update — pull before editing

The integration pass changed Anusha’s private workspace files and Vernika’s matching files; pull this commit before continuing. Ownership remains unchanged. Canonical flow: **Your idea → Your partner → Preview & publish**. No room code, private-constraints field, template idea paragraph or repeated partner questions. The founder authors the shareable idea. Optional background stays in tab memory; Laya suggestions fill visible skills/topics without overwriting existing choices. `components/founders/FounderProfile.tsx` is the shared dynamic profile renderer for intake, saved ideas and matches.

Laya and Bonsai automatically warm in isolated browser workers while the founder writes; warmup contains no user text. Free Bonsai 1.7B rewrites only the entered idea after a click, with editable output and explicit adoption. It never publishes. Prepare both generated asset sets before deployment: `pnpm browser:prepare` and `pnpm bonsai:prepare` (about 950 MB total first visitor download). Manual entry remains usable throughout and on unsupported browsers. Premium DeepSeek still receives only separately approved saved briefs.

Partner choices populate both seeks and partnerStrengths. New suggestions require a shared topic plus at least one requested skill/strength actually fulfilled by the other founder. Two engineers both requesting sales no longer qualify through similarity alone. Pending/revealed introductions are preserved.

Next owner work: **Anusha** polish the three-step workspace/shared profile, preserving local-only input and separate approval; **Vernika** evaluate classifier quality and ranking against real reviewed examples; **Abhinav** preserve default code-free session creation, async Postgres and immutable pair snapshots; **You + Codex** verify local generation, automatic warmup and complete publication/mutual reveal.
