import { q, type Identity } from '@/lib/server/store';
import { HttpError, requireSession, route } from '@/lib/server/http';
import { type Ctx, myPitch, toView } from '@/lib/server/pitches';

export const GET = route(async (req, ctx: Ctx) => {
  const me = await requireSession(req);
  const { pitch, match } = await myPitch((await ctx.params).id, me.id);
  if (!toView(pitch, match, me.id).bothApproved) throw new HttpError(403, 'NOT_APPROVED', 'Both participants must approve the current version.');
  const rows = await q('select participant_id, display_name, contact from identities where participant_id = any($1)', [[match.a, match.b]]);
  // Each person's details appear only if that person chose to include them.
  const founders = [match.a, match.b].flatMap((pid) => {
    const r = rows.find((x) => x.participant_id === pid);
    const id: Identity | undefined = r && { displayName: r.display_name, contact: r.contact };
    const fields = (pitch.identityFields[pid] ?? []) as (keyof Identity)[];
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
