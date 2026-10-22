import { INTERESTS, SKILLS } from '@/lib/contracts';

// Maps free-text card entries onto the controlled tags for matching only. Cards keep the
// text people typed; scoring compares the mapped tags. Unknown terms stay as their
// normalized text, so two people who both type "robotics" still match each other.

export type TagKind = 'skill' | 'interest';
export type MappedTag = {
  original: string;
  tag: string;
  /** exact: already a base tag; synonym: mapped onto one; custom: kept as typed (normalized). */
  via: 'exact' | 'synonym' | 'custom';
};

/** Lowercase, trim, treat spaces/hyphens/underscores as one space, strip other punctuation. */
export function normalizeTag(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, '')
    .replace(/ +/g, ' ')
    .trim();
}

// Keys are written as plain phrases and normalized below, so "node.js" and "nodejs" both work.
const SKILL_SYNONYMS: Record<(typeof SKILLS)[number], string[]> = {
  engineering: [
    'rust', 'go', 'golang', 'python', 'typescript', 'ts', 'javascript', 'js', 'node', 'node.js', 'java', 'kotlin',
    'c', 'c#', 'csharp', 'cpp', 'ruby', 'rails', 'php', 'scala', 'elixir', 'swift',
    'backend', 'back end', 'backend engineering', 'backend engineer', 'backend development',
    'frontend', 'front end', 'frontend engineering', 'frontend engineer', 'frontend development', 'react', 'reactjs', 'vue', 'angular', 'next.js',
    'full stack', 'full stack engineering', 'full stack engineer', 'mobile', 'mobile development', 'ios', 'android',
    'devops', 'infrastructure', 'infra', 'platform engineering', 'sre', 'cloud', 'security',
    'software engineering', 'software engineer', 'software development', 'engineer', 'developer', 'programming', 'coding',
    'integrations', 'api', 'apis',
  ],
  design: ['ui', 'ux', 'ui design', 'ux design', 'ui/ux', 'product design', 'product designer', 'visual design', 'designer', 'figma', 'interaction design'],
  sales: [
    'bd', 'biz dev', 'business development', 'gtm', 'go to market', 'account exec', 'account executive', 'ae',
    'selling', 'enterprise sales', 'partnerships', 'sales lead',
  ],
  product: [
    'pm', 'product management', 'product manager', 'product strategy',
    'customer discovery', 'discovery', 'user research', 'ux research', 'interviews', 'customer interviews', 'customer research',
  ],
  data: [
    'ml', 'ai', 'ai/ml', 'ml/ai', 'machine learning', 'data science', 'data scientist', 'data engineering', 'data engineer',
    'analytics', 'data analysis', 'statistics', 'deep learning',
  ],
};

const INTEREST_SYNONYMS: Record<(typeof INTERESTS)[number], string[]> = {
  'developer-tools': [
    'devtools', 'dev tools', 'developer tools', 'developer tooling', 'dx', 'developer experience',
    'developer workflow', 'developer workflows', 'developer productivity', 'dev productivity',
  ],
  payments: ['payment', 'fintech', 'fin tech', 'billing', 'invoicing'],
  healthcare: ['health', 'healthtech', 'health tech', 'digital health', 'medtech', 'medical'],
  climate: ['climate tech', 'climatetech', 'sustainability', 'clean energy', 'cleantech', 'energy', 'carbon'],
};

function buildIndex(base: readonly string[], synonyms: Record<string, string[]>) {
  const exact = new Map(base.map(tag => [normalizeTag(tag), tag]));
  const viaSynonym = new Map<string, string>();
  for (const [tag, terms] of Object.entries(synonyms)) for (const t of terms) viaSynonym.set(normalizeTag(t), tag);
  return { exact, viaSynonym };
}
const INDEX: Record<TagKind, ReturnType<typeof buildIndex>> = {
  skill: buildIndex(SKILLS, SKILL_SYNONYMS),
  interest: buildIndex(INTERESTS, INTEREST_SYNONYMS),
};

export function mapTag(input: string, kind: TagKind): MappedTag | null {
  const n = normalizeTag(input);
  if (!n) return null;
  const original = input.trim();
  const { exact, viaSynonym } = INDEX[kind];
  const base = exact.get(n);
  if (base) return { original, tag: base, via: 'exact' };
  const mapped = viaSynonym.get(n);
  if (mapped) return { original, tag: mapped, via: 'synonym' };
  return { original, tag: n, via: 'custom' };
}

export const mapTags = (inputs: string[], kind: TagKind): MappedTag[] =>
  inputs.map(i => mapTag(i, kind)).filter((t): t is MappedTag => t !== null);

/** Distinct mapped tags, in first-seen order. */
export const tagSet = (mapped: MappedTag[]) => [...new Set(mapped.map(m => m.tag))];
