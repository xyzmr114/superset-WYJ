import { NextResponse } from 'next/server';
import { z } from 'zod';
import { matchRow, q, type Identity } from '@/lib/server/store';
import { HttpError, assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';
import { getMyMatch, sideOf, toView } from '@/lib/server/matches';

const Body = z.object({
  decision: z.enum(['approve', 'decline']),
  // What this approval releases to this one counterpart. Optional: defaults to my profile as it is right now.
  identity: z.object({
    displayName: z.string().trim().min(1).max(80),
    contact: z.string().trim().min(1).max(200),
  }).optional(),
});

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const me = await requireSession(req);
  const m = await getMyMatch((await ctx.params).id, me.id);
  const { decision, identity } = await parseBody(req, Body);
  // Each update checks its precondition in the WHERE, so concurrent approve/decline can't both win.
  if (decision === 'approve') {
    if (m.declinedBy) throw new HttpError(409, 'DECLINED', 'This match was declined.');
    if (m.approvals.has(me.id)) return NextResponse.json(await toView(m, me.id)); // never replace an approved snapshot
    let snapshot: Identity | undefined = identity;
    if (!snapshot) {
      const [r] = await q('select display_name, contact from identities where participant_id = $1', [me.id]);
      snapshot = r && { displayName: r.display_name, contact: r.contact };
    }
    if (!snapshot) throw new HttpError(400, 'IDENTITY_REQUIRED', 'Choose the name and contact to reveal for this introduction.');
    const s = sideOf(m, me.id); // 'a' | 'b' only
    const [row] = await q(
      `update matches set ${s}_approved = true, ${s}_identity = $2::jsonb, ${s}_approved_at = now(),
         ${s}_card_version = (select version from cards where participant_id = $3)
       where id = $1 and declined_by is null and not ${s}_approved returning *`,
      [m.id, JSON.stringify(snapshot), me.id],
    );
    if (row) return NextResponse.json(await toView(matchRow(row), me.id));
    const fresh = await getMyMatch(m.id, me.id); // lost a race: declined, or a parallel approve won
    if (fresh.declinedBy) throw new HttpError(409, 'DECLINED', 'This match was declined.');
    return NextResponse.json(await toView(fresh, me.id));
  }
  // Declining before the reveal also discards both released snapshots.
  const [row] = await q(
    `update matches set declined_by = coalesce(declined_by, $2), a_identity = null, b_identity = null
     where id = $1 and not (a_approved and b_approved) returning *`,
    [m.id, me.id],
  );
  if (!row) throw new HttpError(409, 'ALREADY_REVEALED', 'Already revealed.');
  return NextResponse.json(await toView(matchRow(row), me.id));
});
