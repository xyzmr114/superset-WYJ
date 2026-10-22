# Match and reveal UI — You + Codex

Read [PIVOT.md](../../PIVOT.md) and the [handoff](../../WOULD_YOU_JUMP_HANDOFF.md).

- `MatchCard.tsx`: approved brief, reasons to meet, consent progress, exact name/contact preview, explicit approval, pass and pending withdrawal. Counterpart details render only from server-gated `revealedContact`; there is no simulated approval control.
- `JumpChecklist.tsx`: local reflection checklist.
- `EvidenceList.tsx`: optional public evidence with an empty state.
- `matches.module.css`: scoped styles, consent preview and responsive layout.

`app/matches/page.tsx` generates pairings, polls status, filters waiting/introduced/passed cards and links a mutually revealed pair to its joint pitch. Shared requests and response types live in `lib/client/api.ts` and `lib/contracts.ts`.
