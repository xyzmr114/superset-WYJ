import type { PitchView } from '@/lib/contracts';
import { buildPitchMarkdown } from '@/lib/generation';
import { cardRow, pitchRow, q, type Match, type Pitch } from './store';
import { HttpError, notFound } from './http';
import { getMyMatch, otherOf } from './matches';

export type Ctx = { params: Promise<{ id: string }> };

export const isRevealed = (m: Match) => m.declinedBy === null && m.approvals.has(m.a) && m.approvals.has(m.b);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);
export { getMyMatch as myMatch, otherOf };

export async function myPitch(id: string, me: string): Promise<{ pitch: Pitch; match: Match }> {
  const [r] = await q('select * from pitches where id = $1', [id]);
  if (!r) throw notFound();
  const match = await getMyMatch(r.match_id, me); // 404 for anyone outside the match
  return { pitch: pitchRow(r, match), match };
}

export function toView(p: Pitch, m: Match, me: string): PitchView {
  const them = otherOf(m, me);
  const bothApproved = p.approvedVersion[me] === p.version && p.approvedVersion[them] === p.version;
  return {
    id: p.id, matchId: p.matchId, version: p.version, markdown: p.markdown,
    proposedIdentityFields: { me: p.identityFields[me] ?? [], them: p.identityFields[them] ?? [] },
    myApproval: p.approvedVersion[me] === p.version, bothApproved, exportable: bothApproved,
  };
}

/** Draft built only from matching cards, opportunity and cited evidence (Vernika's builder). No names or contacts. */
export async function draftMarkdown(m: Match): Promise<string> {
  const rows = await q('select * from cards where participant_id = any($1)', [[m.a, m.b]]);
  const card = (id: string) => cardRow(rows.find((r) => r.participant_id === id));
  return buildPitchMarkdown({ founders: [card(m.a), card(m.b)] }, m.opportunity, m.evidence);
}
