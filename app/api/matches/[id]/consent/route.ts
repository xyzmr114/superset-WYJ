import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';
import { getMyMatch, toView } from '@/lib/server/matches';

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const me = requireSession(req);
  const m = getMyMatch((await ctx.params).id, me.id);
  const { decision } = await parseBody(req, z.object({ decision: z.enum(['approve', 'decline']) }));
  if (decision === 'approve') {
    if (m.declinedBy) throw new HttpError(409, 'DECLINED', 'This match was declined.');
    m.approvals.add(me.id); // Set: repeat clicks are no-ops
  } else {
    if (m.approvals.has(m.a) && m.approvals.has(m.b)) throw new HttpError(409, 'ALREADY_REVEALED', 'Already revealed.');
    m.declinedBy ??= me.id;
  }
  return NextResponse.json(toView(m, me.id));
});
