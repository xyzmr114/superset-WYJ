import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';
import { type Ctx, conflict, myPitch, toView } from '@/lib/server/pitches';

const Body = z.object({
  expectedVersion: z.number().int(),
  markdown: z.string().max(20000),
  proposedIdentityFields: z.record(z.string(), z.array(z.string())),
});

export const GET = route(async (req, ctx: Ctx) => {
  const me = requireSession(req);
  const { pitch, match } = myPitch((await ctx.params).id, me.id);
  return NextResponse.json(toView(pitch, match, me.id));
});

export const PUT = route(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const me = requireSession(req);
  const { pitch, match } = myPitch((await ctx.params).id, me.id);
  const body = await parseBody(req, Body);
  if (body.expectedVersion !== pitch.version) throw conflict('VERSION_CONFLICT', 'A newer version was saved. Load it first.');
  // Only my own entry counts, so nobody can change the other person's fields.
  const mine = (body.proposedIdentityFields.me ?? []).filter((f) => f === 'displayName' || f === 'contact');
  pitch.identityFields[me.id] = [...new Set(mine)];
  pitch.version += 1;
  pitch.markdown = body.markdown;
  pitch.approvedVersion = {};
  return NextResponse.json(toView(pitch, match, me.id));
});
