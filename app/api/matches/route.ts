import { NextResponse } from 'next/server';
import { requireSession, route } from '@/lib/server/http';
import { myMatches, toView } from '@/lib/server/matches';

export const GET = route(async (req) => {
  const me = requireSession(req);
  return NextResponse.json({ matches: myMatches(me.id).map((m) => toView(m, me.id)) });
});
