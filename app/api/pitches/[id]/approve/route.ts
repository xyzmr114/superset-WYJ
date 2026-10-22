import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pitchRow, q } from '@/lib/server/store';
import { assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';
import { sideOf } from '@/lib/server/matches';
import { type Ctx, conflict, myPitch, toView } from '@/lib/server/pitches';

export const POST = route(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const me = await requireSession(req);
  const { pitch, match } = await myPitch((await ctx.params).id, me.id);
  const { version } = await parseBody(req, z.object({ version: z.number().int() }));
  // Approves only if `version` is still current; an edit racing this approval makes it a no-op + 409.
  const [row] = await q(
    `update pitches set ${sideOf(match, me.id)}_approved_version = version where id = $1 and version = $2 returning *`,
    [pitch.id, version],
  );
  if (!row) throw conflict('STALE_VERSION', 'That version is no longer current.');
  return NextResponse.json(toView(pitchRow(row, match), match, me.id));
});
