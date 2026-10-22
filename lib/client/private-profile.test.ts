import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateJump, emptyPrivateProfile, type PrivateProfile} from './private-profile';
import type {Opportunity} from '@/lib/contracts';

const opportunity: Opportunity = {
  title: 'Explore developer-tools together',
  problemHypothesis: 'hypothesis',
  targetUser: 'tbd',
  whyThisPair: [],
  evidenceIds: [],
  unknowns: [],
  nextExperiment: 'Interview five prospective users.',
  generationMode: 'template',
};

const find = (items: ReturnType<typeof evaluateJump>, id: string) => {
  const item = items.find(i => i.id === id);
  assert.ok(item, `missing checklist item ${id}`);
  return item;
};

test('undisclosed runway stays unknown, never satisfied', () => {
  const items = evaluateJump(emptyPrivateProfile, opportunity);
  assert.equal(find(items, 'funding').status, 'unknown');
});

test('garbage runway input does not become satisfied', () => {
  const profile: PrivateProfile = {...emptyPrivateProfile, runway: 'soon'};
  assert.equal(find(evaluateJump(profile, opportunity), 'funding').status, 'unknown');
});

test('short disclosed runway is unmet, not silently satisfied', () => {
  const profile: PrivateProfile = {...emptyPrivateProfile, runway: '2'};
  assert.equal(find(evaluateJump(profile, opportunity), 'funding').status, 'unmet');
});

test('sufficient disclosed runway is satisfied', () => {
  const profile: PrivateProfile = {...emptyPrivateProfile, runway: '9'};
  assert.equal(find(evaluateJump(profile, opportunity), 'funding').status, 'satisfied');
});

test('conditions item is never auto-satisfied — only the user can judge it', () => {
  const profile: PrivateProfile = {...emptyPrivateProfile, conditions: 'need a co-founder I trust'};
  assert.equal(find(evaluateJump(profile, opportunity), 'conditions').status, 'unknown');
});
