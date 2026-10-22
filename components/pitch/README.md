> **Current pivot · 22 October 2026:** Read [PIVOT.md](../../PIVOT.md) and the [four-person handoff](../../WOULD_YOU_JUMP_HANDOFF.md). Private founder matchmaking is the current product. Older module notes below are implementation references; the current pivot and ownership take precedence.

# Pitch workspace integration

Owned by the integration lead. `/pitch` runs a local review-flow example. `/pitch?from=agent` opens the personal solution memo editor from WYJ chat, with tab persistence, preview, copy, and download. `/pitch?pitchId=ID` reads a real draft; `/pitch?matchId=ID` offers a button to create/reuse one. All live calls use the shared cookie-authenticated API contract. There is no automatic fallback from live mode to simulated approvals.

## Abhinav handoff

Return complete `PitchView` values from create/read/save/approve. Enforce session ownership on every endpoint. Create requires a mutually revealed match. PUT uses `expectedVersion`; reject stale versions with 409 and clear approvals on edits. POST approve includes the current `version`; reject stale approval. GET export must check both approvals on the current version and return Markdown text, not JSON. Return 403 for unauthorized export. Never trust `exportable` or approval flags from the client.

The UI preserves server-provided `proposedIdentityFields` but does not implement identity-field selection. Select those through an owner-authorized backend flow; display full disclosure values in the draft so approvers can review the actual content. Do not append unreviewed identity content during export. Backend must validate that the other participant's fields have not been changed in PUT.

Polling runs every 3 seconds. A new server version does not overwrite unsaved edits; saving/approval is blocked until the user loads the latest version. Errors leave the draft intact. Export is reauthorized on the server. No outreach or submission occurs.

## Anusha handoff

After real mutual reveal, link to `/pitch?matchId=${encodeURIComponent(match.id)}`. Do not use the bare `/pitch` route for real matches; that route is the local review example.

## Vernika handoff

Draft content should include problem hypothesis, target customer, team complementarity, evidence links, validation experiment, super{set} fit hypothesis, and unknowns. No private intake or inferred personal claims. Supply generated Markdown through Abhinav's create endpoint.

## Verification

`pnpm test` includes demo approval-invalidation checks. UI integration must additionally verify stale PUT/approval rejection, unauthorized reads/exports, and two independent browser sessions against the real backend. Frontend simulation does not establish those guarantees.

## Personal memo flow

`WorkingDraft.tsx` owns the personal editor. `lib/agent/workspace.ts` validates tab state and keeps edits when the same generated memo is reopened. It never creates a shared server pitch or manufactures participant approvals. Do not use `from=agent` for an actual two-founder pitch; use `pitchId` or `matchId`. The shared route takes precedence if either ID is present. Agent chat and working drafts stay in sessionStorage, not the matching-card or private-intake stores.
