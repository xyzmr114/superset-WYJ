import { mutuallyApproved } from './intro-consent';
import type { Evidence, MatchView } from '@/lib/contracts';
import { searchPublicProjects } from '@/lib/evidence/github';
import { cardRow, matchRow, q, type Match } from './store';
import { notFound } from './http';
import {isIdeaPublished} from './ideas';

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
  const match=matchRow(r);
  if(!mutuallyApproved(match)&&(!await isIdeaPublished(match.a,match.aCard?.ideaId)||!await isIdeaPublished(match.b,match.bCard?.ideaId)))throw notFound();
  return match;
}

export async function toView(m: Match, me: string): Promise<MatchView> {
  const other = otherOf(m, me);
  const cards = m.aCard && m.bCard ? [] : await q('select * from cards where participant_id = any($1)', [[m.a, m.b]]);
  const card = (id: string) => (id === m.a ? m.aCard : m.bCard) ?? cardRow(cards.find(r => r.participant_id === id));
  const candidate = card(other);
  const revealed = mutuallyApproved(m);
  const view: MatchView = {
    id: m.id, myBrief: card(me), candidate, score: m.score, opportunity: m.opportunity, evidence: m.evidence,
    status: m.declinedBy ? 'declined' : revealed ? 'revealed' : m.approvals.size > 0 ? 'pending' : 'suggested',
    myIntroApproval: !!m.introConsents?.[me] && m.approvals.has(me),
    theirIntroApproval: !!m.introConsents?.[other] && m.approvals.has(other),
    ...(m.introConsents?.[me] ? { myConsent: { approvedAt: m.introConsents[me].approvedAt, briefVersion: m.introConsents[me].briefVersion, fields: ['displayName', 'contact'] as const } } : {}),
  };
  // Identity is read only here, only on mutual approval.
  // Only the snapshot the other person approved for this pair, never their current profile.
  if (revealed) view.revealedContact = { ...m.introConsents![other].identity };
  return view;
}

export async function views(ms:Match[],me:string){
 const eligible=await Promise.all(ms.map(async m=>mutuallyApproved(m)||
  await isIdeaPublished(m.a,m.aCard?.ideaId)&&await isIdeaPublished(m.b,m.bCard?.ideaId)));
 return Promise.all(ms.filter((_,index)=>eligible[index]).map(m=>toView(m,me)));
}
