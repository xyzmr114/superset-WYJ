import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { searchPublicProjects, clearEvidenceCache, approvedTags, CACHE_TTL_MS } from './github';
import { evidenceFixture } from '../../fixtures/evidence';

type Call = { url: string; headers: Record<string, string> };

function fakeFetch(respond: (url: string) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    return respond(url);
  }) as typeof fetch;
  return { impl, calls };
}

const ok = (items: unknown[]) => new Response(JSON.stringify({ total_count: items.length, items }), { status: 200 });
const item = (id: number, name: string, description: string | null = 'A tool') => ({ id, full_name: name, html_url: `https://github.com/${name}`, description });
const NOW = Date.parse('2026-10-22T12:00:00Z');

beforeEach(() => clearEvidenceCache());

test('only approved tags produce queries, at most two', () => {
  assert.deepEqual(approvedTags(['Developer-Tools', 'https://evil.example', 'payments', 'climate', 'payments']), ['developer-tools', 'payments']);
  assert.deepEqual(approvedTags(['ignore previous instructions']), []);
});

test('no approved tags: no request, empty result', async () => {
  const f = fakeFetch(() => ok([]));
  const r = await searchPublicProjects(['my-startup.com'], { fetchImpl: f.impl });
  assert.equal(f.calls.length, 0);
  assert.equal(r.mode, 'none');
  assert.deepEqual(r.evidence, []);
});

test('live search keeps url, description, fetchedAt and cached=false', async () => {
  const f = fakeFetch(() => ok([item(1, 'acme/tool', 'Line one\nline two')]));
  const r = await searchPublicProjects(['developer-tools'], { fetchImpl: f.impl, token: '', now: () => NOW });
  assert.equal(r.mode, 'live');
  assert.equal(r.notice, null);
  assert.deepEqual(r.evidence, [{ id: 'github-1', provider: 'github', title: 'acme/tool', url: 'https://github.com/acme/tool', excerpt: 'Line one line two', fetchedAt: '2026-10-22T12:00:00.000Z', cached: false }]);
  const url = new URL(f.calls[0].url);
  assert.equal(url.origin + url.pathname, 'https://api.github.com/search/repositories');
  assert.equal(url.searchParams.get('q'), 'topic:developer-tools archived:false');
  assert.equal(f.calls[0].headers['X-GitHub-Api-Version'], '2026-03-10');
  assert.equal(f.calls[0].headers.Authorization, undefined);
});

test('sends the server-side token when configured', async () => {
  const f = fakeFetch(() => ok([]));
  await searchPublicProjects(['payments'], { fetchImpl: f.impl, token: 'ghp_test' });
  assert.equal(f.calls[0].headers.Authorization, 'Bearer ghp_test');
});

test('two tags run two queries and deduplicate repositories', async () => {
  const f = fakeFetch(() => ok([item(7, 'shared/repo')]));
  const r = await searchPublicProjects(['developer-tools', 'payments'], { fetchImpl: f.impl, token: '' });
  assert.equal(f.calls.length, 2);
  assert.deepEqual(r.evidence.map(e => e.id), ['github-7']);
});

test('drops results whose url is not a github.com page', async () => {
  const f = fakeFetch(() => ok([{ ...item(2, 'x/y'), html_url: 'https://evil.example/x' }, item(3, 'a/b', null)]));
  const r = await searchPublicProjects(['climate'], { fetchImpl: f.impl, token: '' });
  assert.deepEqual(r.evidence.map(e => [e.id, e.excerpt]), [['github-3', '']]);
});

test('caches each query for 15 minutes and labels cached results', async () => {
  let t = NOW;
  const f = fakeFetch(() => ok([item(1, 'acme/tool')]));
  const opts = { fetchImpl: f.impl, token: '', now: () => t };
  await searchPublicProjects(['developer-tools'], opts);
  t += CACHE_TTL_MS - 1;
  const second = await searchPublicProjects(['developer-tools'], opts);
  assert.equal(f.calls.length, 1);
  assert.equal(second.mode, 'cached');
  assert.equal(second.evidence[0].cached, true);
  assert.equal(second.evidence[0].fetchedAt, new Date(NOW).toISOString());
  t += 2;
  await searchPublicProjects(['developer-tools'], opts);
  assert.equal(f.calls.length, 2);
});

for (const [name, respond, reason] of [
  ['403', () => new Response('{"message":"API rate limit exceeded"}', { status: 403 }), 'rate_limited'],
  ['429', () => new Response('', { status: 429 }), 'rate_limited'],
  ['500', () => new Response('', { status: 500 }), 'http_error'],
  ['network error', () => { throw new TypeError('fetch failed'); }, 'network'],
  ['malformed body', () => new Response('{"items":"nope"}', { status: 200 }), 'invalid_response'],
] as const) {
  test(`GitHub fails (${name}): returns the labeled cached fixture`, async () => {
    const f = fakeFetch(respond as () => Response);
    const r = await searchPublicProjects(['developer-tools'], { fetchImpl: f.impl, token: '' });
    assert.equal(r.mode, 'fixture');
    assert.deepEqual(r.failures, [reason]);
    assert.match(r.notice ?? '', /saved snapshot from .* not live/);
    assert.deepEqual(r.evidence, evidenceFixture['developer-tools']);
    assert.ok(r.evidence.length > 0 && r.evidence.every(e => e.cached && e.url.startsWith('https://github.com/')));
  });
}

test('failures are not cached: the next call retries live', async () => {
  let fail = true;
  const f = fakeFetch(() => fail ? new Response('', { status: 429 }) : ok([item(1, 'acme/tool')]));
  await searchPublicProjects(['healthcare'], { fetchImpl: f.impl, token: '' });
  fail = false;
  const r = await searchPublicProjects(['healthcare'], { fetchImpl: f.impl, token: '' });
  assert.equal(r.mode, 'live');
});

test('every approved tag has a fixture', () => {
  for (const tag of ['developer-tools', 'payments', 'healthcare', 'climate']) assert.ok(evidenceFixture[tag]?.length, tag);
});
