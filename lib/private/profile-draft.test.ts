import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withLocalSuggestions,withPartnerNeeds} from './profile-draft';
import type {CardInput} from '@/lib/client/api';
import type {LocalClassification} from './classifier-contract';
const draft:CardInput={alias:'Founder 1234',offers:[],seeks:[],interests:[],availability:'weekends',approvedBlurb:'A booking API for travel agents.',preferences:{strengths:['technical depth'],partnerStrengths:[],techStack:['Python'],workStyles:['async-first']}};
const result:LocalClassification={status:'needs_review',engine:'laya-local',suggested:{offers:['engineering'],seeks:[],interests:['travel'],availability:null},message:'review'};
test('partner answers become both the matching needs and published preference fields',()=>{
 const next=withPartnerNeeds(draft,['sales','communication']);assert.deepEqual(next.seeks,['sales','communication']);assert.deepEqual(next.preferences?.partnerStrengths,['sales','communication']);assert.deepEqual(next.preferences?.techStack,['Python']);assert.equal(next.approvedBlurb,draft.approvedBlurb);
});
test('local suggestions fill visible fields without inventing or overwriting the idea',()=>{
 const next=withLocalSuggestions(draft,result);assert.deepEqual(next.offers,['engineering']);assert.deepEqual(next.interests,['travel']);assert.equal(next.approvedBlurb,'A booking API for travel agents.');assert.deepEqual(next.preferences?.strengths,['technical depth']);
 const edited=withLocalSuggestions({...draft,offers:['design'],interests:['climate']},result);assert.deepEqual(edited.offers,['design']);assert.deepEqual(edited.interests,['climate']);
});

test('custom partner requests are retained in both approved fields',()=>{const next=withPartnerNeeds(draft,['Horse training']);assert.deepEqual(next.seeks,['Horse training']);assert.deepEqual(next.preferences?.partnerStrengths,['Horse training']);});
