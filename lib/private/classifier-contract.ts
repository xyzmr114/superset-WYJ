import { z } from 'zod';
import { INTERESTS, SKILLS, type MatchingCard } from '@/lib/contracts';

// Contract between the founder's own-device classifier and the brief editor. Only
// allowlisted labels cross this boundary, and every result is a suggestion: nothing here
// publishes a brief or stands in for the founder's approval. There is no cloud fallback:
// anything that is not a valid answer from a loopback classifier becomes 'unavailable'.

export type Skill = (typeof SKILLS)[number];
export type Interest = (typeof INTERESTS)[number];

export type LocalClassification = {
  /** 'ready' is kept for compatibility but never produced: suggestions always need review. */
  status: 'ready' | 'needs_review' | 'unavailable';
  engine: 'laya-local';
  suggested: {
    offers: Skill[];
    seeks: Skill[];
    interests: Interest[];
    /** null when the source does not state it; the founder enters it. */
    availability: MatchingCard['availability'] | null;
  };
  /** Fixed text chosen here, never copied from the classifier, so no input is echoed. */
  message: string;
};

export const LOCAL_CLASSIFIER_URL = 'http://127.0.0.1:11435/classify';
export const DEFAULT_TIMEOUT_MS = 8000;
const LIMITS = { offers: 5, seeks: 5, interests: 4 } as const;
const AVAILABILITY = ['exploring', 'weekends', 'full_time'] as const;

export type UnavailableReason = 'not_running' | 'not_ready' | 'not_loopback' | 'invalid_response' | 'empty_input' | 'not_browser';
const MESSAGES = {
  needs_review: 'Suggested by the classifier on this device. Check each label before you publish; nothing is published automatically.',
  not_running: 'The classifier is not running on this device, so nothing was classified. Fill in your brief yourself.',
  not_ready: 'The classifier on this device is not ready (still loading, or Laya is not installed), so nothing was classified. Fill in your brief yourself or try again in a minute.',
  not_loopback: 'The classifier address is not on this device, so nothing was sent. Fill in your brief yourself.',
  invalid_response: 'The classifier on this device returned an unexpected answer, so it was ignored. Fill in your brief yourself.',
  empty_input: 'There is no profile text to classify yet.',
  not_browser: 'Classification only runs from your own browser, so nothing was classified.',
} satisfies Record<UnavailableReason | 'needs_review', string>;

const empty = (): LocalClassification['suggested'] => ({ offers: [], seeks: [], interests: [], availability: null });

export function unavailableClassification(reason: UnavailableReason): LocalClassification {
  return { status: 'unavailable', engine: 'laya-local', suggested: empty(), message: MESSAGES[reason] };
}

const response = z.object({
  status: z.string(),
  suggested: z.object({
    offers: z.array(z.string()).optional(),
    seeks: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    availability: z.string().nullable().optional(),
  }).optional(),
});

const allowed = <T extends string>(values: string[] | undefined, allow: readonly T[], max: number): T[] =>
  [...new Set((values ?? []).filter((v): v is T => (allow as readonly string[]).includes(v)))].slice(0, max);

/**
 * Validates a classifier answer. Drops any label outside the allowlist, caps list sizes
 * to the brief limits and downgrades 'ready' to 'needs_review'. Never throws.
 */
export function sanitizeClassification(raw: unknown): LocalClassification {
  const parsed = response.safeParse(raw);
  if (!parsed.success) return unavailableClassification('invalid_response');
  if (parsed.data.status === 'unavailable') return unavailableClassification('not_ready');
  if (parsed.data.status !== 'ready' && parsed.data.status !== 'needs_review') return unavailableClassification('invalid_response');
  const s = parsed.data.suggested ?? {};
  const availability = (AVAILABILITY as readonly string[]).includes(s.availability ?? '') ? s.availability as MatchingCard['availability'] : null;
  return {
    status: 'needs_review',
    engine: 'laya-local',
    suggested: {
      offers: allowed(s.offers, SKILLS, LIMITS.offers),
      seeks: allowed(s.seeks, SKILLS, LIMITS.seeks),
      interests: allowed(s.interests, INTERESTS, LIMITS.interests),
      availability,
    },
    message: MESSAGES.needs_review,
  };
}

/** Plain http to 127.0.0.1, localhost or [::1] only, so profile text cannot leave the device. */
export function isLoopbackUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

export type ClassifyOptions = { url?: string; fetchImpl?: typeof fetch; timeoutMs?: number };

/** Sends the text to the loopback classifier and sanitizes the answer. Never throws. */
export async function requestLocalClassification(text: string, options: ClassifyOptions = {}): Promise<LocalClassification> {
  const url = options.url ?? LOCAL_CLASSIFIER_URL;
  if (!isLoopbackUrl(url)) return unavailableClassification('not_loopback');
  if (!text.trim()) return unavailableClassification('empty_input');
  let res: Response;
  try {
    res = await (options.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch {
    return unavailableClassification('not_running');
  }
  // 503: the companion is up but Laya is loading or failed to load.
  if (!res.ok) return unavailableClassification(res.status === 503 ? 'not_ready' : 'invalid_response');
  return sanitizeClassification(await res.json().catch(() => null));
}

/**
 * Browser entry point for the private profile panel. On the shared server, 127.0.0.1 is
 * the organizer's machine, not the founder's, so server-side calls are refused.
 */
export function classifyLocally(text: string, options: ClassifyOptions = {}): Promise<LocalClassification> {
  if (typeof window === 'undefined') return Promise.resolve(unavailableClassification('not_browser'));
  return requestLocalClassification(text, options);
}
