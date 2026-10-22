import type {MatchingCard} from '@/lib/contracts';

// Suggestions shown in the type-ahead. The demo attendees use the base tags
// (engineering, sales, product, design, data / developer-tools, payments,
// healthcare, climate), so keep those here for matching — everything else is
// extra convenience, and the user can also type a fully custom skill.
// These lists are also the allowlist for local classifier suggestions.
export const SKILL_SUGGESTIONS = [
  'engineering', 'frontend engineering', 'backend engineering', 'full-stack engineering',
  'mobile development', 'data', 'data science', 'machine learning', 'AI/ML', 'devops',
  'infrastructure', 'security', 'design', 'UX design', 'UI design', 'product',
  'product management', 'sales', 'marketing', 'growth', 'business development',
  'operations', 'finance', 'legal', 'content', 'community', 'research', 'hardware',
] as const;
export const INTEREST_SUGGESTIONS = [
  'developer-tools', 'payments', 'travel', 'ai-agents', 'fintech', 'healthcare', 'climate', 'education',
  'e-commerce', 'logistics', 'productivity', 'social', 'gaming', 'enterprise SaaS',
  'consumer apps', 'AI', 'marketplaces', 'real estate', 'biotech', 'robotics',
  'cybersecurity', 'media',
] as const;

export const AVAILABILITY: MatchingCard['availability'][] = ['exploring', 'weekends', 'full_time'];
export const AVAILABILITY_LABEL: Record<MatchingCard['availability'], string> = {
  exploring: 'Just exploring',
  weekends: 'Evenings & weekends',
  full_time: 'Ready to go full-time',
};

// Frozen brief limits (see WOULD_YOU_JUMP_HANDOFF.md, "Approved matching brief").
export const LIMITS = {alias: 40, offers: 5, seeks: 5, interests: 4, blurb: 240} as const;
