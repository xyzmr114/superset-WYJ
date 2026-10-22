import { NextResponse } from 'next/server';
import { cardRow, q } from '@/lib/server/store';
import { HttpError, assertSameOrigin, newId, requireSession, route } from '@/lib/server/http';
import { evidenceFor, myMatches, otherOf, pairKey, views } from '@/lib/server/matches';
import { rankCandidates } from '@/lib/matching';
import { generateOpportunity } from '@/lib/generation/model';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const me = await requireSession(req);
  const [mineRow] = await q('select * from cards where participant_id = $1', [me.id]);
  if (!mineRow) throw new HttpError(409, 'NO_CARD', 'Publish your card first.');
  const mine = cardRow(mineRow);
  const existing = await myMatches(me.id);
  const paired = new Set(existing.map((m) => otherOf(m, me.id)));
  const declined = new Set(existing.filter((m) => m.declinedBy).map((m) => otherOf(m, me.id)));
  const others = (await q('select * from cards where event_id = $1 and participant_id <> $2', [me.eventId, me.id]))
    .map(cardRow).filter((c) => !declined.has(c.id));
  for (const { candidate, score } of rankCandidates(mine, others)) {
    if (paired.has(candidate.id)) continue; // idempotent
    const shared = mine.interests.filter((x) => candidate.interests.includes(x));
    const evidence = await evidenceFor(shared.length ? shared : mine.interests);
    // Never throws: model draft if MODEL_API_* is set, otherwise a labeled template. Cites only supplied evidence.
    const opportunity = await generateOpportunity(mine, candidate, evidence, { timeoutMs: 8000 });
    const [a, b] = pairKey(me.id, candidate.id);
    // unique (a, b): a concurrent request that created the pair first wins.
    await q(
      `insert into matches (id, event_id, a, b, score, opportunity, evidence)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb) on conflict (a, b) do nothing`,
      [newId(), me.eventId, a, b, score, JSON.stringify(opportunity), JSON.stringify(evidence)],
    );
  }
  return NextResponse.json({ matches: await views(await myMatches(me.id), me.id) });
});
