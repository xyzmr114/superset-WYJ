import type { Evidence, MatchView } from '@/lib/contracts';
import { searchPublicProjects } from '@/lib/evidence/github';
import { db, type Match } from './store';
import { notFound } from './http';

const evidenceCache = new Map<string, { at: number; items: Evidence[] }>();
const TTL = 15 * 60_000;

/** Public evidence for a domain, cached 15 min. Any failure/timeout => [] (UI shows template mode; never invent evidence). */
export async function evidenceFor(domain: string): Promise<Evidence[]> {
  const hit = evidenceCache.get(domain);
  if (hit && Date.now() - hit.at < TTL) return hit.items.map((e) => ({ ...e, cached: true }));
  try {
    const items = await Promise.race([
      searchPublicProjects(domain),
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
  const candidate = db.cards.get(other)!;
  const revealed = !m.declinedBy && m.approvals.has(m.a) && m.approvals.has(m.b);
  const view: MatchView = {
    id: m.id, candidate, score: m.score, opportunity: m.opportunity, evidence: m.evidence,
    status: m.declinedBy ? 'declined' : revealed ? 'revealed' : m.approvals.size > 0 ? 'pending' : 'suggested',
    myIntroApproval: m.approvals.has(me),
  };
  // Identity is read only here, only on mutual approval.
  if (revealed) view.revealedContact = { ...(db.identities.get(other) ?? { displayName: candidate.alias, contact: 'not provided' }) };
  return view;
}
