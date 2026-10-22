import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pitchRow, q } from '@/lib/server/store';
import { assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';
import { sideOf } from '@/lib/server/matches';
import { type Ctx, conflict, myPitch, toView } from '@/lib/server/pitches';

const Body = z.object({
  expectedVersion: z.number().int(),
  markdown: z.string().max(20000),
  proposedIdentityFields: z.record(z.string(), z.array(z.string())),
});

export const GET = route(async (req, ctx: Ctx) => {
  const me = await requireSession(req);
  const { pitch, match } = await myPitch((await ctx.params).id, me.id);
  return NextResponse.json(toView(pitch, match, me.id));
});

export const PUT = route(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const me = await requireSession(req);
  const { pitch, match } = await myPitch((await ctx.params).id, me.id);
  const body = await parseBody(req, Body);
  // Only my own entry counts, so nobody can change the other person's fields.
  const mine = [...new Set((body.proposedIdentityFields.me ?? []).filter((f) => f === 'displayName' || f === 'contact'))];
  // `version = expectedVersion` in the WHERE makes this a compare-and-swap: a stale editor gets 409.
  const [row] = await q(
    `update pitches set version = version + 1, markdown = $3, ${sideOf(match, me.id)}_fields = $4,
       a_approved_version = null, b_approved_version = null
     where id = $1 and version = $2 returning *`,
    [pitch.id, body.expectedVersion, body.markdown, mine],
  );
  if (!row) throw conflict('VERSION_CONFLICT', 'A newer version was saved. Load it first.');
  return NextResponse.json(toView(pitchRow(row, match), match, me.id));
});
