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
  `localClassifier.ts`, which only talks to a loopback URL set in
  `NEXT_PUBLIC_LOCAL_CLASSIFIER_URL` (e.g. `http://127.0.0.1:11435/classify`, body `{text}`,
  response shaped like the handoff's `LocalClassification`). Unset or unreachable → an honest
  "unavailable" and the manual brief. No hosted fallback. Only labels in `vocabulary.ts` pass.
- `CardEditor.tsx` accepts a `suggestion` to prefill offers/seeks/interests. Approval is tied to
  the exact preview; any edit clears it.
- `DataBoundary.tsx` — the visible device / room / sealed tiers from PIVOT.md.
- Name/contact are still sent via `PUT /api/me/identity` before publish until the per-pair
  consent snapshot lands on the backend.
