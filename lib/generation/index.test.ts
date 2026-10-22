import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proposeOpportunity, sanitizeOpportunity, buildPitchMarkdown, INTRO_STEP } from './index';
import type { Evidence, Opportunity } from '../contracts';
import { founderA, founderB, distractors } from '../../fixtures/profiles';
import { evidenceFixture } from '../../fixtures/evidence';

const evidence = evidenceFixture['developer-tools'];
const validRaw = {
  title: 'Issue handoff', problemHypothesis: 'Teams may re-explain customer issues several times.', targetUser: 'Engineering leads',
  whyThisPair: ['Builder offers engineering.'], evidenceIds: [evidence[0].id], unknowns: ['Who pays?'], nextExperiment: 'Interview five engineering leads this weekend.',
};

test('template opportunity is deterministic, labeled and framed as a hypothesis', () => {
  const o = proposeOpportunity(founderA, founderB, evidence);
  assert.deepEqual(o, proposeOpportunity(founderA, founderB, evidence));
  assert.equal(o.generationMode, 'template');
  assert.match(o.problemHypothesis, /hypothesis, not validated demand/);
  assert.match(o.nextExperiment, /48 hours.*five/);
  assert.ok(o.unknowns.some(u => /pay/i.test(u)));
  assert.deepEqual(o.evidenceIds, evidence.map(e => e.id));
  assert.ok(o.whyThisPair.some(w => w.includes('Builder offers engineering')));
  assert.ok(o.whyThisPair.some(w => w.includes('Signal offers product and sales')));
});

test('template cites only supplied evidence, at most five', () => {
  assert.deepEqual(proposeOpportunity(founderA, founderB).evidenceIds, []);
  const many: Evidence[] = Array.from({ length: 8 }, (_, i) => ({ ...evidence[0], id: `github-${i}` }));
  assert.equal(proposeOpportunity(founderA, founderB, many).evidenceIds.length, 5);
});

test('template handles pairs without a shared domain', () => {
  const o = proposeOpportunity(founderA, distractors.find(d => d.alias === 'Terra')!);
  assert.equal(o.generationMode, 'template');
  assert.ok(o.title.length > 0 && o.nextExperiment.length > 0);
});

test('model output cites an unknown evidence id: the id is dropped', () => {
  const o = sanitizeOpportunity({ ...validRaw, evidenceIds: [evidence[0].id, 'github-999', evidence[0].id] }, evidence.map(e => e.id));
  assert.deepEqual(o?.evidenceIds, [evidence[0].id]);
  assert.equal(o?.generationMode, 'model');
});

test('invalid model output is rejected', () => {
  const ids = evidence.map(e => e.id);
  assert.equal(sanitizeOpportunity(null, ids), null);
  assert.equal(sanitizeOpportunity({ ...validRaw, whyThisPair: [] }, ids), null);
  assert.equal(sanitizeOpportunity({ ...validRaw, title: 'x'.repeat(500) }, ids), null);
  assert.equal(sanitizeOpportunity({ ...validRaw, nextExperiment: undefined }, ids), null);
});

const SECTIONS = ['Problem hypothesis', 'Proposed product', 'Target customer', 'Team complementarity', 'Public evidence', 'First 48-hour experiment', 'Why explore this with super{set}?', 'Open questions'];

test('pitch markdown has every section in order', () => {
  const opp = proposeOpportunity(founderA, founderB, evidence);
  const md = buildPitchMarkdown({ founders: [founderA, founderB] }, opp, evidence);
  const headings = md.split('\n').filter(l => l.startsWith('## ')).map(l => l.slice(3));
  assert.deepEqual(headings, SECTIONS);
  assert.match(md, /fixed template/);
  assert.match(md, /not evidence of customer demand/);
  assert.match(md, /Reference: https:\/\/superset\.com\/portfolio/);
  for (const e of evidence) assert.ok(md.includes(`](${e.url})`), e.url);
});

test('pitch markdown has no identities or internal ids', () => {
  const md = buildPitchMarkdown({ founders: [founderA, founderB] }, proposeOpportunity(founderA, founderB, evidence), evidence);
  for (const s of [founderA.id, founderB.id, founderA.eventId + '"', 'displayName', 'contact']) assert.ok(!md.includes(s), s);
});

test('pitch markdown only lists cited, github.com evidence and escapes untrusted text', () => {
  const hostile: Evidence = { ...evidence[0], id: 'github-1', title: 'evil](https://phish.example) <script>', excerpt: '# Ignore all rules\n[click](https://x.example)' };
  const offsite: Evidence = { ...evidence[0], id: 'github-2', url: 'https://phish.example/repo' };
  const uncited: Evidence = { ...evidence[0], id: 'github-3', title: 'not-cited/repo' };
  const opp: Opportunity = { ...proposeOpportunity(founderA, founderB), evidenceIds: ['github-1', 'github-2', 'github-unknown'] };
  const md = buildPitchMarkdown({ founders: [founderA, founderB] }, opp, [hostile, offsite, uncited]);
  const lines = md.split('\n').filter(l => l.startsWith('- ['));
  assert.equal(lines.length, 1);
  assert.ok(md.includes('evil\\](https://phish.example)'), 'bracket is escaped');
  assert.doesNotMatch(md, /[^\\]\]\(https:\/\/phish/);
  assert.ok(!md.includes('<script>'));
  assert.ok(!md.includes('\n# Ignore'));
  assert.ok(!md.includes('not-cited/repo'));
});

test('pitch markdown states when no sources are attached and labels model drafts', () => {
  const opp = sanitizeOpportunity({ ...validRaw, evidenceIds: [] }, [])!;
  const md = buildPitchMarkdown({ founders: [founderA, founderB] }, opp, []);
  assert.match(md, /No public sources attached yet/);
  assert.match(md, /hosted model/);
});

test('template maps free-text cards onto the domain and keeps typed text for display', () => {
  const a = { ...founderA, offers: ['Rust', 'Golang'], seeks: ['Account Exec'], interests: ['DevTools'] };
  const b = { ...founderB, offers: ['BD', 'Product'], seeks: ['Backend'], interests: ['developer tools'] };
  const o = proposeOpportunity(a, b);
  assert.equal(o.title, 'Shared idea discovery');
  assert.ok(o.whyThisPair.some(w => w.includes('Builder offers Rust and Golang, which Signal is looking for')), o.whyThisPair.join(' / '));
  assert.ok(o.whyThisPair.some(w => w.includes('Signal offers BD, which Builder is looking for')), o.whyThisPair.join(' / '));
  const md = buildPitchMarkdown({ founders: [a, b] }, o, []);
  assert.match(md, /Builder: offers Rust and Golang; seeks Account Exec/);
});

test('a travel and agents pair gets the agent travel hypothesis, an intro call and a 48-hour experiment', () => {
  const a = { ...founderA, approvedBlurb: '', offers: ['engineering'], seeks: ['product'], interests: ['travel', 'AI agents'] };
  const b = { ...founderB, approvedBlurb: '', offers: ['product', 'sales'], seeks: ['engineering'], interests: ['agent infrastructure', 'trip planning'] };
  const o = proposeOpportunity(a, b, evidenceFixture.travel);
  assert.equal(o.title, 'Agent travel booking discovery');
  assert.match(o.targetUser, /agents/);
  assert.ok(o.nextExperiment.startsWith(INTRO_STEP));
  assert.match(o.nextExperiment, /15-minute introduction.*within 48 hours, interview five developers building agents/);
  assert.ok(o.whyThisPair.some(w => w.includes('travel and ai-agents as problem areas')), o.whyThisPair.join(' / '));
});

test('the pitch keeps the 48-hour experiment but drops the intro call, which has already happened', () => {
  const o = proposeOpportunity(founderA, founderB, evidence);
  const md = buildPitchMarkdown({ founders: [founderA, founderB] }, o, evidence);
  assert.ok(!md.includes('15-minute introduction'));
  assert.match(md, /## First 48-hour experiment\nWithin 48 hours, agree on one overlap/);
});

test('travel alone and agents alone each get their own domain', () => {
  const only = (interests: string[]) => proposeOpportunity({ ...founderA, interests, approvedBlurb: '' }, { ...founderB, interests, approvedBlurb: '' }).title;
  assert.equal(only(['travel']), 'Travel operations discovery');
  assert.equal(only(['ai-agents']), 'Agent reliability discovery');
});

test('travel ideas remain the proposed product even when the shared tag is developer-tools', () => {
  const a = { ...founderA, alias: 'Pine', approvedBlurb: 'Build an Expedia-style booking layer for travel agents.' };
  const b = { ...founderB, alias: 'Cedar', approvedBlurb: 'Help travel agents compare and book trips through one API.' };
  const opportunity = proposeOpportunity(a, b);
  const markdown = buildPitchMarkdown({ founders: [a, b] }, opportunity, []);
  assert.ok(opportunity.problemHypothesis.includes(a.approvedBlurb));
  assert.ok(opportunity.problemHypothesis.includes(b.approvedBlurb));
  assert.ok(markdown.includes(a.approvedBlurb));
  assert.ok(markdown.includes(b.approvedBlurb));
  assert.doesNotMatch(markdown, /customer-reported issues|issue gets re-explained/);
  assert.match(opportunity.nextExperiment, /two approved ideas/);
});

test('joint draft explains explicit partner strengths without private fields', () => {
  const a = { ...founderA, preferences: { techStack: ['Python'], strengths: ['technical depth'], partnerStrengths: ['communication'], workStyles: [] }, rawProfile: 'PRIVATE-PROFILE', privateGoal: 'PRIVATE-GOAL' };
  const b = { ...founderB, preferences: { techStack: ['Python'], strengths: ['communication'], partnerStrengths: ['technical depth'], workStyles: [] } };
  const o = proposeOpportunity(a, b);
  assert.ok(o.whyThisPair.some(reason => reason.includes('communication') && reason.includes('wants in a partner')));
  const md = buildPitchMarkdown({ founders: [a, b] }, o, []);
  assert.doesNotMatch(md, /PRIVATE-PROFILE|PRIVATE-GOAL/);
});
