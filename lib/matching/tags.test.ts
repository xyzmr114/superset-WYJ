import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTag, mapTag, scorePair, rankCandidates } from './index';
import { INTERESTS, SKILLS, type MatchingCard } from '../contracts';

const card = (c: Partial<MatchingCard> & { id: string }): MatchingCard => ({
  eventId: 'event', alias: c.id, offers: [], seeks: [], interests: [], availability: 'weekends', approvedBlurb: '', version: 1, ...c,
});
const part = (s: ReturnType<typeof scorePair>, key: string) => s.components.find(c => c.key === key)!;

test('normalizeTag: case, spacing, separators and punctuation', () => {
  assert.equal(normalizeTag('  Developer-Tools '), 'developer tools');
  assert.equal(normalizeTag('developer_tools'), 'developer tools');
  assert.equal(normalizeTag('Developer   Tools'), 'developer tools');
  assert.equal(normalizeTag('Node.js!'), 'nodejs');
  assert.equal(normalizeTag('AI/ML'), 'aiml');
  assert.equal(normalizeTag('  ...  '), '');
});

test('base tags map to themselves; synonyms map to existing base tags only', () => {
  for (const t of SKILLS) assert.deepEqual(mapTag(t, 'skill'), { original: t, tag: t, via: 'exact' });
  for (const t of INTERESTS) assert.equal(mapTag(t, 'interest')?.tag, t);
  for (const [input, tag] of [['Rust', 'engineering'], ['golang', 'engineering'], ['React', 'engineering'], ['UI', 'design'],
    ['BD', 'sales'], ['account exec', 'sales'], ['Customer discovery', 'product'], ['PM', 'product'], ['Data Science', 'data'], ['AI/ML', 'data']] as const) {
    assert.deepEqual(mapTag(input, 'skill'), { original: input, tag, via: 'synonym' }, input);
  }
  for (const [input, tag] of [['DevTools', 'developer-tools'], ['DX', 'developer-tools'], ['Fintech', 'payments'], ['billing', 'payments']] as const) {
    assert.equal(mapTag(input, 'interest')?.tag, tag, input);
  }
  assert.deepEqual(mapTag('Robotics', 'interest'), { original: 'Robotics', tag: 'robotics', via: 'custom' });
  assert.equal(mapTag('   ', 'skill'), null);
});

test('"rust" matches someone seeking backend, and the reason says why', () => {
  const rustacean = card({ id: 'r', offers: ['Rust'], seeks: ['sales'], interests: ['developer-tools'] });
  const seeker = card({ id: 's', offers: ['sales'], seeks: ['Backend'], interests: ['developer-tools'] });
  const s = scorePair(rustacean, seeker);
  assert.equal(part(s, 'complementarity').points, 40);
  assert.match(part(s, 'complementarity').reason, /you offer Rust \(counts as engineering\), which they seek/);
  assert.equal(rankCandidates(rustacean, [seeker])[0]?.candidate.id, 's');
});

test('case and spacing variants of the same interest match', () => {
  const a = card({ id: 'a', interests: ['Developer Tools'] });
  for (const variant of ['developer-tools', 'developer_tools', 'DEVELOPER   TOOLS', 'devtools', ' DevTools ']) {
    const s = scorePair(a, card({ id: 'b', interests: [variant] }));
    assert.equal(part(s, 'interests').points, 40, variant);
    assert.deepEqual(s.sharedInterests, ['developer-tools'], variant);
  }
});

test('interest synonyms are named in the reason', () => {
  const s = scorePair(card({ id: 'a', interests: ['fintech'] }), card({ id: 'b', interests: ['payments'] }));
  assert.match(part(s, 'interests').reason, /payments \(your "fintech" counts as payments\)/);
});

test('two identical custom tags match after normalization', () => {
  const s = scorePair(card({ id: 'a', interests: ['Robotics'], offers: ['Welding'] }), card({ id: 'b', interests: ['robotics '], seeks: ['welding'] }));
  assert.equal(part(s, 'interests').points, 40);
  assert.match(part(s, 'interests').reason, /you both listed Robotics/);
  assert.match(part(s, 'complementarity').reason, /you offer Welding, which they seek/);
});

test('unrelated terms do not match', () => {
  const s = scorePair(
    card({ id: 'a', offers: ['pottery'], seeks: ['gardening'], interests: ['robotics'], availability: 'exploring' }),
    card({ id: 'b', offers: ['backend'], seeks: ['sales'], interests: ['gaming'], availability: 'full_time' }),
  );
  assert.equal(s.score, 0);
  assert.deepEqual(rankCandidates(card({ id: 'a', offers: ['pottery'], interests: ['robotics'] }), [card({ id: 'b', seeks: ['backend'], interests: ['gaming'] })]), []);
});

test('cards keep the text people typed; only scoring uses mapped tags', () => {
  const b = card({ id: 'b', offers: ['Account Exec'], interests: ['DevTools'] });
  const before = structuredClone(b);
  const [r] = rankCandidates(card({ id: 'a', offers: ['Rust'], seeks: ['sales'], interests: ['developer-tools'] }), [b], { minScore: 0 });
  assert.deepEqual(r.candidate, before);
});
