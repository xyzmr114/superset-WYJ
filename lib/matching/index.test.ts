import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankCandidates, scorePair, MAX_MATCHES } from './index';
import type { MatchingCard } from '../contracts';
import { founderA, founderB, distractors, profiles, isSyntheticProfile } from '../../fixtures/profiles';

const me: MatchingCard = { id: 'a', eventId: 'event', alias: 'A', offers: ['engineering'], seeks: ['sales'], interests: ['developer-tools'], availability: 'weekends', approvedBlurb: '', version: 1 };

test('excludes self and other events; ranks complementary skills', () => {
  const partner = { ...me, id: 'b', offers: ['sales'], seeks: ['engineering'] };
  const result = rankCandidates(me, [me, { ...partner, id: 'outside', eventId: 'elsewhere' }, partner]);
  assert.equal(result.length, 1);
  assert.equal(result[0].candidate.id, 'b');
  assert.equal(result[0].score, 100);
});

test('no matches: unrelated attendees return an empty list', () => {
  assert.deepEqual(rankCandidates(me, [{ ...me, id: 'c', interests: ['climate'], offers: ['design'], seeks: ['data'], availability: 'full_time' }]), []);
  assert.deepEqual(rankCandidates(me, []), []);
});

test('excludes declined candidates', () => {
  const result = rankCandidates(founderA, profiles, { declinedIds: [founderB.id] });
  assert.ok(!result.some(r => r.candidate.id === founderB.id));
});

test('returns at most three, sorted by score then id', () => {
  const many = Array.from({ length: 6 }, (_, i) => ({ ...me, id: `p${5 - i}`, offers: ['sales'], seeks: ['engineering'] }));
  const result = rankCandidates(me, many, { limit: 10 });
  assert.equal(result.length, MAX_MATCHES);
  assert.deepEqual(result.map(r => r.candidate.id), ['p0', 'p1', 'p2']);
});

test('ignores duplicate candidate cards', () => {
  const partner = { ...me, id: 'b', offers: ['sales'], seeks: ['engineering'] };
  assert.equal(rankCandidates(me, [partner, partner]).length, 1);
});

test('score components are bounded and explained as heuristics', () => {
  for (const other of profiles) {
    const s = scorePair(founderA, other);
    assert.equal(s.score, s.components.reduce((n, c) => n + c.points, 0));
    assert.ok(s.score >= 0 && s.score <= 100);
    for (const c of s.components) {
      assert.ok(c.points >= 0 && c.points <= c.max, `${c.key} out of range`);
      assert.match(c.reason, /^Heuristic: /);
      assert.doesNotMatch(c.reason, /will succeed|guarantee|predict/i);
    }
  }
});

test('partial skill coverage earns partial points', () => {
  const s = scorePair(me, { ...me, id: 'x', offers: ['sales'], seeks: ['engineering', 'design'] });
  assert.equal(s.components.find(c => c.key === 'complementarity')!.points, 30);
});

test('availability: same 20, adjacent 10, far apart 0', () => {
  const pts = (availability: MatchingCard['availability']) =>
    scorePair({ ...me, availability: 'exploring' }, { ...me, id: 'x', availability }).components.find(c => c.key === 'availability')!.points;
  assert.deepEqual([pts('exploring'), pts('weekends'), pts('full_time')], [20, 10, 0]);
});

test('demo: Founder A and Founder B rank each other first', () => {
  const forA = rankCandidates(founderA, profiles);
  const forB = rankCandidates(founderB, profiles);
  assert.equal(forA[0].candidate.id, founderB.id);
  assert.equal(forB[0].candidate.id, founderA.id);
  assert.equal(forA[0].score, 90);
  assert.deepEqual(forA[0].sharedInterests, ['developer-tools']);
});

test('demo: out-of-domain distractors fall below the threshold', () => {
  const ids = rankCandidates(founderA, profiles).map(r => r.candidate.id);
  for (const d of distractors.filter(d => !d.interests.includes('developer-tools'))) assert.ok(!ids.includes(d.id), d.alias);
});

test('fixtures are six labeled synthetic profiles', () => {
  assert.equal(profiles.length, 6);
  for (const p of profiles) {
    assert.ok(isSyntheticProfile(p));
    assert.match(p.approvedBlurb, /^Synthetic profile\./);
  }
});
