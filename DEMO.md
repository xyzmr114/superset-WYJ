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
