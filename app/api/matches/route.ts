import { NextResponse } from 'next/server';
import { requireSession, route } from '@/lib/server/http';
import { myMatches, views } from '@/lib/server/matches';

export const GET = route(async (req) => {
  const me = await requireSession(req);
  return NextResponse.json({ matches: await views(await myMatches(me.id), me.id) });
});
