import type { MatchingCard } from '@/lib/contracts';

// Synthetic demo participants. They are not real attendees: every id starts with
// SYNTHETIC_PREFIX and every blurb says so. Never mix them into a real event pool
// without that label. Private conditions (runway, readiness) are deliberately absent:
// cards only hold what a participant approved for matching.
export const SYNTHETIC_PREFIX = 'synthetic-';
export const SYNTHETIC_EVENT_ID = 'demo';

const card = (c: Omit<MatchingCard, 'eventId' | 'version'>): MatchingCard => ({ ...c, eventId: SYNTHETIC_EVENT_ID, version: 1 });

// Founder A: backend engineer who wants to build a booking layer that agents can call,
// looking for someone to lead product and distribution.
export const founderA = card({
  id: `${SYNTHETIC_PREFIX}founder-a`, alias: 'Builder',
  offers: ['engineering'], seeks: ['product', 'sales'], interests: ['travel', 'ai-agents'],
  availability: 'weekends',
  approvedBlurb: 'Synthetic profile. Backend engineer who has built booking integrations; wants to build a booking layer that agents can call and is looking for someone to lead product and distribution.',
});

// Founder B: product and distribution background in travel, exploring infrastructure for
// agents that plan and book trips, looking for an engineer.
export const founderB = card({
  id: `${SYNTHETIC_PREFIX}founder-b`, alias: 'Signal',
  offers: ['product', 'sales'], seeks: ['engineering'], interests: ['ai-agents', 'travel'],
  availability: 'exploring',
  approvedBlurb: 'Synthetic profile. Product and distribution background in travel; exploring infrastructure for agents that plan and book trips and looking for an engineer.',
});

// Distractors: each fails a different part of the score, so the ranking has a visible reason.
export const distractors: MatchingCard[] = [
  card({ // same domain, needs engineering, but offers nothing A or B asked for
    id: `${SYNTHETIC_PREFIX}canvas`, alias: 'Canvas',
    offers: ['design'], seeks: ['engineering'], interests: ['travel'], availability: 'exploring',
    approvedBlurb: 'Synthetic profile. Product designer interested in trip-planning apps.',
  }),
  card({ // complementary skills, different domain
    id: `${SYNTHETIC_PREFIX}ledger`, alias: 'Ledger',
    offers: ['sales'], seeks: ['data'], interests: ['payments'], availability: 'full_time',
    approvedBlurb: 'Synthetic profile. Sells to finance teams; exploring payments reconciliation.',
  }),
  card({
    id: `${SYNTHETIC_PREFIX}terra`, alias: 'Terra',
    offers: ['data'], seeks: ['sales'], interests: ['climate'], availability: 'full_time',
    approvedBlurb: 'Synthetic profile. Climate data specialist.',
  }),
  card({
    id: `${SYNTHETIC_PREFIX}pulse`, alias: 'Pulse',
    offers: ['engineering'], seeks: ['design'], interests: ['healthcare'], availability: 'weekends',
    approvedBlurb: 'Synthetic profile. Engineer working on clinic scheduling tools.',
  }),
];

// Founder A and B are played live on the two demo devices, so the server never pre-loads
// them: a synthetic copy would tie with the real person. Use them in tests and seed --all.
export const founders: MatchingCard[] = [founderA, founderB];
export const allProfiles: MatchingCard[] = [...founders, ...distractors];

/** The synthetic pool the server pre-loads: distractors only. */
export const profiles: MatchingCard[] = distractors;

export const isSyntheticProfile = (c: Pick<MatchingCard, 'id'>) => c.id.startsWith(SYNTHETIC_PREFIX);
