import { NextResponse } from 'next/server';
import { db } from '@/lib/server/store';
import { HttpError, assertSameOrigin, newId, requireSession, route } from '@/lib/server/http';
import { evidenceFor, findPair, myMatches, pairKey, toView } from '@/lib/server/matches';
import { rankCandidates } from '@/lib/matching';
import { generateOpportunity } from '@/lib/generation/model';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const me = requireSession(req);
  const mine = db.cards.get(me.id);
  if (!mine) throw new HttpError(409, 'NO_CARD', 'Publish your card first.');
  const others = [...db.cards.values()].filter((c) => c.eventId === me.eventId && c.id !== me.id && !findPair(me.id, c.id)?.declinedBy);
  for (const { candidate, score } of rankCandidates(mine, others)) {
    if (findPair(me.id, candidate.id)) continue; // idempotent
    const shared = mine.interests.filter((x) => candidate.interests.includes(x));
    const evidence = await evidenceFor(shared.length ? shared : mine.interests);
    // Never throws: model draft if MODEL_API_* is set, otherwise a labeled template. Cites only supplied evidence.
    const opportunity = await generateOpportunity(mine, candidate, evidence, { timeoutMs: 8000 });
    if (findPair(me.id, candidate.id)) continue; // a concurrent request created it while we awaited
    const [a, b] = pairKey(me.id, candidate.id);
    const id = newId();
    db.matches.set(id, { id, eventId: me.eventId, a, b, score, opportunity, evidence, approvals: new Set(), declinedBy: null });
  }
  return NextResponse.json({ matches: myMatches(me.id).map((m) => toView(m, me.id)) });
});
