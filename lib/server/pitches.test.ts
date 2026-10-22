import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftMarkdown } from './pitches';
import { db, type Match } from './store';
import { proposeOpportunity } from '../generation';
import { founderA, founderB } from '../../fixtures/profiles';
import { evidenceFixture } from '../../fixtures/evidence';

test('server pitch draft uses the shared pitch sections and keeps identities out', () => {
  const evidence = evidenceFixture['developer-tools'];
  const a = { ...founderA, id: 'pitch-test-a' }, b = { ...founderB, id: 'pitch-test-b' };
  db.cards.set(a.id, a);
  db.cards.set(b.id, b);
  db.identities.set(a.id, { displayName: 'Real Name A', contact: 'a-private@example.invalid' });
  db.identities.set(b.id, { displayName: 'Real Name B', contact: 'b-private@example.invalid' });
  const match: Match = {
    id: 'pitch-test-match', eventId: a.eventId, a: a.id, b: b.id, score: 90,
    opportunity: proposeOpportunity(a, b, evidence), evidence,
    approvals: new Set([a.id, b.id]), declinedBy: null,
  };
  const md = draftMarkdown(match);
  const headings = md.split('\n').filter(l => l.startsWith('## ')).map(l => l.slice(3));
  assert.deepEqual(headings, ['Problem hypothesis', 'Proposed product', 'Target customer', 'Team complementarity', 'Public evidence', 'First 48-hour experiment', 'Why explore this with super{set}?', 'Open questions']);
  for (const leak of ['Real Name', 'private@example.invalid', a.id, b.id]) assert.ok(!md.includes(leak), leak);
  assert.ok(md.includes(a.alias) && md.includes(b.alias));
});
