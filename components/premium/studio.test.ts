import test from 'node:test';
import assert from 'node:assert/strict';
import type { MatchingCard } from '@/lib/contracts';
import { emptyAnswers, ideaKey, makeIdeaMemo, unanswered, type StudioAnswers } from './studio';

const idea: MatchingCard = { id: 'idea-a', eventId: 'room', alias: 'Quiet Pine', version: 2, offers: ['engineering'], seeks: ['sales'], interests: ['travel'], availability: 'weekends', approvedBlurb: 'Booking infrastructure for travel agents.', preferences: { techStack: ['Python'], strengths: [], partnerStrengths: [], workStyles: [] } };
const answers: StudioAnswers = { customer: 'Independent travel advisers handling group trips', problem: 'Room allocations are lost between spreadsheets and hotel emails', workaround: 'Spreadsheets and forwarding emails', wedge: 'One rooming-list export from an uploaded itinerary', assumption: 'Advisers will trust an import of their booking details', experiment: 'Ask three advisers to use a manual rooming-list prototype on a redacted trip', signal: 'If two complete the export, test another trip; otherwise change the workflow', dataAccess: 'Use a redacted itinerary with explicit participant permission' };

test('studio cannot produce a polished memo without an experiment and decision rule', () => {
  assert.equal(unanswered(emptyAnswers).length, 6);
  assert.throws(() => makeIdeaMemo(idea, { ...answers, signal: ' ' }));
  assert.throws(() => makeIdeaMemo(idea, { ...answers, experiment: '' }));
});

test('memo uses public selected-idea fields without serializing extra private properties', () => {
  const privateCanary = 'PRIVATE_IDENTITY_91a3';
  const withPrivateFields = { ...idea, privateProfile: privateCanary, identity: { displayName: privateCanary }, preferences: { ...idea.preferences!, privateNotes: privateCanary } };
  const result = makeIdeaMemo(withPrivateFields, answers);
  assert.ok(!result.includes(privateCanary));
  for (const text of [idea.approvedBlurb, answers.customer, answers.assumption, answers.signal, answers.dataAccess]) assert.ok(result.includes(text));
  assert.match(result, /Python/);
  assert.match(result, /No public sources retrieved/);
  assert.doesNotMatch(result, /https?:\/\//);
});

test('switching selected idea changes the source brief without importing prior idea details', () => {
  const different = { ...idea, alias: 'Open Cedar', approvedBlurb: 'A distinct climate scheduling product.' };
  const result = makeIdeaMemo(different, answers);
  assert.ok(result.includes(different.approvedBlurb));
  assert.ok(!result.includes(idea.approvedBlurb));
  assert.ok(!result.includes(idea.alias));
});

test('multiple ideas belonging to one founder have independent selection keys', () => {
  const cards = [{ ...idea, ideaId: 'first' }, { ...idea, ideaId: 'second', approvedBlurb: 'A second independent idea.' }];
  assert.notEqual(ideaKey(cards[0]), ideaKey(cards[1]));
  assert.equal(cards.find(card => ideaKey(card) === 'second')?.approvedBlurb, 'A second independent idea.');
  assert.equal(ideaKey(idea), idea.id);
});
