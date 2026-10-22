import type { MatchingCard } from '@/lib/contracts';

// Synthetic demo participants. They are not real attendees: every id starts with
// SYNTHETIC_PREFIX and every blurb says so. Never mix them into a real event pool
// without that label. Private conditions (runway, readiness) are deliberately absent:
// cards only hold what a participant approved for matching.
export const SYNTHETIC_PREFIX = 'synthetic-';
export const SYNTHETIC_EVENT_ID = 'demo';

const card = (c: Omit<MatchingCard, 'eventId' | 'version'>): MatchingCard => ({ ...c, eventId: SYNTHETIC_EVENT_ID, version: 1 });

// Founder A: backend/data engineer looking for customer discovery and sales help.
export const founderA = card({
  id: `${SYNTHETIC_PREFIX}founder-a`, alias: 'Builder',
  offers: ['engineering', 'data'], seeks: ['sales', 'product'], interests: ['developer-tools'],
  availability: 'weekends',
  approvedBlurb: 'Synthetic profile. Backend and data engineer who builds integrations; looking for someone to lead customer discovery and sales for developer workflow tools.',
});

// Founder B: developer-tools product and sales background, looking for a backend cofounder.
export const founderB = card({
  id: `${SYNTHETIC_PREFIX}founder-b`, alias: 'Signal',
  offers: ['product', 'sales'], seeks: ['engineering'], interests: ['developer-tools'],
  availability: 'exploring',
  approvedBlurb: 'Synthetic profile. Product and sales background in developer tools; looking for a backend cofounder.',
});

// Distractors: each fails a different part of the score, so the ranking has a visible reason.
export const distractors: MatchingCard[] = [
  card({ // same domain, needs engineering, but offers nothing A or B asked for
    id: `${SYNTHETIC_PREFIX}canvas`, alias: 'Canvas',
    offers: ['design'], seeks: ['engineering'], interests: ['developer-tools'], availability: 'exploring',
    approvedBlurb: 'Synthetic profile. Product designer interested in developer experience.',
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

export const profiles: MatchingCard[] = [founderA, founderB, ...distractors];

export const isSyntheticProfile = (c: Pick<MatchingCard, 'id'>) => c.id.startsWith(SYNTHETIC_PREFIX);
