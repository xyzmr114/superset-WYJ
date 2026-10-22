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

test('ambition stays unknown until the user describes one', () => {
  assert.equal(find(evaluateJump(emptyPrivateProfile, opportunity), 'ambition').status, 'unknown');
});

test('a described ambition is satisfied', () => {
  const profile: PrivateProfile = {...emptyPrivateProfile, ambition: 'build dev tooling'};
  assert.equal(find(evaluateJump(profile, opportunity), 'ambition').status, 'satisfied');
});

test('conditions item is never auto-satisfied — only the user can judge it', () => {
  const profile: PrivateProfile = {...emptyPrivateProfile, conditions: 'need a co-founder I trust'};
  assert.equal(find(evaluateJump(profile, opportunity), 'conditions').status, 'unknown');
});

test('a proposed first experiment satisfies the experiment item', () => {
  assert.equal(find(evaluateJump(emptyPrivateProfile, opportunity), 'experiment').status, 'satisfied');
});
