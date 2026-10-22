import type { Evidence, MatchView } from '@/lib/contracts';
import { searchPublicProjects } from '@/lib/evidence/github';
import { cardRow, matchRow, q, type Match } from './store';
import { notFound } from './http';

/** Public evidence for approved tags. Vernika's adapter caches 15 min and falls back to a labeled
 *  snapshot itself; any unexpected failure still yields [] (never invented evidence). */
export async function evidenceFor(tags: string[]): Promise<Evidence[]> {
  try {
    return (await searchPublicProjects(tags)).evidence;
  } catch {
    return [];
  }
}

export const pairKey = (x: string, y: string) => (x < y ? [x, y] : [y, x]) as [string, string];
export const otherOf = (m: Match, me: string) => (m.a === me ? m.b : m.a);
/** Column prefix for my side of a match. Only ever 'a' or 'b', so it is safe to put in SQL. */
export const sideOf = (m: Match, me: string) => (m.a === me ? 'a' : 'b');

export const myMatches = async (me: string) =>
  (await q('select * from matches where a = $1 or b = $1 order by score desc, created_at', [me])).map(matchRow);

/** 404 (never 403) if the match is missing or I'm not in it. */
export async function getMyMatch(id: string, me: string): Promise<Match> {
  const [r] = await q('select * from matches where id = $1 and (a = $2 or b = $2)', [id, me]);
  if (!r) throw notFound();
  return matchRow(r);
}

export async function toView(m: Match, me: string): Promise<MatchView> {
  const other = otherOf(m, me);
  const candidate = cardRow((await q('select * from cards where participant_id = $1', [other]))[0]);
  const revealed = !m.declinedBy && m.approvals.has(m.a) && m.approvals.has(m.b);
  const view: MatchView = {
    id: m.id, candidate, score: m.score, opportunity: m.opportunity, evidence: m.evidence,
    status: m.declinedBy ? 'declined' : revealed ? 'revealed' : m.approvals.size > 0 ? 'pending' : 'suggested',
    myIntroApproval: m.approvals.has(me),
  };
  // Identity is read only here, only on mutual approval.
  if (revealed) {
    const [id] = await q('select display_name, contact from identities where participant_id = $1', [other]);
    view.revealedContact = id ? { displayName: id.display_name, contact: id.contact } : { displayName: candidate.alias, contact: 'not provided' };
  }
  return view;
}

export const views = (ms: Match[], me: string) => Promise.all(ms.map((m) => toView(m, me)));
