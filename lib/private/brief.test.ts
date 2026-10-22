import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvedBrief,identifyingDetails,suggestedIdea} from './brief';
import type {CardInput} from '@/lib/client/api';
test('publication projects only approved fields even when runtime input has private extras',()=>{
 const input={alias:'Quiet Pine',offers:['engineering'],seeks:['sales'],interests:['travel'],availability:'weekends',approvedBlurb:'Booking tools for agents.',preferences:{techStack:['Python'],strengths:['technical depth'],partnerStrengths:['sales'],workStyles:['async-first']},profile:'PRIVATE-7192',idea:'Secret employer plans',displayName:'Alice',contact:'alice@example.invalid'};
 const output=approvedBrief(input as CardInput);
 assert.deepEqual(Object.keys(output).sort(),['alias','offers','seeks','interests','availability','approvedBlurb','preferences'].sort());
 assert.ok(!/PRIVATE|Secret|Alice|alice@/.test(JSON.stringify(output)));
 input.preferences.strengths.push('communication');assert.deepEqual(output.preferences?.strengths,['technical depth']);
});
test('idea template uses selected categories and does not require private text',()=>{
 assert.equal(suggestedIdea(['travel'],['engineering']),'Exploring a product in travel. I bring engineering and want to test a small first project with a complementary founder.');
});
test('common contact identifiers trigger public preview review',()=>{
 for(const input of ['me@example.com','https://example.com','linkedin.com/in/person','+1 415 555 0123'])assert.equal(identifyingDetails(input),true);
 assert.equal(identifyingDetails('Booking infrastructure for travel agents.'),false);
});
