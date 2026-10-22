import { NextResponse } from 'next/server';
import { z } from 'zod';
import { INTERESTS, SKILLS } from '@/lib/contracts';
import { cardRow, q } from '@/lib/server/store';
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
  const me = await requireSession(req);
  const c = await parseBody(req, Card);
  // Frozen once matched, so nobody consents to one card and gets shown another.
  // The WHERE on the update makes the check and the write one atomic statement.
  const [row] = await q(
    `insert into cards (participant_id, event_id, alias, offers, seeks, interests, availability, approved_blurb)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (participant_id) do update set
       alias = excluded.alias, offers = excluded.offers, seeks = excluded.seeks, interests = excluded.interests,
       availability = excluded.availability, approved_blurb = excluded.approved_blurb, version = cards.version + 1
     where not exists (select 1 from matches where a = $1 or b = $1)
     returning *`,
    [me.id, me.eventId, c.alias, c.offers, c.seeks, c.interests, c.availability, c.approvedBlurb],
  );
  if (!row) throw new HttpError(409, 'CARD_FROZEN', 'Your card is locked after matching.');
  return NextResponse.json(cardRow(row));
});
