import { z } from 'zod';
import { INTERESTS, type Evidence } from '@/lib/contracts';
import { evidenceFixture, EVIDENCE_SNAPSHOT_AT } from '@/fixtures/evidence';
export { EVIDENCE_CAVEAT } from './caveat';

// Server-side only: may read GITHUB_TOKEN. Queries are built from a fixed table keyed by
// approved interest tags, so no participant text or URL ever reaches the request.
// Docs: https://docs.github.com/en/rest/search/search#search-repositories

export const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_QUERIES = 2;
const PER_QUERY = 5;
const MAX_RESULTS = 5;
const API_VERSION = '2026-03-10';

type Tag = (typeof INTERESTS)[number];
// Narrow on purpose: each query targets tooling adjacent to the demo hypothesis for that
// domain. developer-tools covers integration plumbing (webhooks) and customer feedback.
const QUERIES_BY_TAG: Record<Tag, string[]> = {
  'developer-tools': [
    'webhooks service in:description topic:webhooks archived:false',
    'topic:customer-feedback archived:false',
  ],
  payments: ['topic:payments archived:false'],
  healthcare: ['topic:healthcare archived:false'],
  climate: ['topic:climate-change archived:false'],
};

export type EvidenceMode = 'live' | 'cached' | 'fixture' | 'none';
export type FailureReason = 'rate_limited' | 'http_error' | 'network' | 'invalid_response';

export type EvidenceResult = {
  evidence: Evidence[];
  /** Worst source used: fixture > cached > live. 'none' when no approved tag was given. */
  mode: EvidenceMode;
  /** User-facing label when anything is not live. */
  notice: string | null;
  failures: FailureReason[];
};

export type SearchOptions = {
  fetchImpl?: typeof fetch;
  token?: string;
  now?: () => number;
  timeoutMs?: number;
};

const searchResponse = z.object({
  items: z.array(z.object({
    id: z.number(),
    full_name: z.string(),
    html_url: z.string(),
    description: z.string().nullable(),
  })),
});

type Entry = { at: number; evidence: Evidence[] };
const cache = new Map<string, Entry>();
export function clearEvidenceCache() { cache.clear(); }

const isApprovedTag = (t: string): t is Tag => (INTERESTS as readonly string[]).includes(t);

/** Approved tags, deduplicated, in the order given, at most two. */
export function approvedTags(tags: string[]): Tag[] {
  return [...new Set(tags.map(t => t.trim().toLowerCase()))].filter(isApprovedTag).slice(0, MAX_QUERIES);
}

/** At most two fixed queries, taken round-robin across the approved tags. */
export function queriesFor(tags: string[]): { tag: Tag; query: string }[] {
  const lists = approvedTags(tags).map(tag => QUERIES_BY_TAG[tag].map(query => ({ tag, query })));
  const out: { tag: Tag; query: string }[] = [];
  for (let i = 0; out.length < MAX_QUERIES && lists.some(l => i < l.length); i++) {
    for (const l of lists) if (i < l.length && out.length < MAX_QUERIES) out.push(l[i]);
  }
  return out;
}

// Alternate between query results so each query is represented in the top results.
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; lists.some(l => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

// Repository text is untrusted: keep it short and single-line before it goes anywhere.
const clean = (s: string, max: number) => {
  const flat = s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

class SearchFailure extends Error { constructor(public reason: FailureReason) { super(reason); } }

async function fetchQuery(query: string, opts: Required<Pick<SearchOptions, 'fetchImpl' | 'now' | 'timeoutMs'>> & { token?: string }): Promise<Evidence[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${PER_QUERY}`;
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': API_VERSION, 'User-Agent': 'would-you-jump' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let response: Response;
  try {
    response = await opts.fetchImpl(url, { headers, signal: AbortSignal.timeout(opts.timeoutMs) });
  } catch {
    throw new SearchFailure('network');
  }
  if (response.status === 403 || response.status === 429) throw new SearchFailure('rate_limited');
  if (!response.ok) throw new SearchFailure('http_error');
  const parsed = searchResponse.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new SearchFailure('invalid_response');
  const fetchedAt = new Date(opts.now()).toISOString();
  return parsed.data.items
    .filter(item => item.html_url.startsWith('https://github.com/'))
    .map(item => ({
      id: `github-${item.id}`, provider: 'github' as const,
      title: clean(item.full_name, 100), url: item.html_url,
      excerpt: clean(item.description ?? '', 280), fetchedAt, cached: false,
    }));
}

const snapshotDate = new Date(EVIDENCE_SNAPSHOT_AT).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const FAILURE_LABEL: Record<FailureReason, string> = {
  rate_limited: 'rate limited', http_error: 'returned an error', network: 'unreachable', invalid_response: 'returned an unexpected response',
};

/**
 * Searches public GitHub repositories with at most two fixed queries chosen by approved
 * interest tags (pass the pair's shared interests). Returns up to five results.
 * Never throws: a failed query is replaced by the labeled saved snapshot for its tag.
 */
export async function searchPublicProjects(tags: string[], options: SearchOptions = {}): Promise<EvidenceResult> {
  if (typeof window !== 'undefined') throw new Error('searchPublicProjects is server-only');
  const opts = {
    fetchImpl: options.fetchImpl ?? fetch,
    token: options.token ?? process.env.GITHUB_TOKEN ?? undefined,
    now: options.now ?? Date.now,
    timeoutMs: options.timeoutMs ?? 5000,
  };
  const selected = queriesFor(tags);
  if (!selected.length) return { evidence: [], mode: 'none', notice: null, failures: [] };

  const sources = new Set<Exclude<EvidenceMode, 'none'>>();
  const failures: FailureReason[] = [];
  const batches = await Promise.all(selected.map(async ({ tag, query }) => {
    const hit = cache.get(query);
    if (hit && opts.now() - hit.at < CACHE_TTL_MS) {
      sources.add('cached');
      return hit.evidence.map(e => ({ ...e, cached: true }));
    }
    try {
      const evidence = await fetchQuery(query, opts);
      cache.set(query, { at: opts.now(), evidence });
      sources.add('live');
      return evidence;
    } catch (e) {
      failures.push(e instanceof SearchFailure ? e.reason : 'network');
      sources.add('fixture');
      return evidenceFixture[tag] ?? [];
    }
  }));

  const seen = new Set<string>();
  const evidence = interleave(batches).filter(e => !seen.has(e.id) && seen.add(e.id)).slice(0, MAX_RESULTS);
  const mode = sources.has('fixture') ? 'fixture' : sources.has('cached') ? 'cached' : 'live';
  const notice = mode === 'fixture'
    ? `GitHub search was ${FAILURE_LABEL[failures[0]]}. Showing a saved snapshot from ${snapshotDate}, not live results.`
    : mode === 'cached' ? 'Showing GitHub results fetched in the last 15 minutes.' : null;
  return { evidence, mode, notice, failures };
}
