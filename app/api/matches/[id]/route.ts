import { NextResponse } from 'next/server';
import { requireSession, route } from '@/lib/server/http';
import { getMyMatch, toView } from '@/lib/server/matches';

export const GET = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const me = requireSession(req);
  return NextResponse.json(toView(getMyMatch((await ctx.params).id, me.id), me.id));
});
