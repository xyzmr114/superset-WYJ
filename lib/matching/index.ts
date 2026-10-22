import type { MatchingCard } from '@/lib/contracts';
const overlaps = (a: string[], b: string[]) => a.some(x => b.includes(x));
export function rankCandidates(me: MatchingCard, candidates: MatchingCard[]) {
 return candidates.filter(p => p.id !== me.id && p.eventId === me.eventId).map(candidate => ({candidate, score:
 (overlaps(me.interests,candidate.interests) ? 40 : 0) +
 (overlaps(me.offers,candidate.seeks) ? 20 : 0) +
 (overlaps(me.seeks,candidate.offers) ? 20 : 0) +
 (me.availability === candidate.availability ? 20 : 0)
 })).filter(p => p.score >= 40).sort((a,b) => b.score-a.score || a.candidate.id.localeCompare(b.candidate.id)).slice(0,3);
}
