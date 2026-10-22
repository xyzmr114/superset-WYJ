import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildReviewAppendix,reviewPrompts} from './framework';
test('does not invent answers or export empty notes',()=>{assert.equal(buildReviewAppendix({}), '');assert.equal(buildReviewAppendix({pain:{note:'  ',status:'observed'}}),'');});
test('preserves uncertainty and distinguishes synthesis from published approach',()=>{const text=buildReviewAppendix({pain:{note:'No interviews yet.',status:'hypothesis'},buyer:{note:'Budget owner unknown.',status:'unknown'}});assert.match(text,/self-reported/);assert.match(text,/Evidence status: hypothesis/);assert.match(text,/General startup practice; our synthesis/);assert.doesNotMatch(text,/### Why now/);});
test('published prompts carry primary-source attribution',()=>{for(const p of reviewPrompts.filter(p=>p.origin==='published'))assert.equal(new URL(p.source!.url).hostname,'superset.com');});
