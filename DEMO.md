# WYJ demo — two founders, two independent decisions

Current product: see `PIVOT.md`. Roles and implementation ownership: see `WOULD_YOU_JUMP_HANDOFF.md`.

## Story

“Two people in this room want to build related things. Their private agents find a reason to talk without publishing their full profiles or their plans to leave work.”

## Five-minute walkthrough

1. Open two independent browser sessions as Founder A and Founder B. Join the same event; do not use two tabs sharing one session cookie.
2. A privately describes engineering experience and an agent travel-booking idea. Add a recognizable private constraint to demonstrate the boundary.
3. Run local classification if the checkpoint has been verified. Show the runtime and editable labels. If unavailable, enter the same brief fields manually and say that classification is unavailable; do not present a template as model inference.
4. Show exactly what leaves the device: alias, selected skill/problem tags, coarse availability and approved blurb. Publish only after the preview approval.
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

The current server store is process memory. Avoid restarting it between the two participants joining and revealing. Rehearse with actual independently controlled sessions; do not simulate the other person's consent.

## Implemented match/reveal rehearsal

Use `/matches` in independent browsers after publishing the briefs. Interested opens a preview without submitting consent. Enter the exact chosen name/contact, check the pair-specific approval, and submit. Show the waiting screen and optionally withdraw. Independently approve in the second browser; the first screen updates automatically. Use Introduced to focus the pair, then Build a joint pitch. Draft generation and export approval remain separate steps.

Live API verification: `pnpm exec tsx scripts/acceptance-pivot.ts http://localhost:3002` creates isolated test participants and checks 21 conditions including one-sided JSON privacy, outsider denial, withdrawal, immutable snapshots and the pitch gate. It adds test briefs to the running in-memory room. Run only against your development server.

The match/reveal browser walkthrough passed. The current `/agent` is still the legacy screen until Anusha lands the private workspace. Laya inference is not part of the verified walkthrough yet.
