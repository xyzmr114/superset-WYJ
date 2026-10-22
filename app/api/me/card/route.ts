import { NextResponse } from 'next/server';
import { db, isFrozen } from '@/lib/server/store';
import { HttpError, assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';
import {Card} from '@/lib/server/brief-schema';
import {hasIdeaCollection} from '@/lib/server/ideas';


export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const me = requireSession(req);
  const { publishConsent: _consent, ...fields } = await parseBody(req, Card);
  if(hasIdeaCollection(me.id))throw new HttpError(409,'USE_IDEAS','Publish a new approved idea from your idea workspace.');
  // Frozen once matched, so nobody consents to one card and gets shown another.
  if (isFrozen(me.id)) throw new HttpError(409, 'CARD_FROZEN', 'Your card is locked after matching.');
  const prev = db.cards.get(me.id);
  const card = { ...fields, id: me.id, eventId: me.eventId, version: (prev?.version ?? 0) + 1 };
  db.cards.set(me.id, card);
  return NextResponse.json(card);
});
