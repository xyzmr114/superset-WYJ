> **Current pivot · 22 October 2026:** Read [PIVOT.md](../../PIVOT.md) and the [four-person handoff](../../WOULD_YOU_JUMP_HANDOFF.md). Private founder matchmaking is the current product. Older module notes below are implementation references; the current pivot and ownership take precedence.

Anusha's reusable intake components.

- `PrivateIntake.tsx` — the private panel. Reads/writes the in-memory private
  profile only (`lib/client/private-profile.ts`); never published or persisted.
- `CardEditor.tsx` — the separate, explicit matching-card editor with a
  live "exactly what will be shared" preview and publication consent.
- `TagSelect.tsx` — controlled multi-select chips over the frozen vocabularies.
- `onboarding.module.css` — scoped styles (does not touch global shell styles).

Composed in `app/onboarding/page.tsx`.

## Pivot workspace (Anusha)

`/agent` (and `/onboarding`, kept for old links) render `components/private/PrivateWorkspace.tsx`:

- `ProfilePanel.tsx` — your own pasted profile, held in tab memory. "Suggest labels" calls
  `classifyLocally` from `lib/private/classifier-contract.ts` (loopback only, allowlisted labels,
  no hosted fallback). Unavailable → the manual brief.
- `CardEditor.tsx` accepts a `suggestion` to prefill offers/seeks/interests (and availability
  only when stated). Approval is tied to the exact preview; any edit clears it.
- `DataBoundary.tsx` — the visible device / room / sealed tiers from PIVOT.md.
- No name/contact is collected here; it is chosen per pairing on the match card.
