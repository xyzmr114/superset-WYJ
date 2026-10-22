import { NextResponse } from 'next/server';
import { z } from 'zod';
import { EVENT_CODE, EVENT_ID, q } from '@/lib/server/store';
import { HttpError, SESSION_COOKIE, sessionCookieName, sessionToken, assertSameOrigin, hashToken, requireSession, newId, newToken, parseBody, route } from '@/lib/server/http';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { eventCode } = await parseBody(req, z.object({ eventCode: z.string().min(1).max(64).default(EVENT_CODE) }));
  if (eventCode.trim().toUpperCase() !== EVENT_CODE) throw new HttpError(404, 'NOT_FOUND', 'Unknown event code.');
  try{const existing=await requireSession(req);const res=NextResponse.json({participantId:existing.id,eventId:existing.eventId},{headers:{'Cache-Control':'no-store'}});const token=sessionToken(req);if(token)res.cookies.set(sessionCookieName(req),token,{httpOnly:true,sameSite:'lax',path:'/',maxAge:60*60*24*30,secure:process.env.NODE_ENV==='production'});return res;}catch(error){if(!(error instanceof HttpError)||error.status!==401)throw error;}
  const id = newId();
  const token = newToken();
  await q('insert into participants (id, event_id, token_hash) values ($1, $2, $3)', [id, EVENT_ID, hashToken(token)]);
  const res = NextResponse.json({ participantId: id, eventId: EVENT_ID },{headers:{'Cache-Control':'no-store'}});
  res.cookies.set(sessionCookieName(req), token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
});
