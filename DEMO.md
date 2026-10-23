# WYJ demo — two founders, two independent decisions

Current product: see `PIVOT.md`. Roles and implementation ownership: see `WOULD_YOU_JUMP_HANDOFF.md`.

## Story

“Two people in this room want to build related things. Their private agents find a reason to talk without publishing their full profiles or their plans to leave work.”

## Five-minute walkthrough

1. Open two independent browser sessions as Founder A and Founder B. Open the same app URL; `/try` explains the steps. Do not use two tabs sharing one session cookie.
2. A privately describes engineering experience and an agent travel-booking idea. Use the optional background field to demonstrate local skill suggestions.
3. Run local classification if the checkpoint has been verified. Show the runtime and editable labels. If unavailable, enter the same brief fields manually and say that classification is unavailable; do not present a template as model inference.
4. Show exactly what leaves the device: nickname, selected skill/problem tags, preferences, coarse availability and approved blurb. Publish only after the preview approval.
5. B approves a complementary product/distribution brief in the same direction.
6. WYJ proposes a pairing on both screens, with reasons derived from the approved briefs.
7. A selects Interested and reviews the exact identity/contact details for this introduction. A approves. The other identity is still absent from A's API response.
8. B independently approves. Only now do the chosen contact details appear on both screens.
9. End with a suggested 15-minute introduction and a first experiment. Open the joint pitch only if the core flow is complete.

## Track fit

- Personal agents: classify the owner's context and help evaluate worthwhile pairings.
- Data privacy: raw profiles/private constraints stay on their owner's device; matching sees approved features.
- User consent: preview publication, pair-specific introduction approval, and separate pitch export approval.
- Public data: generic GitHub/API evidence can inform a first experiment using approved domains only.

## Claims to make precisely

Local inference must really run on the user's device. Pseudonyms are not guaranteed anonymity. No contact is revealed before both approvals. The demo does not send external messages, book meetings, promise investment or claim a match predicts founder success.

With DATABASE_URL set, apply pnpm db:migrate before rehearsal. Without it, local PGlite persists in `.wyj-local/data`; avoid restarting between participants joining and revealing. Rehearse with actual independently controlled sessions; do not simulate the other person's consent.

## Implemented match/reveal rehearsal

Use `/matches` in independent browsers after publishing the briefs. Interested opens a preview without submitting consent. Enter the exact chosen name/contact, check the pair-specific approval, and submit. Show the waiting screen and optionally withdraw. Independently approve in the second browser; the first screen updates automatically. Use Introduced to focus the pair, then Build a joint pitch. Draft generation and export approval remain separate steps.

Live API verification: `pnpm exec tsx scripts/acceptance-pivot.ts http://localhost:3002` creates isolated test participants and checks 41 conditions including one-sided JSON privacy, outsider denial, withdrawal, immutable snapshots and the pitch gate. It adds test briefs to the running development room. Run only against your development server.

The match/reveal browser walkthrough passed. The current `/agent` now runs the private workspace with direct local Laya inference and manual review. A real browser run required correcting a travel-domain label.

## Extended demo

1. On `/agent`, enter your own profile/idea and optional background. Run Laya in your own browser, correct its suggested labels, choose strengths/desired partner strengths/stack/work styles, then review the exact outgoing payload. Change a tag and show publication approval resetting. Publish without entering a name/contact.
2. `/ideas` shows separate approved briefs and active Free publication usage out of five. `/plans` states unlimited eligible founder matches and Premium preview. API acceptance verifies sixth simultaneously published free idea blocked and more than five founder matches returned.
3. After mutual reveal, propose a 48-hour working trial. Show the other founder sees their own contribution correctly, then approve independently in both browsers. Only two approvals activate it. Reflection is for after the trial; don't pretend an actual project was completed in the demo.
4. Preview Premium (no payment), open `/premium`, select an approved idea and fill customer/problem/wedge/test answers. Generate an editable solution memo and review/copy/download. This uses local structured templates, not hosted generative inference.

Prepare browser assets using `scripts/browser-laya/README.md` and `scripts/browser-bonsai/README.md`; visitors install no companion. The teammate ten-snippet model smoke is not an accuracy claim; missing labels and wrong domains are expected review cases. Configured Postgres persists room and plan data; the zero-setup PGlite fallback persists in ignored `.wyj-local/data` (one server process).

## Browser model and real DeepSeek refinement

Prepare assets on the hosting laptop once (`pnpm browser:prepare`); visitors only open the app URL. Models prepare automatically while the form stays usable; show loading progress and reviewed labels. No companion should be required or called. Public files may be browser-cached; cancel stops the worker. Manual brief fields remain usable on devices that cannot run the model.

In Premium, pick an already approved idea, inspect the exact DeepSeek payload, then explicitly approve sending it. Local questionnaire answers are excluded. Show the real DeepSeek Flash output with provider/model/brief-version attribution, edit it, and optionally export it. Do not describe local template generation as a cloud model run.

Browser walkthrough passed: public model loading, completed local labels, cancellation and restart. DeepSeek browser walkthrough returned a real attributed draft from the approved brief while a local questionnaire canary remained excluded.

## Current three-step rehearsal

Open `/agent`; both local models prepare while you type. Enter a short idea, try **Sharpen my idea**, inspect the actual browser-generated Bonsai sentence, then **Use this version**. Show that the live profile updates but nothing publishes. Choose skills/topics, then partner strengths once. Preview and approve. The success screen explains finding a founder and mutual contact approval. Prepare both model asset sets before rehearsal; first use downloads about 950 MB. No room code or companion install.


## Consent controls and reliable two-person rehearsal

- Open `/try` on two devices or independent browser profiles. For a predictable real match, use the same topic and complementary needs: A offers Engineering and seeks Sales; B offers Sales and seeks Engineering. Custom topic normalization handles spelling/case, not semantic synonyms. No counterpart or consent is manufactured.
- Publish independently; open Founders on both screens. Use **Refresh matches** if needed. One identity approval must leave contact hidden; the second independent approval reveals the selected snapshots. Then propose a working trial and have both approve the same version.
- On **My ideas**, review **Unpublish idea**, then confirm. New matching stops and pending introductions are cancelled. The saved brief remains in owner history; already disclosed contact, consent receipts and shared pitches are not recalled. **Review & republish** requires confirmation of the exact saved brief; cancelled introductions stay cancelled.
- Free quota counts five *currently published* ideas, not lifetime drafts. Unpublish to free a slot; republishing also checks the active quota. Premium remains an unpaid preview.
- **New idea** uses `/agent?new=1` to start fresh and removes that query afterward. Ordinary `/agent` and refresh restore the current matching-field draft. Background and publication consent are not retained.

## Research and enhancement proof

In `/premium`, select a currently published owned brief. DeepSeek enhancement requires its separate exact-brief checkbox. Public research has a different checkbox and shows the exact topic query: at most two approved interests followed by `software tools open source`. `/api/premium/research` checks Premium, ownership, current publication, brief version and explicit consent; the request contains only the idea reference, version and consent.

Show public web search links and, when available, the first source read through DeepSeek Fetch. Broad recognized categories also query GitHub. Custom niches can return web results without a GitHub category. Display live/cached/saved-snapshot provenance honestly; unavailable web search yields a warning and no invented results. Existing repositories are leads, not evidence of customer demand. No background, identity/contact or local questionnaire text is sent by either feature. The legacy `/api/agent` remains disabled by default and is not the research entry point.

Apply migrations through `006_idea_publication.sql` before rehearsal. Migration 006 has been applied to the shared Supabase database; each other deployment must run `pnpm db:migrate` too.

## Local fictional-founder demonstration (`feat/demo-founders`)

The demo helpers use fictional counterpart accounts, not actual founder responses. Their revealed names end in `(demo)` and contacts use `example.com`. Normal human accounts still require their own independent approval.

Run the app on port 3002, then from the repository root:

```sh
BASE_URL=http://localhost:3002 pnpm exec tsx scripts/demo/seed.ts
BASE_URL=http://localhost:3002 pnpm exec tsx scripts/demo/adjacent.ts
```

The seed creates 12 reusable founders and saves only their session cookies in ignored `.wyj-demo/sessions.json` (private file permissions). The adjacent helper watches new published ideas, creates a complementary fictional counterpart, generates a match and answers introduction requests after a short delay. Custom approved niches and soft skills are supported locally. It never approves for a human participant. No real messages or meetings are sent.

DeepSeek can pre-generate fictional examples from fixed topic/skill combinations at startup; user-derived inputs are never sent by the helper. Missing combinations use local templates. Do not use `--all` casually: it also creates counterparts for existing ideas in the configured database. The current app uses shared Supabase even though the website and model assets are served locally.

Verified locally: Rider Rival → complementary Maya → user approval → delayed demo-side approval → mutual reveal. This is demonstration automation, not evidence of genuine founder interest.

## Live server-response proof and revised 90-second story

On a fresh suggested match, open **Privacy check → Technical proof · view server response** before approving. Leave the match under **For you** so it stays mounted through the reveal. The inspector performs an authenticated, no-store GET to `/api/matches/:id` and captures actual complete parsed JSON for each observed stage. After one approval, `myIntroApproval: true`, `theirIntroApproval: false`, and `revealedContact` is absent. After the second approval, both are true and `revealedContact` contains the counterpart's selected snapshot. Stage buttons compare earlier timestamped observations; they do not change consent. Reload clears evidence history. DevTools Network can independently inspect the same GET. The demo-mode notice must be visible before consent when fictional responders are active (`NEXT_PUBLIC_DEMO_MODE=true` at build time).

90-second narrative:

- 0–10s: "Your next cofounder could be in this room. WYJ helps you develop the idea and find a complementary person while controlling what you share. Our counterpart for this run is fictional and responds automatically."
- 10–25s: Show local intake assistance, edit the result, inspect the brief and approve publication. "Private background is processed locally. This exact brief is what I choose to share."
- 25–50s: Show the Premium exact-send preview and a real DeepSeek idea enhancement: target customer, risky assumptions, first product and validation experiment. Show public research sources if time permits. "With separate approval, DeepSeek develops this published brief into a working plan. It never receives my pasted background or local questionnaire answers. Research has its own query approval."
- 50–75s: Open live evidence before the introduction. Approve one side, show omitted `revealedContact`, then show actual second-side approval and the now-present selected contact. "Publication and identity release are different permissions. The server enforces this; the UI isn't just hiding a field."
- 75–85s: Show the working-trial editor. "Once introduced, agree on a concrete experiment and each person's contribution. The trial activates only when both approve the same version."
- 85–90s: "Develop the idea. Find someone worth building with. Decide what to share."

Warm the presentation browser in advance. Have a completed, genuine DeepSeek result ready if a live provider call is slow; identify it as an earlier result rather than pretending it just generated. Never describe the scripted demo response as genuine human interest.

## Repeated fixed demo founders or stalled demo replies

`BASE_URL=http://localhost:3002 pnpm exec tsx scripts/demo/repair.ts` reconnects only exact built-in fictional fixtures (expected demo name, example.com contact, alias, complete skill/topic sets, availability and blurb). It preserves an existing pending pair where possible, restores a lost fixture session, and unpublishes redundant fixture briefs. Prior revealed contacts and receipts remain. It does not copy any human approval between pairs. The seed script now reuses those exact existing fixtures before creating anything new, including across a lost local session file.

The founder list shows one card per participant, prioritizing a pending introduction, with the matched idea labelled. Select a particular idea to inspect its pairing. Display grouping never merges contact fields or consent across records.

The normal Privacy check shows plain approval and sharing status. Full endpoint details and JSON are collapsed under Technical proof. Opening the check after reveal records only the two-approval state; it does not fabricate earlier responses.
