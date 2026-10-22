import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLocally } from './local-classifier';

const originalFetch = globalThis.fetch;
function setup(response: unknown) {
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  const calls: { url: unknown; options?: RequestInit }[] = [];
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: async (url: RequestInfo | URL, options?: RequestInit) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json' } });
  } });
  return calls;
}
function cleanup() {
  globalThis.fetch = originalFetch;
  Reflect.deleteProperty(globalThis, 'window');
}
const valid = { status: 'needs_review', engine: 'laya-local', suggested: { offers: ['engineering'], seeks: ['sales'], interests: ['payments'], availability: 'exploring' }, message: 'PRIVATE_ECHO_DO_NOT_DISPLAY' };

test('private input goes directly to loopback without cookies; returned prose never enters UI', async () => {
  const calls = setup(valid);
  try {
    const result = await classifyLocally('PRIVATE_PROFILE', 'PRIVATE_IDEA');
    assert.equal(calls[0].url, 'http://127.0.0.1:11435/classify');
    assert.equal(calls[0].options?.credentials, 'omit');
    assert.deepEqual(JSON.parse(String(calls[0].options?.body)), { text: 'Profile: PRIVATE_PROFILE\nIdea: PRIVATE_IDEA' });
    assert.equal(result.status, 'needs_review');
    assert.deepEqual(result.suggested.interests, ['payments']);
    assert.ok(!JSON.stringify(result).includes('PRIVATE_'));
  } finally { cleanup(); }
});

test('unrecognized labels are dropped rather than entering a public brief', async () => {
  setup({ ...valid, suggested: { ...valid.suggested, offers: ['PRIVATE_EMPLOYER'] } });
  try {
    const result = await classifyLocally('private profile', 'private idea');
    assert.equal(result.status, 'needs_review');
    assert.deepEqual(result.suggested.offers, []);
  } finally { cleanup(); }
});

test('network failure has no hosted fallback', async () => {
  const calls = setup(valid);
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: async () => { calls.push({ url: 'failed' }); throw new Error('unreachable'); } });
  try {
    assert.equal((await classifyLocally('profile', 'idea')).status, 'unavailable');
    assert.equal(calls.length, 1);
  } finally { cleanup(); }
});

test('server-side calls never submit raw input', async () => {
  Reflect.deleteProperty(globalThis, 'window');
  let called = false;
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: async () => { called = true; throw new Error(); } });
  try {
    assert.equal((await classifyLocally('private', 'idea')).status, 'unavailable');
    assert.equal(called, false);
  } finally { cleanup(); }
});
