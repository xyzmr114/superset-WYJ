import { NextResponse } from 'next/server';
import { z } from 'zod';
import { EVENT_CODE, EVENT_ID, q } from '@/lib/server/store';
import { HttpError, SESSION_COOKIE, assertSameOrigin, hashToken, newId, newToken, parseBody, route } from '@/lib/server/http';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { eventCode } = await parseBody(req, z.object({ eventCode: z.string().min(1).max(64) }));
  if (eventCode.trim().toUpperCase() !== EVENT_CODE) throw new HttpError(404, 'NOT_FOUND', 'Unknown event code.');
  const id = newId();
  const token = newToken();
  await q('insert into participants (id, event_id, token_hash) values ($1, $2, $3)', [id, EVENT_ID, hashToken(token)]);
  const res = NextResponse.json({ participantId: id, eventId: EVENT_ID });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
});
