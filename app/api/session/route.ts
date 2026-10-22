import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/store';
import { HttpError, SESSION_COOKIE, assertSameOrigin, hashToken, newId, newToken, parseBody, route } from '@/lib/server/http';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { eventCode } = await parseBody(req, z.object({ eventCode: z.string().min(1).max(64) }));
  const eventId = db.events.get(eventCode.trim().toUpperCase());
  if (!eventId) throw new HttpError(404, 'NOT_FOUND', 'Unknown event code.');
  const id = newId();
  const token = newToken();
  db.participants.set(id, { id, eventId, tokenHash: hashToken(token) });
  db.sessions.set(hashToken(token), id);
  const res = NextResponse.json({ participantId: id, eventId });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
});
