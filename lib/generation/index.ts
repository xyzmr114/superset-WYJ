import { z } from 'zod';
import type { Evidence, MatchingCard, Opportunity } from '@/lib/contracts';
import { EVIDENCE_CAVEAT } from '@/lib/evidence/caveat';
import { mapTags, tagSet } from '@/lib/matching/tags';
import { preferenceCompatibility } from '@/lib/matching';

// Pure and safe to import from client components. The hosted-model path lives in
// ./model.ts (server-only) and falls back to proposeOpportunity below.

const MAX_EVIDENCE = 5;

type Domain = { label: string; problem: string; targetUser: string; interviewees: string };
const DOMAINS: Record<string, Domain> = {
  'developer-tools': {
    label: 'Developer workflow',
    problem: 'Small software teams may lose time moving context from customer reports into engineering work, so the same issue gets re-explained several times before anyone fixes it.',
    targetUser: 'Engineering leads at small software companies (roughly 5 to 50 engineers) who triage customer-reported issues',
    interviewees: 'engineering leads or support engineers at small software companies',
  },
  payments: {
    label: 'Payments operations',
    problem: 'Small online businesses that use more than one payment provider may spend hours each week reconciling payouts by hand.',
    targetUser: 'Finance or operations leads at small online businesses using two or more payment providers',
    interviewees: 'finance or operations leads at small online businesses',
  },
  healthcare: {
    label: 'Clinic operations',
    problem: 'Independent clinics may lose staff time to scheduling and record handoffs between systems that do not talk to each other.',
    targetUser: 'Practice managers at independent clinics',
    interviewees: 'practice managers or front-desk leads at independent clinics',
  },
  climate: {
    label: 'Energy reporting',
    problem: 'Small companies asked to report energy use or emissions may assemble the numbers by hand from several sources.',
    targetUser: 'Operations leads at small companies that must report energy use to customers or regulators',
    interviewees: 'operations leads who have recently prepared an energy or emissions report',
  },
  travel: {
    label: 'Travel operations',
    problem: 'Small travel agencies and tour operators may re-enter the same booking by hand across supplier systems and their own tools.',
    targetUser: 'Operations leads at small travel agencies or tour operators',
    interviewees: 'operations leads at small travel agencies or tour operators',
  },
  'ai-agents': {
    label: 'Agent reliability',
    problem: 'Teams putting agents in front of real users may struggle to see why an agent failed or to test a change before users hit it.',
    targetUser: 'Engineers who ship agents to real users at small software companies',
    interviewees: 'engineers who have shipped an agent to real users',
  },
};

// A pair who share both travel and ai-agents gets the combined hypothesis.
const AGENT_TRAVEL: Domain = {
  label: 'Agent travel booking',
  problem: 'Teams building agents that plan trips may have no simple, reliable way for the agent to search, hold and book flights or hotels, so they stitch together consumer sites or stop before booking.',
  targetUser: 'Developers building agents or assistants that need to search and book travel',
  interviewees: 'developers building agents that plan or book travel',
};

/** Opens nextExperiment: the call to have before deciding on the experiment together. */
export const INTRO_STEP = 'Start with a 15-minute introduction: what each of you wants to build, how much time you can put in over the next two weeks, and whether you want to run the experiment below together.';

// Display keeps what people typed; domain choice and pair reasons use the mapped tags.
const uniq = (xs: string[]) => [...new Set(xs.map(x => x.trim()).filter(Boolean))];
const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const covers = (offers: string[], seeks: string[]) => {
  const wanted = new Set(tagSet(mapTags(seeks, 'skill')));
  return uniq(mapTags(offers, 'skill').filter(m => wanted.has(m.tag)).map(m => m.original));
};

export function sharedDomains(a: MatchingCard, b: MatchingCard): string[] {
  const bs = new Set(tagSet(mapTags(b.interests, 'interest')));
  return tagSet(mapTags(a.interests, 'interest')).filter(x => bs.has(x));
}

export const sharedDomain = (a: MatchingCard, b: MatchingCard): string | null => sharedDomains(a, b)[0] ?? null;

/** Deterministic opportunity from approved card fields. Always generationMode 'template'. */
export function proposeOpportunity(a: MatchingCard, b: MatchingCard, evidence: Evidence[] = []): Opportunity {
  const shared = sharedDomains(a, b);
  const agentTravel = shared.includes('travel') && shared.includes('ai-agents');
  const tag = agentTravel ? 'travel and ai-agents' : shared[0] ?? tagSet(mapTags([...a.interests, ...b.interests], 'interest'))[0] ?? null;
  const d = (agentTravel && AGENT_TRAVEL) || (tag && DOMAINS[tag]) || {
    label: tag ? `${tag} workflow` : 'Shared workflow',
    problem: `There may be a repeated, costly workflow in ${tag ?? 'a shared problem area'} that a two-person team could improve.`,
    targetUser: 'To be chosen after the first interviews',
    interviewees: `people who do this work in ${tag ?? 'the chosen area'}`,
  };
  const aGives = covers(a.offers, b.seeks), bGives = covers(b.offers, a.seeks);
  const whyThisPair = [
    aGives.length ? `${a.alias} offers ${list(aGives)}, which ${b.alias} is looking for.` : `${a.alias} offers ${list(uniq(a.offers)) || 'skills not yet listed'}.`,
    bGives.length ? `${b.alias} offers ${list(bGives)}, which ${a.alias} is looking for.` : `${b.alias} offers ${list(uniq(b.offers)) || 'skills not yet listed'}.`,
  ];
  if (shared.length) whyThisPair.push(`Both listed ${tag} as ${agentTravel ? 'problem areas' : 'a problem area'} they want to work on.`);
  const preferenceReasons = preferenceCompatibility(a, b).reasons;
  if (preferenceReasons.length) whyThisPair.push(preferenceReasons.join(' '));
  const approvedIdeas = [a, b].filter(card => card.approvedBlurb.trim());
  const ideaSummary = approvedIdeas.map(card => `${card.alias}'s approved idea: “${card.approvedBlurb.trim()}”`).join(' ');
  const experiment = approvedIdeas.length
    ? 'within 48 hours, agree on one overlap between the two approved ideas, choose a specific user, and interview five people who fit. Split discovery and a small prototype between your stated strengths. Compare findings and independently decide whether to keep building together.'
    : `within 48 hours, interview five ${d.interviewees}. Ask for a recent example, the current workaround, how often it happens and what it costs. Continue only if at least three describe the same problem without prompting.`;
  const evidenceIds = evidence.slice(0, MAX_EVIDENCE).map(e => e.id);
  return {
    title: approvedIdeas.length ? 'Shared idea discovery' : `${d.label} discovery`,
    problemHypothesis: `${ideaSummary || d.problem} This is a hypothesis, not validated demand.`,
    targetUser: approvedIdeas.length ? 'Agree on a specific user from the two approved ideas during the first conversation' : d.targetUser,
    whyThisPair,
    evidenceIds,
    unknowns: [
      'Who has this problem often enough to pay for a fix, and who would approve the purchase?',
      ...(evidenceIds.length ? ['What do the existing projects listed under public evidence already solve?'] : []),
      `What time and money can each founder commit? Cards list ${a.availability.replace('_', ' ')} and ${b.availability.replace('_', ' ')}.`,
      'Willingness to pay is untested.',
    ],
    nextExperiment: `${INTRO_STEP} Then, ${experiment}`,
    generationMode: 'template',
  };
}

// Shape checks for opportunity text from an untrusted source (the hosted model).
export const opportunitySchema = z.object({
  title: z.string().trim().min(3).max(120),
  problemHypothesis: z.string().trim().min(10).max(700),
  targetUser: z.string().trim().min(3).max(300),
  whyThisPair: z.array(z.string().trim().min(3).max(300)).min(1).max(4),
  evidenceIds: z.array(z.string()).max(10),
  unknowns: z.array(z.string().trim().min(3).max(300)).min(1).max(6),
  nextExperiment: z.string().trim().min(10).max(700),
});

/** Validates untrusted output and keeps only evidence ids that were supplied. Returns null if invalid. */
export function sanitizeOpportunity(raw: unknown, suppliedEvidenceIds: Iterable<string>): Opportunity | null {
  const parsed = opportunitySchema.safeParse(raw);
  if (!parsed.success) return null;
  const allowed = new Set(suppliedEvidenceIds);
  const evidenceIds = [...new Set(parsed.data.evidenceIds)].filter(id => allowed.has(id));
  return { ...parsed.data, evidenceIds, generationMode: 'model' };
}

// ---- Pitch draft ----

export type PitchMatch = { founders: readonly [MatchingCard, MatchingCard] };

export const SUPERSET_REFERENCES = ['https://superset.com/', 'https://superset.com/portfolio'];

// Text from cards, the model, or GitHub is inserted as plain text: one line, no markdown syntax.
const md = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/([\\`*_[\]<>#|!])/g, '\\$1');
const safeUrl = (u: string) => /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(u) ? u : null;
const day = (iso: string) => { const t = Date.parse(iso); return Number.isNaN(t) ? 'unknown date' : new Date(t).toISOString().slice(0, 10); };

function evidenceLines(opportunity: Opportunity, evidence: Evidence[]): string[] {
  const byId = new Map(evidence.map(e => [e.id, e]));
  return opportunity.evidenceIds.flatMap(id => {
    const e = byId.get(id);
    const url = e && safeUrl(e.url);
    if (!e || !url) return [];
    const source = e.cached ? `cached copy, fetched ${day(e.fetchedAt)}` : `fetched ${day(e.fetchedAt)}`;
    return [`- [${md(e.title)}](${url})${e.excerpt ? `: ${md(e.excerpt)}` : ''} (${source})`];
  });
}

/**
 * Joint pitch draft from approved cards, the opportunity and its cited evidence.
 * Uses aliases only: identity fields are appended separately after both approvals.
 */
export function buildPitchMarkdown(match: PitchMatch, opportunity: Opportunity, evidence: Evidence[]): string {
  const [a, b] = match.founders;
  const sources = evidenceLines(opportunity, evidence);
  const mode = opportunity.generationMode === 'model'
    ? 'Drafted by a hosted model from approved matching cards and public sources. Check every line before approving.'
    : 'Drafted from a fixed template using approved matching cards. No hosted model was used.';
  const founder = (c: MatchingCard) => `- ${md(c.alias)}: offers ${md(list(uniq(c.offers)) || 'nothing listed')}; seeks ${md(list(uniq(c.seeks)) || 'nothing listed')}; availability ${c.availability.replace('_', ' ')}.`;
  return [
    `# ${md(opportunity.title)}: joint pitch draft`,
    '',
    `> Working draft. ${mode} Everything here is a hypothesis to test, not validated demand. It contains no customer names, endorsements or official application requirements.`,
    '',
    '## Problem hypothesis',
    md(opportunity.problemHypothesis),
    '',
    '## Proposed product',
    `Start with the overlap in these approved ideas; agree on a narrowly scoped first version after your first conversation.`,
    ...[a, b].filter(card => card.approvedBlurb.trim()).map(card => `- ${md(card.alias)}: ${md(card.approvedBlurb)}`),
    '',
    '## Target customer',
    `${md(opportunity.targetUser)}. The first buyer and budget are not yet validated.`,
    '',
    '## Team complementarity',
    ...opportunity.whyThisPair.map(w => `- ${md(w)}`),
    founder(a),
    founder(b),
    '',
    '## Public evidence',
    EVIDENCE_CAVEAT,
    ...(sources.length ? sources : ['- No public sources attached yet.']),
    '',
    '## First 48-hour experiment',
    md(opportunity.nextExperiment.replace(`${INTRO_STEP} Then, w`, 'W')), // the introduction has happened by now
    '',
    '## Why explore this with super{set}?',
    'Our hypothesis, not a statement from super{set}: a complementary founding team working on one specific business problem may fit its company-building approach. We have not confirmed this with super{set}.',
    ...SUPERSET_REFERENCES.map(u => `Reference: ${u}`),
    '',
    '## Open questions',
    ...opportunity.unknowns.map(u => `- ${md(u)}`),
    '',
  ].join('\n');
}
