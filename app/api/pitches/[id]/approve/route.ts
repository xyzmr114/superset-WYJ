import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';
import { type Ctx, conflict, myPitch, toView } from '@/lib/server/pitches';

export const POST = route(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const me = requireSession(req);
  const { pitch, match } = myPitch((await ctx.params).id, me.id);
  const { version } = await parseBody(req, z.object({ version: z.number().int() }));
  if (version !== pitch.version) throw conflict('STALE_VERSION', 'That version is no longer current.');
  pitch.approvedVersion[me.id] = version;
  return NextResponse.json(toView(pitch, match, me.id));
});
