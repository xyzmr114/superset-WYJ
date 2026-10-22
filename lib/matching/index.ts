import { TECH_STACK, STRENGTHS, WORK_STYLES, type MatchingCard } from '@/lib/contracts';
import { mapTags, tagSet, type MappedTag } from './tags';

export { normalizeTag, mapTag, mapTags, type MappedTag, type TagKind } from './tags';

// Deterministic scoring over approved card fields only. The score is a heuristic for
// "worth a conversation", not a prediction that a founding team will succeed.

export const SCORE_DISCLAIMER = 'This score is a simple heuristic over approved card fields. It does not predict whether a founding team will work or succeed.';
export const DEFAULT_MIN_SCORE = 50;
export const MAX_MATCHES = 3;

export type ScoreComponent = {
  key: 'interests' | 'complementarity' | 'availability' | 'preferences';
  points: number;
  max: number;
  reason: string;
};

export type ScoredCandidate = {
  candidate: MatchingCard;
  score: number;
  components: ScoreComponent[];
  sharedInterests: string[];
  /** Approved preferences break ties without inflating the 0–100 domain/skill score. */
  preferenceScore: number;
};

export type RankOptions = {
  /** Card ids this participant declined, or who declined them. */
  declinedIds?: Iterable<string>;
  /** Candidates must reach this total (0-100). */
  minScore?: number;
  limit?: number;
  requireSharedInterest?: boolean;
  requirePartnerFit?: boolean;
};

const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const entriesFor = (mapped: MappedTag[], tag: string) => mapped.filter(m => m.tag === tag);

// How a matched tag reads in an explanation: the base tag, or what was typed plus what it counts as.
function label(tag: string, entries: MappedTag[]): string {
  if (!entries.length || entries.some(e => e.via === 'exact')) return tag;
  if (entries[0].via === 'custom') return entries[0].original;
  return `${list(entries.map(e => e.original))} (counts as ${tag})`;
}

const AVAILABILITY_ORDER: MatchingCard['availability'][] = ['exploring', 'weekends', 'full_time'];
const AVAILABILITY_LABEL: Record<MatchingCard['availability'], string> = { exploring: 'exploring', weekends: 'weekends', full_time: 'full time' };

function interestComponent(me: MatchingCard, other: MatchingCard): ScoreComponent & { shared: string[] } {
  const mine = mapTags(me.interests, 'interest'), theirs = mapTags(other.interests, 'interest');
  const theirTags = new Set(tagSet(theirs));
  const shared = tagSet(mine).filter(t => theirTags.has(t));
  const smaller = Math.min(tagSet(mine).length, theirTags.size);
  const points = smaller ? Math.round(40 * shared.length / smaller) : 0;
  const describe = (tag: string) => {
    const notes = [
      ...entriesFor(mine, tag).filter(e => e.via === 'synonym').map(e => `your "${e.original}"`),
      ...entriesFor(theirs, tag).filter(e => e.via === 'synonym').map(e => `their "${e.original}"`),
    ];
    const name = entriesFor(mine, tag)[0]?.via === 'custom' ? entriesFor(mine, tag)[0].original : tag;
    return notes.length ? `${name} (${list(notes)} ${notes.length > 1 ? 'count' : 'counts'} as ${tag})` : name;
  };
  const reason = shared.length
    ? `Heuristic: you both listed ${list(shared.map(describe))} as a problem area.`
    : 'Heuristic: no shared problem area on your approved cards.';
  return { key: 'interests', points, max: 40, reason, shared };
}

// Half the points for each direction: what one side offers that the other seeks.
function direction(offers: MappedTag[], seeks: MappedTag[]) {
  const offered = new Set(tagSet(offers));
  const wanted = tagSet(seeks);
  const covered = wanted.filter(t => offered.has(t));
  return {
    labels: covered.map(t => label(t, entriesFor(offers, t))),
    points: wanted.length ? Math.round(20 * covered.length / wanted.length) : 0,
  };
}

function complementarityComponent(me: MatchingCard, other: MatchingCard): ScoreComponent {
  const give = direction(mapTags(me.offers, 'skill'), mapTags(other.seeks, 'skill'));
  const get = direction(mapTags(other.offers, 'skill'), mapTags(me.seeks, 'skill'));
  const parts = [
    give.labels.length ? `you offer ${list(give.labels)}, which they seek` : 'you offer nothing they listed as sought',
    get.labels.length ? `they offer ${list(get.labels)}, which you seek` : 'they offer nothing you listed as sought',
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

const approvedValues = (values: string[] | undefined, allowed: readonly string[]) => {
  const allowedSet = new Set(allowed.map(value => value.toLowerCase()));
  return [...new Set((values ?? []).map(value => value.trim().toLowerCase()))].filter(value => allowedSet.has(value) && value !== 'no preference');
};
const overlap = (a: string[], b: string[]) => a.filter(value => b.includes(value));

/** Explicit approved answers only; shared style is a conversation starter, not a personality assessment. */
export function preferenceCompatibility(a: MatchingCard, b: MatchingCard): { score: number; reasons: string[] } {
  const ap = a.preferences, bp = b.preferences;
  const stack = overlap(approvedValues(ap?.techStack, TECH_STACK), approvedValues(bp?.techStack, TECH_STACK));
  const styles = overlap(approvedValues(ap?.workStyles, WORK_STYLES), approvedValues(bp?.workStyles, WORK_STYLES));
  const aGives = overlap(approvedValues(ap?.strengths, STRENGTHS), approvedValues(bp?.partnerStrengths, STRENGTHS));
  const bGives = overlap(approvedValues(bp?.strengths, STRENGTHS), approvedValues(ap?.partnerStrengths, STRENGTHS));
  const reasons = [
    ...(stack.length ? [`Both approved ${list(stack)} as a preferred tech stack.`] : []),
    ...(styles.length ? [`Both prefer ${list(styles)} when working together.`] : []),
    ...(aGives.length ? [`${a.alias} lists ${list(aGives)}, which ${b.alias} wants in a partner.`] : []),
    ...(bGives.length ? [`${b.alias} lists ${list(bGives)}, which ${a.alias} wants in a partner.`] : []),
  ];
  return { score: Math.min(stack.length, 2) + Math.min(styles.length, 2) + 2 * Math.min(aGives.length, 2) + 2 * Math.min(bGives.length, 2), reasons };
}

/** At least one person brings an explicitly requested skill or self-described strength. */
export function hasPartnerFit(a:MatchingCard,b:MatchingCard):boolean{
 const canHelp=(giver:MatchingCard,seeker:MatchingCard)=>{
  const offered=new Set(tagSet(mapTags([...giver.offers,...(giver.preferences?.strengths??[])],'skill')));
  return tagSet(mapTags([...seeker.seeks,...(seeker.preferences?.partnerStrengths??[])],'skill')).some(skill=>offered.has(skill));
 };
 return canHelp(a,b)||canHelp(b,a);
}

export function scorePair(me: MatchingCard, candidate: MatchingCard): ScoredCandidate {
  const { shared, ...interests } = interestComponent(me, candidate);
  const components = [interests, complementarityComponent(me, candidate), availabilityComponent(me, candidate)];
  const preferences = preferenceCompatibility(me, candidate);
  for (const reason of preferences.reasons) components.push({ key: 'preferences', points: 0, max: 0, reason: `Heuristic: ${reason}` });
  return { candidate, score: components.reduce((sum, c) => sum + c.points, 0), components, sharedInterests: shared, preferenceScore: preferences.score };
}

/** Up to three candidates from the same event, best first. An empty result is a valid answer. */
export function rankCandidates(me: MatchingCard, candidates: MatchingCard[], options: RankOptions = {}): ScoredCandidate[] {
  const declined = new Set(options.declinedIds ?? []);
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const limit = options.limit === Infinity ? Infinity : Math.min(options.limit ?? MAX_MATCHES, MAX_MATCHES);
  const seen = new Set<string>();
  return candidates
    .filter(c => c.id !== me.id && c.eventId === me.eventId && !declined.has(c.id) && !seen.has(c.id) && seen.add(c.id))
    .map(c => scorePair(me, c))
    .filter(s => s.score >= minScore && (!options.requireSharedInterest || s.sharedInterests.length > 0) && (!options.requirePartnerFit || hasPartnerFit(me,s.candidate)))
    .sort((a, b) => b.score - a.score || b.preferenceScore - a.preferenceScore || a.candidate.id.localeCompare(b.candidate.id))
    .slice(0, limit);
}
