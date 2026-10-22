import { NextResponse } from 'next/server';
import { z } from 'zod';
import { matchRow, q } from '@/lib/server/store';
import { HttpError, assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';
import { getMyMatch, sideOf, toView } from '@/lib/server/matches';

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const me = await requireSession(req);
  const m = await getMyMatch((await ctx.params).id, me.id);
  const { decision } = await parseBody(req, z.object({ decision: z.enum(['approve', 'decline']) }));
  // Each update checks its precondition in the WHERE, so concurrent approve/decline can't both win.
  if (decision === 'approve') {
    const [row] = await q(`update matches set ${sideOf(m, me.id)}_approved = true where id = $1 and declined_by is null returning *`, [m.id]);
    if (!row) throw new HttpError(409, 'DECLINED', 'This match was declined.');
    return NextResponse.json(await toView(matchRow(row), me.id));
  }
  const [row] = await q('update matches set declined_by = coalesce(declined_by, $2) where id = $1 and not (a_approved and b_approved) returning *', [m.id, me.id]);
  if (!row) throw new HttpError(409, 'ALREADY_REVEALED', 'Already revealed.');
  return NextResponse.json(await toView(matchRow(row), me.id));
});
