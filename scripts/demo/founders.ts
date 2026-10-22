// Demo founders for judging. Fictional people (names say "demo", contacts use example.com).
// Two complementary founders per problem area, so any profile a judge creates finds someone.
type Availability = 'exploring' | 'weekends' | 'full_time';
export type DemoFounder = {
  alias: string; offers: string[]; seeks: string[]; interests: string[];
  availability: Availability; approvedBlurb: string; displayName: string; contact: string;
};

const f = (alias: string, last: string, offers: string[], seeks: string[], interests: string[], availability: Availability, approvedBlurb: string): DemoFounder =>
  ({ alias, offers, seeks, interests, availability, approvedBlurb, displayName: `${alias} ${last} (demo)`, contact: `${alias.toLowerCase()}.${last.toLowerCase()}@example.com` });

export const DEMO_FOUNDERS: DemoFounder[] = [
  // Hero pair for the scripted story: an agent-native "Expedia".
  f('Priya', 'Raman', ['product', 'sales'], ['engineering'], ['travel', 'ai-agents'], 'weekends',
    'Ran partnerships at a travel startup. Want to build booking infrastructure that AI agents can call directly.'),
  f('Marcus', 'Lee', ['engineering'], ['product', 'sales'], ['travel', 'ai-agents'], 'full_time',
    'Backend engineer who built itinerary APIs. Looking for someone who can sell to travel agencies.'),
  f('Elena', 'Ruiz', ['sales'], ['engineering'], ['payments'], 'weekends',
    'Sold reconciliation software to mid-market finance teams. Need a technical cofounder.'),
  f('Sam', 'Okafor', ['engineering', 'data'], ['sales', 'product'], ['payments'], 'exploring',
    'Payments infra engineer exploring a tool that catches failed payouts before customers notice.'),
  f('Aisha', 'Khan', ['product', 'design'], ['engineering'], ['healthcare'], 'weekends',
    'Former clinic ops lead. Want to cut the paperwork nurses do between shifts.'),
  f('Jonah', 'Weiss', ['engineering'], ['product'], ['healthcare'], 'full_time',
    'Built HIPAA-compliant data pipelines. Looking for a product partner who knows clinics.'),
  f('Lena', 'Fischer', ['data'], ['sales'], ['climate'], 'weekends',
    'Data scientist modelling building energy use. Need someone to get in front of property managers.'),
  f('Tomas', 'Silva', ['sales', 'product'], ['data', 'engineering'], ['climate'], 'exploring',
    'Sold solar to commercial buildings for five years. Want a technical partner for an energy-audit tool.'),
  f('Kai', 'Nakamura', ['product'], ['engineering'], ['developer-tools', 'ai-agents'], 'weekends',
    'PM on an API platform. Exploring testing tools for teams shipping AI agents.'),
  f('Nora', 'Haddad', ['engineering'], ['product', 'sales'], ['developer-tools'], 'full_time',
    'Infra engineer tired of flaky CI. Looking for a commercial cofounder for a dev-tools idea.'),
  f('Ravi', 'Menon', ['design'], ['engineering'], ['ai-agents'], 'exploring',
    'Product designer focused on making AI agents understandable and safe to trust.'),
  f('Grace', 'Park', ['engineering'], ['design', 'product'], ['ai-agents', 'travel'], 'weekends',
    'Full-stack engineer prototyping agent workflows. Need a design and product partner.'),
];
