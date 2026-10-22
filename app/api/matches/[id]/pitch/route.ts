import { NextResponse } from 'next/server';
import { pitchRow, q } from '@/lib/server/store';
import { assertSameOrigin, newId, requireSession, route } from '@/lib/server/http';
import { type Ctx, conflict, draftMarkdown, isRevealed, myMatch, toView } from '@/lib/server/pitches';

export const POST = route(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const me = await requireSession(req);
  const match = await myMatch((await ctx.params).id, me.id);
  if (!isRevealed(match)) throw conflict('NOT_REVEALED', 'Both of you must approve the intro first.');
  // unique (match_id): both founders clicking at once still share one draft.
  await q('insert into pitches (id, match_id, markdown) values ($1, $2, $3) on conflict (match_id) do nothing', [newId(), match.id, await draftMarkdown(match)]);
  const [row] = await q('select * from pitches where match_id = $1', [match.id]);
  return NextResponse.json(toView(pitchRow(row, match), match, me.id));
});
