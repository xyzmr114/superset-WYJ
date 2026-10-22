import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftMarkdown } from './pitches';
import { q, type Match } from './store';
import { proposeOpportunity } from '../generation';
import { founderA, founderB } from '../../fixtures/profiles';
import { evidenceFixture } from '../../fixtures/evidence';

test('server pitch draft uses the shared pitch sections and keeps identities out', async () => {
  delete process.env.DATABASE_URL; // in-memory PGlite; never touch a real database from tests
  const evidence = evidenceFixture['developer-tools'];
  const a = { ...founderA, id: 'pitch-test-a' }, b = { ...founderB, id: 'pitch-test-b' };
  for (const [c, name, contact] of [[a, 'Real Name A', 'a-private@example.invalid'], [b, 'Real Name B', 'b-private@example.invalid']] as const) {
    await q('insert into participants (id, event_id) values ($1, $2) on conflict do nothing', [c.id, c.eventId]);
    await q(
      `insert into cards (participant_id, event_id, alias, offers, seeks, interests, availability, approved_blurb)
       values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict do nothing`,
      [c.id, c.eventId, c.alias, c.offers, c.seeks, c.interests, c.availability, c.approvedBlurb],
    );
    await q('insert into identities (participant_id, display_name, contact) values ($1, $2, $3) on conflict do nothing', [c.id, name, contact]);
  }
  const match: Match = {
    id: 'pitch-test-match', eventId: a.eventId, a: a.id, b: b.id, score: 90,
    opportunity: proposeOpportunity(a, b, evidence), evidence,
    approvals: new Set([a.id, b.id]), declinedBy: null,
  };
  const md = await draftMarkdown(match);
  const headings = md.split('\n').filter(l => l.startsWith('## ')).map(l => l.slice(3));
  assert.deepEqual(headings, ['Problem hypothesis', 'Proposed product', 'Target customer', 'Team complementarity', 'Public evidence', 'First 48-hour experiment', 'Why explore this with super{set}?', 'Open questions']);
  for (const leak of ['Real Name', 'private@example.invalid', a.id, b.id]) assert.ok(!md.includes(leak), leak);
  assert.ok(md.includes(a.alias) && md.includes(b.alias));
});
