import { NextResponse } from 'next/server';
import { z } from 'zod';
import { INTERESTS, SKILLS } from '@/lib/contracts';
import { db, isFrozen } from '@/lib/server/store';
import { HttpError, assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';

const Card = z.object({
  alias: z.string().trim().min(1).max(40),
  offers: z.array(z.enum(SKILLS)).min(1).max(5),
  seeks: z.array(z.enum(SKILLS)).min(1).max(5),
  interests: z.array(z.enum(INTERESTS)).min(1).max(4),
  availability: z.enum(['exploring', 'weekends', 'full_time']),
  approvedBlurb: z.string().trim().max(280),
  publishConsent: z.literal(true), // explicit opt-in to publish this card for matching
});

export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const me = requireSession(req);
  const { publishConsent: _consent, ...fields } = await parseBody(req, Card);
  // Frozen once matched, so nobody consents to one card and gets shown another.
  if (isFrozen(me.id)) throw new HttpError(409, 'CARD_FROZEN', 'Your card is locked after matching.');
  const prev = db.cards.get(me.id);
  const card = { ...fields, id: me.id, eventId: me.eventId, version: (prev?.version ?? 0) + 1 };
  db.cards.set(me.id, card);
  return NextResponse.json(card);
});
