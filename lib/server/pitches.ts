import type { MatchingCard, PitchView } from '@/lib/contracts';
import { db, type Match, type Pitch } from './store';
import { HttpError, notFound } from './http';

export type Ctx = { params: Promise<{ id: string }> };

export const isRevealed = (m: Match) => m.declinedBy === null && m.approvals.has(m.a) && m.approvals.has(m.b);
export const otherOf = (m: Match, me: string) => (m.a === me ? m.b : m.a);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);

/** Match I'm in, or 404 (never reveal existence to outsiders). */
export function myMatch(id: string, me: string): Match {
  const m = db.matches.get(id);
  if (!m || (m.a !== me && m.b !== me)) throw notFound();
  return m;
}

export function myPitch(id: string, me: string): { pitch: Pitch; match: Match } {
  const pitch = db.pitches.get(id);
  if (!pitch) throw notFound();
  return { pitch, match: myMatch(pitch.matchId, me) };
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

const list = (xs: string[]) => (xs.length ? xs.join(', ') : 'n/a');
const bullets = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join('\n') : '- None yet.');
const who = (c: MatchingCard | undefined) =>
  c ? `- **${c.alias}** offers ${list(c.offers)}; interested in ${list(c.interests)}.${c.approvedBlurb ? ` "${c.approvedBlurb}"` : ''}` : '- (card unavailable)';

/** Draft built only from matching cards, opportunity and evidence. No names or contacts. */
export function draftMarkdown(m: Match): string {
  const o = m.opportunity;
  const ev = m.evidence.length
    ? m.evidence.map((e) => `- [${e.title}](${e.url}) (fetched ${e.fetchedAt.slice(0, 10)})`).join('\n')
    : 'No live public evidence attached (template mode).';
  return [
    `# ${o.title}`,
    `## Problem hypothesis\n${o.problemHypothesis}`,
    `## Target user\n${o.targetUser}`,
    `## Team complementarity\n${who(db.cards.get(m.a))}\n${who(db.cards.get(m.b))}\n${bullets(o.whyThisPair)}`,
    `## Public evidence\n${ev}`,
    `## First validation experiment\n${o.nextExperiment}`,
    `## super{set} fit\n**Our hypothesis:** this suits the [super{set}](https://superset.com/) studio model of co-founding companies around a validated insight. See the [portfolio](https://superset.com/portfolio) for comparable bets.`,
    `## Unanswered questions\n${bullets(o.unknowns)}`,
  ].join('\n\n') + '\n';
}
