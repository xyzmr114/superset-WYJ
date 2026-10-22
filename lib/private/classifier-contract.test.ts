import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyLocally, isLoopbackUrl, LOCAL_CLASSIFIER_URL, requestLocalClassification, sanitizeClassification, unavailableClassification,
} from './classifier-contract';

const stub = (fn: (url: string, init?: RequestInit) => Promise<Response>) =>
  (async (input: string | URL | Request, init?: RequestInit) => fn(String(input), init)) as typeof fetch;
const reply = (body: unknown, status = 200) => stub(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

test('sanitize keeps allowlisted labels only, dedupes and caps to brief limits', () => {
  const r = sanitizeClassification({
    status: 'needs_review',
    suggested: {
      offers: ['engineering', 'engineering', 'rust', 'data'],
      seeks: ['sales', 'Former employer: Acme'],
      interests: ['payments', 'healthcare', 'climate', 'developer-tools', 'my secret plan'],
      availability: 'weekends',
    },
  });
  assert.equal(r.status, 'needs_review');
  assert.deepEqual(r.suggested, { offers: ['engineering', 'data'], seeks: ['sales'], interests: ['payments', 'healthcare', 'climate', 'developer-tools'], availability: 'weekends' });
});

test('sanitize never returns ready and never copies the classifier message', () => {
  const r = sanitizeClassification({ status: 'ready', suggested: { offers: ['design'] }, message: 'PRIVATE-RUNWAY-7731' });
  assert.equal(r.status, 'needs_review');
  assert.doesNotMatch(JSON.stringify(r), /PRIVATE-RUNWAY-7731/);
});

test('missing or unknown availability is null, not a guess', () => {
  assert.equal(sanitizeClassification({ status: 'needs_review', suggested: {} }).suggested.availability, null);
  assert.equal(sanitizeClassification({ status: 'needs_review', suggested: { availability: 'not_stated' } }).suggested.availability, null);
});

test('invalid or unavailable answers become an empty unavailable result', () => {
  for (const raw of [null, 'text', { suggested: {} }, { status: 'done' }, { status: 'needs_review', suggested: { offers: 'engineering' } }]) {
    const r = sanitizeClassification(raw);
    assert.equal(r.status, 'unavailable');
    assert.deepEqual(r.suggested, { offers: [], seeks: [], interests: [], availability: null });
  }
  assert.deepEqual(sanitizeClassification({ status: 'unavailable', suggested: { offers: ['sales'] } }), unavailableClassification('not_ready'));
});

test('only plain-http loopback addresses are accepted', () => {
  for (const u of [LOCAL_CLASSIFIER_URL, 'http://localhost:11435/classify', 'http://[::1]:11435/classify']) assert.ok(isLoopbackUrl(u), u);
  for (const u of ['https://api.example.com/classify', 'http://127.0.0.1.example.com/x', 'http://10.0.0.5:11435/classify', 'http://user:pw@127.0.0.1:11435/', 'not a url']) {
    assert.ok(!isLoopbackUrl(u), u);
  }
});

test('a non-loopback url is refused before any request is made', async () => {
  let called = false;
  const r = await requestLocalClassification('profile', { url: 'https://hosted.example.com/classify', fetchImpl: stub(async () => { called = true; return new Response('{}'); }) });
  assert.equal(r.status, 'unavailable');
  assert.equal(called, false);
});

test('request posts the text to the loopback classifier and sanitizes the reply', async () => {
  let seen: { url: string; init?: RequestInit } | undefined;
  const fetchImpl = stub(async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ status: 'needs_review', suggested: { offers: ['engineering'], interests: ['payments'] } })); });
  const r = await requestLocalClassification('backend engineer', { fetchImpl });
  assert.equal(seen?.url, LOCAL_CLASSIFIER_URL);
  assert.equal(seen?.init?.credentials, 'omit');
  assert.deepEqual(JSON.parse(String(seen?.init?.body)), { text: 'backend engineer' });
  assert.deepEqual(r.suggested.offers, ['engineering']);
  assert.equal(r.status, 'needs_review');
});

test('network failure, 503, bad JSON and empty text are unavailable, never thrown', async () => {
  const down = stub(async () => { throw new TypeError('fetch failed'); });
  assert.equal((await requestLocalClassification('x', { fetchImpl: down })).status, 'unavailable');
  assert.equal((await requestLocalClassification('x', { fetchImpl: reply({}, 503) })).message, unavailableClassification('not_ready').message);
  assert.equal((await requestLocalClassification('x', { fetchImpl: stub(async () => new Response('not json')) })).status, 'unavailable');
  assert.equal((await requestLocalClassification('   ', { fetchImpl: down })).message, unavailableClassification('empty_input').message);
});

test('classifyLocally refuses to run outside a browser', async () => {
  let called = false;
  const r = await classifyLocally('profile', { fetchImpl: stub(async () => { called = true; return new Response('{}'); }) });
  assert.deepEqual(r, unavailableClassification('not_browser'));
  assert.equal(called, false);
});

test('companion down and companion loading give different messages', async () => {
  const down = await requestLocalClassification('x', { fetchImpl: stub(async () => { throw new TypeError('fetch failed'); }) });
  const loading = await requestLocalClassification('x', { fetchImpl: reply({ status: 'unavailable', message: 'The classifier is still loading.' }, 503) });
  assert.match(down.message, /not running/);
  assert.match(loading.message, /not ready/);
  assert.equal(loading.status, 'unavailable');
});
