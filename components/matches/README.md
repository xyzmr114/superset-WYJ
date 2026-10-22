> **Current pivot · 22 October 2026:** Read [PIVOT.md](../../PIVOT.md) and the [four-person handoff](../../WOULD_YOU_JUMP_HANDOFF.md). Private founder matchmaking is the current product. Older module notes below are implementation references; the current pivot and ownership take precedence.

Anusha's match / reveal components.

- `MatchCard.tsx` — one candidate: complementary skills, source-linked
  opportunity, uncertainties, local checklist, and consent/reveal controls.
  Reveal reads `match.revealedContact` only; a simulated reveal is badged
  SYNTHETIC DEMO.
- `JumpChecklist.tsx` — renders the purely local "Would I jump?" checklist.
- `EvidenceList.tsx` — public evidence with an explicit empty/fallback state.
- `matches.module.css` — scoped styles.

Composed in `app/matches/page.tsx`.
