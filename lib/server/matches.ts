import {mutuallyApproved} from './intro-consent';
import type { Evidence, MatchView } from '@/lib/contracts';
import { searchPublicProjects } from '@/lib/evidence/github';
import { db, type Match } from './store';
import { notFound } from './http';

const evidenceCache = new Map<string, { at: number; items: Evidence[] }>();
const TTL = 15 * 60_000;

/** Public evidence for a domain, cached 15 min. GitHub failures return the labeled saved snapshot; a timeout => [] (never invent evidence). */
export async function evidenceFor(domain: string): Promise<Evidence[]> {
  const hit = evidenceCache.get(domain);
  if (hit && Date.now() - hit.at < TTL) return hit.items.map((e) => ({ ...e, cached: true }));
  try {
    const items = await Promise.race([
      searchPublicProjects([domain]).then((r) => r.evidence),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
    ]);
    evidenceCache.set(domain, { at: Date.now(), items });
    return items;
  } catch {
    return [];
  }
}

export const pairKey = (x: string, y: string) => (x < y ? [x, y] : [y, x]) as [string, string];
export const findPair = (x: string, y: string) => {
  const [a, b] = pairKey(x, y);
  return [...db.matches.values()].find((m) => m.a === a && m.b === b);
};
export const myMatches = (me: string) => [...db.matches.values()].filter((m) => m.a === me || m.b === me);

/** 404 (never 403) if the match is missing or I'm not in it. */
export function getMyMatch(id: string, me: string): Match {
  const m = db.matches.get(id);
  if (!m || (m.a !== me && m.b !== me)) throw notFound();
  return m;
}

export function toView(m: Match, me: string): MatchView {
  const other = m.a === me ? m.b : m.a;
  const candidate = (other===m.a?m.aCard:m.bCard)??db.cards.get(other)!;
  const revealed = mutuallyApproved(m);
  const view: MatchView = {
    id: m.id, myBrief:(me===m.a?m.aCard:m.bCard)??db.cards.get(me), candidate, score: m.score, opportunity: m.opportunity, evidence: m.evidence,
    status: m.declinedBy ? 'declined' : revealed ? 'revealed' : m.approvals.size > 0 ? 'pending' : 'suggested',
    myIntroApproval: !!m.introConsents?.[me]&&m.approvals.has(me),
    theirIntroApproval: !!m.introConsents?.[other]&&m.approvals.has(other),
    ...(m.introConsents?.[me]?{myConsent:{approvedAt:m.introConsents[me].approvedAt,briefVersion:m.introConsents[me].briefVersion,fields:['displayName','contact'] as const}}:{}),
  };
  // Identity is read only here, only on mutual approval.
  if (revealed) view.revealedContact = { ...m.introConsents![other].identity };
  return view;
}
