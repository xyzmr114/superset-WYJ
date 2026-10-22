import { NextResponse } from 'next/server';
import { cardRow, transaction } from '@/lib/server/store';
import { HttpError, assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';
import {Card} from '@/lib/server/brief-schema';
import {hasIdeaCollection} from '@/lib/server/ideas';

export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const me = await requireSession(req);
  const c = await parseBody(req, Card);
  const card=await transaction(async query=>{
    await query('select id from participants where id=$1 for update',[me.id]);
    if(await hasIdeaCollection(me.id,query))throw new HttpError(409,'USE_IDEAS','Publish a new approved idea from your idea workspace.');
    // Frozen once matched, so nobody consents to one card and gets shown another.
    const [row] = await query(
      `insert into cards (participant_id, event_id, alias, offers, seeks, interests, availability, approved_blurb, preferences)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       on conflict (participant_id) do update set
         alias = excluded.alias, offers = excluded.offers, seeks = excluded.seeks, interests = excluded.interests,
         availability = excluded.availability, approved_blurb = excluded.approved_blurb, preferences = excluded.preferences, version = cards.version + 1
       where not exists (select 1 from matches where a = $1 or b = $1)
       returning *`,
      [me.id, me.eventId, c.alias, c.offers, c.seeks, c.interests, c.availability, c.approvedBlurb, JSON.stringify(c.preferences??null)],
    );
    if (!row) throw new HttpError(409, 'CARD_FROZEN', 'Your card is locked after matching.');
    return cardRow(row);
  });
  return NextResponse.json(card);
});
