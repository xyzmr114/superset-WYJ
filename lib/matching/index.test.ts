import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankCandidates, scorePair, MAX_MATCHES } from './index';
import type { MatchingCard } from '../contracts';
import { founderA, founderB, distractors, profiles, allProfiles, isSyntheticProfile } from '../../fixtures/profiles';

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
  const result = rankCandidates(founderA, allProfiles, { declinedIds: [founderB.id] });
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
  for (const other of allProfiles) {
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
  const forA = rankCandidates(founderA, allProfiles);
  const forB = rankCandidates(founderB, allProfiles);
  assert.equal(forA[0].candidate.id, founderB.id);
  assert.equal(forB[0].candidate.id, founderA.id);
  assert.equal(forA[0].score, 90);
  assert.deepEqual(forA[0].sharedInterests, ['travel', 'ai-agents']);
});

test('demo: out-of-domain distractors fall below the threshold', () => {
  const ids = rankCandidates(founderA, allProfiles).map(r => r.candidate.id);
  for (const d of distractors.filter(d => !d.interests.includes('travel'))) assert.ok(!ids.includes(d.id), d.alias);
});

test('server pool is the four distractors; founders are exported separately', () => {
  assert.deepEqual(profiles.map(p => p.id), distractors.map(p => p.id));
  assert.ok(!profiles.some(p => p.id === founderA.id || p.id === founderB.id));
});

test('fixtures are six labeled synthetic profiles', () => {
  assert.equal(allProfiles.length, 6);
  for (const p of allProfiles) {
    assert.ok(isSyntheticProfile(p));
    assert.match(p.approvedBlurb, /^Synthetic profile\./);
    assert.ok(p.alias.length <= 40 && p.offers.length <= 5 && p.seeks.length <= 5 && p.interests.length <= 4 && p.approvedBlurb.length <= 240, p.alias);
  }
});

test('approved complementary soft strengths and shared preferences break otherwise equal scores', () => {
  const preferences = { techStack: ['TypeScript'], strengths: ['technical depth'], partnerStrengths: ['communication'], workStyles: ['async-first'] };
  const owner = { ...me, preferences };
  const weak = { ...me, id: 'a-first', offers: ['sales'], seeks: ['engineering'] };
  const complementary = { ...weak, id: 'z-match', preferences: { techStack: ['TypeScript'], strengths: ['communication'], partnerStrengths: ['technical depth'], workStyles: ['async-first'] } };
  const ranked = rankCandidates(owner, [weak, complementary]);
  assert.equal(ranked[0].candidate.id, complementary.id);
  assert.equal(ranked[0].score, ranked[1].score, 'preferences do not inflate the score');
  assert.ok(ranked[0].components.some(c => /communication.*wants in a partner/.test(c.reason)));
  assert.ok(ranked[0].components.some(c => /typescript.*preferred tech stack/.test(c.reason)));
  assert.ok(ranked[0].components.some(c => /async-first/.test(c.reason)));
});

test('shared direction filtering happens before the top-three cut', () => {
  const owner = { ...me, interests: ['developer-tools', 'travel', 'payments', 'climate'] };
  const unrelated = Array.from({ length: 3 }, (_, i) => ({ ...me, id: `unrelated-${i}`, interests: ['robotics'], offers: ['sales'], seeks: ['engineering'] }));
  const relevant = { ...me, id: 'relevant', offers: ['design'], seeks: ['data'], interests: ['travel'], availability: 'full_time' as const };
  const ranked = rankCandidates(owner, [...unrelated, relevant], { requireSharedInterest: true, minScore: 0 });
  assert.deepEqual(ranked.map(s => s.candidate.id), ['relevant']);
});

test('unapproved extra fields and arbitrary preference strings cannot affect ranking', () => {
  const p = { ...me, id: 'b', preferences: { techStack: ['No preference', 'secret employer'], strengths: ['inferred personality'], partnerStrengths: [], workStyles: [] }, rawProfile: 'secret' };
  assert.equal(scorePair(me, p).preferenceScore, 0);
  assert.ok(!JSON.stringify(scorePair(me, p).components).includes('secret'));
});


test('explicit unlimited mode returns every eligible founder beyond five without changing default cap', () => {
  const partners = Array.from({ length: 8 }, (_, i) => ({ ...me, id: `unlimited-${i}`, offers: ['sales'], seeks: ['engineering'] }));
  assert.equal(rankCandidates(me, partners, { limit: Infinity, requireSharedInterest: true }).length, 8);
  assert.equal(rankCandidates(me, partners).length, MAX_MATCHES);
});

test('explicitly approved custom stack and strengths participate in matching',()=>{const a={...me,preferences:{techStack:['Elixir'],strengths:[],partnerStrengths:['Horse training'],workStyles:[]}};const b={...me,id:'custom',preferences:{techStack:['elixir'],strengths:['horse training'],partnerStrengths:[],workStyles:[]}};assert.equal(scorePair(a,b).preferenceScore,3);});
