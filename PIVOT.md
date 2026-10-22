# WYJ — private founder matchmaking

**Current product decision · 22 October 2026.** This document supersedes earlier outreach, LinkedIn automation, evidence-board, hiring and marketplace plans. Read this and `WOULD_YOU_JUMP_HANDOFF.md` before changing product behavior.

## Product

**A personal agent that finds a founder worth meeting without broadcasting your identity or private plans.**

A founder supplies their own profile text and idea. A local classifier proposes matching labels. The founder reviews the exact brief to publish. WYJ proposes a complementary pairing inside the app and privately asks both people whether they want an introduction. Identity/contact details unlock only after both explicitly approve.

Example: one person wants to build an Expedia-style booking layer for agents and offers engineering; another is exploring agent travel infrastructure and offers product/distribution. Explain the shared direction and complementary skills from their approved briefs. Similar interests alone do not establish compatibility, demand or a commitment to collaborate.

## Data boundary

| Data | Allowed location | May reach shared matching / a cloud model? |
|---|---|---|
| Raw self-submitted LinkedIn/profile text | Owner's device; memory by default | No |
| Private ambition, employment concerns and constraints | Owner's browser memory / local classifier | No |
| Laya's suggested labels | Owner's device, pending review | No, until the user approves the brief |
| Exact approved brief | Room matching service; potential counterpart | Matching: yes. Cloud: only if a separate explicit feature authorizes it; not needed for the first demo |
| Name and contact selected for a particular introduction | Separate identity/consent record | Counterpart: only after mutual approval; never a matching/model input |
| Consent receipts | Server: brief version, pair, fields, time, status | No raw private notes in audit records |

Use **pseudonymous** in technical descriptions. Removing a name does not guarantee that a distinctive brief cannot identify someone. The local classifier is an inference component, not an anonymity guarantee or a consent authority.

A service running on the organizer's laptop is not processing on every visitor's own device. Profile text must not be sent to the shared Next.js API and then described as on-device. Preferred runtime: browser-local ONNX. Fast implementation option: a loopback-only companion on each founder's own laptop. If neither is ready, offer manual brief fields and clearly show that no classifier ran. Never silently send raw text to a hosted model as fallback.

## Core flow

1. Join the room with a pseudonymous session.
2. Enter your own profile and idea in the private panel.
3. Run local classification; correct suggested labels. Unknown/unsupported labels remain unresolved.
4. Preview a brief: alias, skills offered/sought, problem areas, coarse availability and an edited short idea blurb.
5. Explicitly approve publishing that exact brief. Editing it invalidates an earlier unchecked/checked approval state.
6. Get proposed pairings without a founder-count cap using approved briefs, with reasons and a first experiment.
7. Each side independently selects Interested / Pass. Interest is not permission to send a message or book a meeting externally.
8. Select the name/contact fields to reveal for this specific pair and approve. Before both approve, API responses must contain no counterpart identity fields.
9. After mutual approval, show contact details and a 15-minute introduction / 48-hour experiment suggestion. Reuse the joint pitch editor afterward; exact-version export approvals stay separate.

## Frozen scope for the next working demo

**Must ship:** private profile panel, reviewed brief, matching, two real independent approvals, server-gated reveal, visible data boundary, two-session demonstration.

**Conditional:** real local Laya labels after a measured smoke test; public GitHub project evidence queried from approved generic domains only; joint pitch after introduction.

**Defer:** scraping other people's LinkedIn profiles, LinkedIn inbox automation, unsolicited external outreach, automatic meeting booking, evidence-board analysis, payments, hiring assessments, Telegram, OpenTUI, a Hermes/OpenCode fork, cryptographic matching claims, and a database migration unrelated to the demo.

## Laya decision

Laya means https://github.com/NandhaKishorM/laya — not Llama. It is a typed classification/decision engine, not a generative chat model. Use narrow questions about explicit skills and interests. It must never infer permission to publish or reveal an identity.

`laya==0.4.13` and the English checkpoint now run on the integration laptop through the own-device companion. The teammate ten-snippet smoke exposed low precision/recall and only one fully correct profile; offers/interests are suggestions, while sought skills and availability remain manual. This is not founder-domain accuracy validation. All labels require review. Dependencies/weights are ignored, not pushed. See `scripts/local-classifier/README.md`.

The project's published benchmarks show substantial domain dependence and overconfidence; do not claim a generic benchmark is founder-matching accuracy. Test the actual questions on a small labeled set, including negation and profiles with missing information. Do not block the consent demo on a model download or training run.

Sources:
- Main documentation: https://github.com/NandhaKishorM/laya
- Limitations and benchmarks: https://github.com/NandhaKishorM/laya/blob/main/BENCHMARKS.md
- Browser/Node inference: https://github.com/NandhaKishorM/laya/blob/main/laya-ts/README.md

## Existing implementation to reuse

- `lib/client/private-profile.ts`: private React memory, deliberately excluded from API requests and model prompts.
- `components/onboarding/CardEditor.tsx`: exact approved-card preview and publication checkbox.
- `lib/matching/`: deterministic matching over approved fields, including free-text tag normalization.
- `lib/server/` and `app/api/matches/`: participant sessions, reciprocal matches and mutual reveal.
- `app/pitch/` and `components/pitch/`: shared pitch, versioned approvals and export.

Current `/agent` and `/onboarding` both route to `components/private/PrivateWorkspace.tsx`; the previous outreach UI is no longer the main product. Shared backend state persists in configured Postgres. The PGlite fallback survives hot reload but resets on restart and supports one process. Earlier unpushed evidence/privacy experiments were saved in a named Git stash and are outside this pivot.

## Match/reveal integration landed

`/matches` now offers Interested / Pass, an exact identity preview and pair-specific approval. Pending consent can be withdrawn. Both independent approvals are required by the server before any counterpart contact appears in JSON. Approval snapshots cannot be silently replaced, and edits to the older global identity record do not change them. Joint pitch creation uses the same mutual-consent gate.

Verified with two independent browsers and `scripts/acceptance-pivot.ts` (21 checks). The private workspace and direct own-device Laya adapter have now also landed; see the integration update below. Storage uses configured Postgres, with an in-memory PGlite fallback.

## Intake, trials and plans integration

Private intake includes self-submitted profile/idea and a separate constraints field that is not sent even to Laya. Fixed classification labels are reviewed; broad template prose and user edits form the approved idea. Self-described strengths, desired partner strengths, stack, availability and working styles are optional approved matching fields. No model personality assessment. The outgoing payload is visible before publishing; edits reset consent. Name/contact collection happens only inside pair-specific introduction review.

Each session can publish separate immutable idea briefs. Free: five ideas, unlimited eligible founder matches. Premium: uncapped idea slots in development preview, structured idea refinement, solution memo and pitch planning. No billing integration or payment is claimed. Limits are per ephemeral room session, not durable paid accounts.

Matches store both exact idea snapshots; a later idea cannot change an earlier pairing or consent. Working trials have a versioned shared goal, deliverable, each person's contribution and future deadline. Both approvals activate the plan. Private continuation feedback reveals only mutual yes; pass and pending are indistinguishable to the counterpart.
