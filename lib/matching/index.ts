import type { MatchingCard } from '@/lib/contracts';

// Deterministic scoring over approved card fields only. The score is a heuristic for
// "worth a conversation", not a prediction that a founding team will succeed.

export const SCORE_DISCLAIMER = 'This score is a simple heuristic over approved card fields. It does not predict whether a founding team will work or succeed.';
export const DEFAULT_MIN_SCORE = 50;
export const MAX_MATCHES = 3;

export type ScoreComponent = {
  key: 'interests' | 'complementarity' | 'availability';
  points: number;
  max: number;
  reason: string;
};

export type ScoredCandidate = {
  candidate: MatchingCard;
  score: number;
  components: ScoreComponent[];
  sharedInterests: string[];
};

export type RankOptions = {
  /** Card ids this participant declined, or who declined them. */
  declinedIds?: Iterable<string>;
  /** Candidates must reach this total (0-100). */
  minScore?: number;
  limit?: number;
};

const norm = (xs: string[]) => [...new Set(xs.map(x => x.trim().toLowerCase()).filter(Boolean))];
const intersect = (a: string[], b: string[]) => { const bs = new Set(norm(b)); return norm(a).filter(x => bs.has(x)); };
const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

const AVAILABILITY_ORDER: MatchingCard['availability'][] = ['exploring', 'weekends', 'full_time'];
const AVAILABILITY_LABEL: Record<MatchingCard['availability'], string> = { exploring: 'exploring', weekends: 'weekends', full_time: 'full time' };

function interestComponent(me: MatchingCard, other: MatchingCard): ScoreComponent & { shared: string[] } {
  const shared = intersect(me.interests, other.interests);
  const smaller = Math.min(norm(me.interests).length, norm(other.interests).length);
  const points = smaller ? Math.round(40 * shared.length / smaller) : 0;
  const reason = shared.length
    ? `Heuristic: you both listed ${list(shared)} as a problem area.`
    : 'Heuristic: no shared problem area on your approved cards.';
  return { key: 'interests', points, max: 40, reason, shared };
}

// Half the points for each direction: what I offer that they seek, and what they offer that I seek.
function direction(offers: string[], seeks: string[]) {
  const covered = intersect(offers, seeks);
  const wanted = norm(seeks).length;
  return { covered, points: wanted ? Math.round(20 * covered.length / wanted) : 0 };
}

function complementarityComponent(me: MatchingCard, other: MatchingCard): ScoreComponent {
  const give = direction(me.offers, other.seeks);
  const get = direction(other.offers, me.seeks);
  const parts = [
    give.covered.length ? `you offer ${list(give.covered)}, which they seek` : 'you offer nothing they listed as sought',
    get.covered.length ? `they offer ${list(get.covered)}, which you seek` : 'they offer nothing you listed as sought',
  ];
  return { key: 'complementarity', points: give.points + get.points, max: 40, reason: `Heuristic: ${parts.join('; ')}.` };
}

function availabilityComponent(me: MatchingCard, other: MatchingCard): ScoreComponent {
  const gap = Math.abs(AVAILABILITY_ORDER.indexOf(me.availability) - AVAILABILITY_ORDER.indexOf(other.availability));
  const points = gap === 0 ? 20 : gap === 1 ? 10 : 0;
  const a = AVAILABILITY_LABEL[me.availability], b = AVAILABILITY_LABEL[other.availability];
  const reason = gap === 0
    ? `Heuristic: you both listed ${a} availability.`
    : `Heuristic: you listed ${a} and they listed ${b}; ${gap === 1 ? 'close enough to start talking' : 'a large gap to discuss early'}.`;
  return { key: 'availability', points, max: 20, reason };
}

export function scorePair(me: MatchingCard, candidate: MatchingCard): ScoredCandidate {
  const { shared, ...interests } = interestComponent(me, candidate);
  const components = [interests, complementarityComponent(me, candidate), availabilityComponent(me, candidate)];
  return { candidate, score: components.reduce((sum, c) => sum + c.points, 0), components, sharedInterests: shared };
}

/** Up to three candidates from the same event, best first. An empty result is a valid answer. */
export function rankCandidates(me: MatchingCard, candidates: MatchingCard[], options: RankOptions = {}): ScoredCandidate[] {
  const declined = new Set(options.declinedIds ?? []);
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const limit = Math.min(options.limit ?? MAX_MATCHES, MAX_MATCHES);
  const seen = new Set<string>();
  return candidates
    .filter(c => c.id !== me.id && c.eventId === me.eventId && !declined.has(c.id) && !seen.has(c.id) && seen.add(c.id))
    .map(c => scorePair(me, c))
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id))
    .slice(0, limit);
}
