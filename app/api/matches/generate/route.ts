import { NextResponse } from 'next/server';
import { db } from '@/lib/server/store';
import { HttpError, assertSameOrigin, newId, requireSession, route } from '@/lib/server/http';
import { evidenceFor, findPair, myMatches, pairKey, toView } from '@/lib/server/matches';
import { rankCandidates } from '@/lib/matching';
import { proposeOpportunity } from '@/lib/generation';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const me = requireSession(req);
  const mine = db.cards.get(me.id);
  if (!mine) throw new HttpError(409, 'NO_CARD', 'Publish your card first.');
  const others = [...db.cards.values()].filter((c) => c.eventId === me.eventId && c.id !== me.id && !findPair(me.id, c.id)?.declinedBy);
  for (const { candidate, score } of rankCandidates(mine, others)) {
    if (findPair(me.id, candidate.id)) continue; // idempotent
    const domain = mine.interests.find((x) => candidate.interests.includes(x)) ?? mine.interests[0];
    const evidence = await evidenceFor(domain);
    if (findPair(me.id, candidate.id)) continue; // a concurrent request created it while we awaited
    const opportunity = { ...proposeOpportunity(mine, candidate), evidenceIds: evidence.map((e) => e.id) };
    const [a, b] = pairKey(me.id, candidate.id);
    const id = newId();
    db.matches.set(id, { id, eventId: me.eventId, a, b, score, opportunity, evidence, approvals: new Set(), declinedBy: null });
  }
  return NextResponse.json({ matches: myMatches(me.id).map((m) => toView(m, me.id)) });
});
