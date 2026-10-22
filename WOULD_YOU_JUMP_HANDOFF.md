# Would You Jump? — four-person implementation handoff

> Scaffold update: use Next.js + TypeScript + TanStack Query, with Supabase Postgres behind server routes. The live deadline is 4:30 PM; follow the five-hour schedule in README.md instead of the original six-hour estimate below.

## Product decision

Build a confidential founder-formation agent for people at this hackathon: discover a complementary teammate, explore an evidence-backed startup hypothesis, mutually reveal identities, and create a joint pitch draft for super{set}.

One-line demo: **“There’s someone in this room you could start a company with. Here’s what you could build together—and neither person had to publish their plans to quit.”**

This is an independent prototype, not an official super{set} application portal. Export a pitch draft; do not submit applications or promise investment. Treat business opportunities as hypotheses, never validated demand.

Planning assumption: four people total—Abhinav, Anusha, Vernika, and you—with roughly six hours. Assignments assume no specific skill differences. Swap people if necessary, but keep the module boundaries.

## MVP scope

1. Join one event using a QR code; create an anonymous session.
2. Enter a private ambition and constraints, retained only in browser memory for this prototype.
3. Separately compose and explicitly approve a structured matching card: skills offered, skills sought, problem interests, availability, and a short approved blurb.
4. Receive up to three complementary founder matches and a concrete startup hypothesis informed by public GitHub project evidence.
5. Privately evaluate the proposal against local constraints. This local step can say “worth a conversation” or “not yet”; it cannot infer the other person’s undisclosed finances or intentions.
6. Both participants approve an introduction before names/contact details are revealed.
7. Create a joint pitch from approved matching cards and source evidence. Both approve the exact draft version before export.

### Explicit cuts

No email/LinkedIn integration, automatic job resignation advice, payments, investment scoring, full investor CRM, chat system, autonomous outreach, vector database, complex multi-agent framework, or cryptographic matching protocol. No persistence of private free text. No requirement to upload a resume. No PDF export—download Markdown or copy text.

The “agent” is a short workflow: find candidates → retrieve evidence → propose a company → locally assess fit → request introduction → prepare pitch. It need not be a general autonomous agent.

## Ownership and first tasks

| Person | Owns | Deliverable | First 30 minutes |
|---|---|---|---|
| **Abhinav** | Backend, session authorization, consent state | APIs and persistent event/match/pitch state | Create database/schema, anonymous session endpoint, seeded event and two test sessions |
| **Anusha** | Frontend, private intake, consent UX | Join → intake → matching-card preview → results → mutual reveal screens | Build screens against fixed mock responses; isolate local private state |
| **Vernika** | Matching, public-data retrieval, opportunity/pitch generation | Pure matching functions, GitHub adapter, structured generation and fallback | Write six synthetic profiles, deterministic matcher and one source fixture |
| **You** | Integration, product decisions, pitch workspace, deployment/demo | Shared contracts, working deployed journey, pitch approval/export, demo | Scaffold repo, freeze shared types, establish preview deployment and demo storyline |

### Abhinav — backend and consent

Own `app/api/**`, `lib/server/**`, and database migrations. The client may only read its own sessions and matches. Keep database service credentials server-side. Use an opaque session credential in a secure HttpOnly cookie; never authorize requests using a userId supplied by the browser.

Implement session creation, card publishing, match persistence, per-participant introduction approvals, identity reveal, and versioned pitch approvals. Store identity separately from matching cards. Reveal only when both approvals exist for that match. Use a transaction for state changes. Polling is sufficient; no websockets.

**Done when:** two independent browser sessions can approve the same match; before mutual approval neither receives the other’s identity in any response; a third session cannot read that match. Editing a pitch invalidates both previous pitch approvals.

### Anusha — experience and local privacy

Own `app/join/**`, `app/onboarding/**`, `app/matches/**`, `components/onboarding/**`, `components/matches/**`, and `lib/client/private-profile.ts`.

Keep private notes and exact money constraints in browser memory, not localStorage, analytics, API payloads, or error reports. Clearly say that refreshing clears these notes. Use a separate explicit matching-card editor; do not silently summarize private free text into a public card. Show exactly what is approved for the event’s matching service and, when enabled, its model provider.

Show three result cards with complementary skills, a source-linked opportunity, uncertainties, and an introduction button. Add a local “Would I jump?” checklist against the user’s constraints; unresolved funding stays “unknown,” not “satisfied.” Display “Waiting for the other person” until the server authorizes reveal.

**Done when:** private notes never appear in network requests; the actual revealed identity comes only from the authorized backend response; empty, waiting, failed, and synthetic-demo states are clear.

### Vernika — matching and public evidence

Own `lib/matching/**`, `lib/evidence/**`, `lib/generation/**`, and `fixtures/**`. Export pure functions for Abhinav/you to wire into routes; do not edit route files directly.

Start with deterministic scoring over approved cards: shared problem interests (0–40), complementary offered/sought skills in both directions (0–40), and compatible approved availability (0–20). Exclude self and declined matches. Explain scores as a heuristic, not a prediction of founder success. Return fewer than three matches if there are fewer suitable participants.

Use public GitHub repository search for one or two domain queries derived only from approved tags. Fetch once per domain and cache for 15 minutes. Preserve repository URL, description, and fetched timestamp. Evidence can show existing tooling, adjacent projects, or a possible integration opportunity; stars and repositories do not prove customer willingness to pay. Do not fetch arbitrary participant-provided URLs.

Generate a small structured opportunity: problem hypothesis, target user, why this pair, public evidence, unanswered questions, and a 48-hour customer experiment. Use a hosted model only on approved cards and public evidence. Treat fetched text as untrusted data; it cannot change prompts, permissions, or tools. Validate output and allow citations only to supplied evidence IDs. On timeout/missing credentials, use a deterministic template with a visible fallback label.

**Done when:** two profiles yield a credible proposal with clickable evidence; API/model failure still yields an explicitly labeled cached/template result; no invented customer claims or citations.

### You — integration and application draft

Own repo scaffold, `lib/contracts.ts`, `app/pitch/**`, `components/pitch/**`, global shell/styles, deployment configuration, and demo instructions. Maintain one integration branch; do not let people independently redesign shared contracts.

Build a pitch workspace containing: problem, proposed product, target customer, team complementarity, public evidence, first validation experiment, and a super{set} fit hypothesis. Use a manually curated portfolio context with source links, not an invented official application form. Keep identities out of generated prose; append separately selected identity fields only after both participants approve the exact export version.

Show each participant the exact pitch and identity fields proposed for export. Server must refuse export until both approve the current version. Local private constraints must never enter this draft. Download Markdown and provide copy-to-clipboard. No external sending.

**Done when:** the deployed app completes the two-person journey, exports the approved draft, and supports an honest repeatable demo.

## Suggested stack and module boundaries

Use one TypeScript/Next.js application with route handlers and simple CSS/Tailwind components, a hosted Postgres database (Supabase is a reasonable default), and one optional hosted model API. Use your team's existing equivalents if already configured. No separate microservices.

Browser memory: private notes, exact income/runway constraints, personal checklist.

Server/database: approved cards, separately held identities, matches, consent transitions, public evidence, draft versions. This is privacy from other participants and minimization of model disclosure—not secrecy from the application operator. Anonymous cards can still be recognizable in a small room; do not claim otherwise.

Model: approved card fields and public evidence only. Identity fields are not needed for generation. Name the actual provider in the publication consent UI if enabled.

## Shared types — freeze before implementation

```ts
type MatchingCard = {
  id: string; eventId: string; alias: string;
  offers: string[]; seeks: string[]; interests: string[];
  availability: 'exploring' | 'weekends' | 'full_time';
  approvedBlurb: string; version: number;
};
type Evidence = {
  id: string; provider: 'github'; title: string; url: string;
  excerpt: string; fetchedAt: string; cached: boolean;
};
type Opportunity = {
  title: string; problemHypothesis: string; targetUser: string;
  whyThisPair: string[]; evidenceIds: string[];
  unknowns: string[]; nextExperiment: string;
  generationMode: 'model' | 'template';
};
type MatchView = {
  id: string; candidate: MatchingCard; score: number;
  opportunity: Opportunity; evidence: Evidence[];
  status: 'suggested' | 'pending' | 'revealed' | 'declined';
  myIntroApproval: boolean;
  // Omit entirely until mutual consent; never send then hide with CSS.
  revealedContact?: { displayName: string; contact: string };
};
type PitchView = {
  id: string; matchId: string; version: number; markdown: string;
  proposedIdentityFields: Record<string, string[]>;
  myApproval: boolean; bothApproved: boolean; exportable: boolean;
};
type ApiError = { error: { code: string; message: string } };
```

Use controlled skill/domain tags for the first version so matching is predictable. Backend stores participant IDs and approvals privately; public views expose only authorized fields. Never create a server-side `PrivateProfile` type or endpoint.

## API contract

All mutable/read-personal endpoints require the session cookie. Match and pitch IDs are identifiers, never authorization. Use same-origin requests and CSRF/origin protection for mutations. Abhinav owns implementing routes; Vernika supplies functions.

| Method/path | Request | Response/behavior |
|---|---|---|
| POST `/api/session` | `{eventCode}` | Creates session cookie; returns `{participantId,eventId}` |
| PUT `/api/me/identity` | `{displayName,contact}` | Stores separately; returns `{saved:true}` without echoing contact |
| PUT `/api/me/card` | Approved card fields plus explicit publish consent | Returns `MatchingCard`; freezes after matches in MVP |
| POST `/api/matches/generate` | `{}` | Idempotently creates/reuses candidate pairs; returns `{matches:MatchView[]}` |
| GET `/api/matches` | — | Own matches; newly proposed pairs appear for both participants |
| GET `/api/matches/:id` | — | Authorized `MatchView`; poll every 3 seconds while waiting |
| POST `/api/matches/:id/consent` | `{decision:'approve'|'decline'}` | Updated `MatchView`; reveal only after both approve |
| POST `/api/matches/:id/pitch` | `{}` | Only after reveal; creates/reuses a draft; returns `PitchView` |
| PUT `/api/pitches/:id` | `{expectedVersion,markdown,proposedIdentityFields}` | Increments version and clears approvals; conflict returns 409 |
| POST `/api/pitches/:id/approve` | `{version}` | Records this participant's approval for exact current version |
| GET `/api/pitches/:id` | — | Authorized `PitchView` |
| GET `/api/pitches/:id/export` | — | Markdown only if both approved current version; otherwise 403 |

Only an identity's owner can change the identity fields proposed for that person. Do not allow one participant to grant consent on behalf of another. An approval request for a stale draft returns 409. Freeze source cards after matching in this MVP to avoid consent-to-edited-content ambiguity.

Consent state: no approvals → suggested; one approval → pending; both → revealed; decline before reveal → declined. Before reveal either participant can decline to stop the introduction. After reveal explain that already seen information cannot be recalled; do not promise retroactive deletion from another person's memory or export.

## Integration plan — six-hour timebox

| Time from kickoff | Required checkpoint |
|---|---|
| 0:00–0:20 | You scaffold, all agree types/routes/tags; pick one synthetic pair and domain. Confirm DB and optional model credentials. |
| 0:20–1:30 | Everyone builds independently using shared fixtures. Anusha has navigable screens; Abhinav working sessions; Vernika matcher/evidence; you pitch UI/deployment. |
| 1:30–2:15 | First vertical slice: publish two approved cards → list reciprocal match → mutual reveal. Integrate even if styling/generation is rough. |
| 2:15–3:15 | Add live GitHub evidence and structured proposal. Integrate exact-version pitch approvals/export. |
| 3:15–4:15 | Test on two phones plus a third unauthorized session; recruit 4–8 volunteers. Watch intake completion and whether introductions feel useful. |
| 4:15–5:00 | Fix consent/privacy failures and confusing UX. Ensure fallback fixtures and template generation work. |
| 5:00–6:00 | Feature freeze, deployment verification, rehearse, record backup demo, prepare one-slide business story. |

If only three hours remain: use deterministic templates, one domain, one result per participant, and a fixed pitch template. Preserve local private state, mutual consent, source attribution, and exact-version pitch approval. Cut visual polish and model generation first.

## Demo data and story

Use fictional attendees clearly marked synthetic. Never attribute unverified customer access to real teammates.

- Founder A: backend/data engineer; offers integrations, seeks customer discovery and sales; interested in developer workflows. Privately needs runway before leaving a job.
- Founder B: developer-tools product/sales background; seeks backend cofounder; interested in the same domain. Privately exploring rather than ready to resign.
- Four distractor profiles with different interests/skills ensure the ranking has an explanation.
- Public GitHub projects show related tooling. Proposed company addresses a possible workflow gap; the next experiment is interviews with five prospective users. This is not evidence of demand yet.

90-second demo:

1. A enters a private condition; preview proves it is absent from the published card.
2. Agent presents B anonymously, a company hypothesis, and public sources.
3. A's local checklist says “worth exploring; runway still unresolved.”
4. A approves; no identity appears. B approves on a second device; identity becomes available to both.
5. Joint pitch appears; both approve version 1; export becomes enabled.
6. Close: “We help people find the team and first experiment that make starting a company possible—before they announce they are leaving.”

Show the network boundary with a brief developer-tools check if useful; don't spend the demo explaining architecture. If using cached sources or synthetic participants, label them visibly.

## Acceptance checks — required before presenting

- Put a distinctive private string in intake; confirm it never enters requests, server logs, model prompts, pitch drafts, or exports.
- A cannot obtain B's identity before B approves, including by directly calling the match endpoint.
- C cannot read or mutate A/B's match or pitch by copying the ID.
- Repeated approval clicks do not create duplicate introductions; stale pitch approvals fail.
- Editing any exported content invalidates both approvals; export rejects unapproved versions.
- Failed GitHub/model calls produce a labeled fallback, never fabricated “live” evidence.
- Source URLs resolve and support the narrow claims made. Public project activity is not presented as revenue or customer validation.
- No matching is also a valid result; do not invent attendees or put synthetic matches into the real participant pool without labels.
- Full journey works on two devices against the deployed database, not just a local mock.

## Pitch and business hypothesis

User: experienced builders quietly considering entrepreneurship. First distribution: hackathons and founder communities. Potential payer: accelerators or venture studios seeking qualified founding teams; willingness to pay is untested.

Measure onboarding completion, mutually accepted introductions, and teams choosing a concrete validation experiment. Funding and income are potential future outcomes, not demo metrics or promises. Do not monetize hidden private intentions.

super{set} fit: complementary teams, a specific business problem, and controlled use of data. Explain the fit as your hypothesis, with links. The generated draft should include unanswered questions and no invented endorsements or official application requirements.

## Source references

- Event tracks: https://luma.com/superset-hy5n
- super{set} approach: https://superset.com/
- Portfolio: https://superset.com/portfolio
- Habu data-collaboration story: https://www.superset.com/theclosedsession/habu-co-founders-matt-kilmartin-mike-moreau-on-selling-for-200m
- GitHub REST search documentation: https://docs.github.com/en/rest/search/search

GitHub search has separate rate limits; cache requests and handle 403/429 failures. Confirm the current repository-search contract in the official docs during implementation. A server-side GitHub token, if used, must never reach the browser.

## Copy-paste kickoff messages

**Abhinav:** Own backend/session security and consent routes. Read the shared types/API table first. First milestone is two sessions publishing cards and mutually approving a match with identities withheld until both consent. Deliver route stubs early. Integrate Vernika's pure functions rather than reimplementing them.

**Anusha:** Own onboarding and match UI. Keep private intake in memory only and create a separately approved matching card. Work against shared fixtures immediately. First milestone is join → intake → publication preview → anonymous match → waiting/reveal screens.

**Vernika:** Own deterministic matching, public GitHub evidence, and opportunity/pitch content generation. Use only approved card fields. Deliver pure functions plus synthetic fixtures first; hosted generation is optional. Every opportunity needs supported sources, uncertainties, and a concrete validation experiment.

**You:** Own shared contracts, scaffold/deployment, pitch approval/export UI, integration, and demo. Freeze interfaces now, integrate the consent flow at 90 minutes, and keep the last hour for verification and rehearsal.
