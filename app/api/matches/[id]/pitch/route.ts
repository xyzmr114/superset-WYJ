import { NextResponse } from 'next/server';
import { db } from '@/lib/server/store';
import { assertSameOrigin, newId, requireSession, route } from '@/lib/server/http';
import { type Ctx, conflict, draftMarkdown, isRevealed, myMatch, toView } from '@/lib/server/pitches';

export const POST = route(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const me = requireSession(req);
  const match = myMatch((await ctx.params).id, me.id);
  if (!isRevealed(match)) throw conflict('NOT_REVEALED', 'Both of you must approve the intro first.');
  let pitch = [...db.pitches.values()].find((p) => p.matchId === match.id);
  if (!pitch) {
    pitch = { id: newId(), matchId: match.id, version: 1, markdown: draftMarkdown(match), identityFields: {}, approvedVersion: {} };
    db.pitches.set(pitch.id, pitch);
  }
  return NextResponse.json(toView(pitch, match, me.id));
});
