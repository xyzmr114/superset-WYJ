Anusha's match / reveal components.

- `MatchCard.tsx` — one candidate: complementary skills, source-linked
  opportunity, uncertainties, local checklist, and consent/reveal controls.
  Reveal reads `match.revealedContact` only; a simulated reveal is badged
  SYNTHETIC DEMO.
- `JumpChecklist.tsx` — renders the purely local "Would I jump?" checklist.
- `EvidenceList.tsx` — public evidence with an explicit empty/fallback state.
- `matches.module.css` — scoped styles.

Composed in `app/matches/page.tsx`.
