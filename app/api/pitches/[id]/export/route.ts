import { db, type Identity } from '@/lib/server/store';
import { HttpError, requireSession, route } from '@/lib/server/http';
import { type Ctx, myPitch, toView } from '@/lib/server/pitches';

export const GET = route(async (req, ctx: Ctx) => {
  const me = requireSession(req);
  const { pitch, match } = myPitch((await ctx.params).id, me.id);
  if (!toView(pitch, match, me.id).bothApproved) throw new HttpError(403, 'NOT_APPROVED', 'Both participants must approve the current version.');
  // Each person's details appear only if that person chose to include them.
  const founders = [match.a, match.b].flatMap((pid) => {
    const fields = (pitch.identityFields[pid] ?? []) as (keyof Identity)[];
    const id = db.identities.get(pid);
    const parts = id ? fields.map((f) => id[f]).filter(Boolean) : [];
    return parts.length ? [`- ${parts.join(' · ')}`] : [];
  });
  const body = pitch.markdown.trimEnd() + (founders.length ? `\n\n## Founders\n${founders.join('\n')}\n` : '\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="would-you-jump-pitch-v${pitch.version}.md"`,
    },
  });
});
