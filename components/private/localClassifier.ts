import {z} from 'zod';
import type {MatchingCard} from '@/lib/contracts';
import {INTEREST_SUGGESTIONS, LIMITS, SKILL_SUGGESTIONS} from '@/components/onboarding/vocabulary';

// Mirrors the proposed LocalClassification contract in WOULD_YOU_JUMP_HANDOFF.md.
// Switch to lib/private/classifier-contract.ts once Vernika lands it.
export type LocalClassification = {
  status: 'ready' | 'needs_review' | 'unavailable';
  engine: 'laya-local';
  suggested: {
    offers: string[];
    seeks: string[];
    interests: string[];
    availability: MatchingCard['availability'];
  };
  message: string;
};

// Opt-in: the founder's own companion, e.g. NEXT_PUBLIC_LOCAL_CLASSIFIER_URL=http://127.0.0.1:11435/classify
const ENDPOINT = process.env.NEXT_PUBLIC_LOCAL_CLASSIFIER_URL?.trim();
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

const response = z.object({
  status: z.enum(['ready', 'needs_review', 'unavailable']),
  suggested: z.object({
    offers: z.array(z.string()).default([]),
    seeks: z.array(z.string()).default([]),
    interests: z.array(z.string()).default([]),
    availability: z.enum(['exploring', 'weekends', 'full_time']).optional(),
  }),
  message: z.string().max(300).optional(),
});

function unavailable(message: string): LocalClassification {
  return {status: 'unavailable', engine: 'laya-local', suggested: {offers: [], seeks: [], interests: [], availability: 'exploring'}, message};
}

// Returns the loopback URL, or null if unset or not on this machine. Raw profile
// text is never sent anywhere else — there is deliberately no hosted fallback.
export function localEndpoint(): URL | null {
  if (!ENDPOINT) return null;
  try {
    const url = new URL(ENDPOINT);
    return url.protocol === 'http:' && LOOPBACK.has(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

// Only labels from the shared vocabulary cross this boundary, canonicalised and capped.
function allow(labels: string[], vocabulary: readonly string[], max: number): string[] {
  const byLower = new Map(vocabulary.map(v => [v.toLowerCase(), v]));
  const out: string[] = [];
  for (const label of labels) {
    const hit = byLower.get(label.trim().toLowerCase());
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out.slice(0, max);
}

export async function classifyLocally(profileText: string): Promise<LocalClassification> {
  const url = localEndpoint();
  if (!url) return unavailable('No classifier is running on this laptop. Fill in your brief by hand.');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text: profileText}),
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return unavailable(`The local classifier answered ${res.status}. Fill in your brief by hand.`);
    const parsed = response.safeParse(await res.json());
    if (!parsed.success) return unavailable('The local classifier sent an unexpected answer. Fill in your brief by hand.');
    const {status, suggested, message} = parsed.data;
    if (status === 'unavailable') return unavailable(message ?? 'The local classifier is unavailable. Fill in your brief by hand.');
    return {
      status,
      engine: 'laya-local',
      suggested: {
        offers: allow(suggested.offers, SKILL_SUGGESTIONS, LIMITS.offers),
        seeks: allow(suggested.seeks, SKILL_SUGGESTIONS, LIMITS.seeks),
        interests: allow(suggested.interests, INTEREST_SUGGESTIONS, LIMITS.interests),
        availability: suggested.availability ?? 'exploring',
      },
      message: message ?? 'Suggested on this device. Review every label before you publish.',
    };
  } catch {
    return unavailable('Could not reach the classifier on this laptop. Fill in your brief by hand.');
  }
}
