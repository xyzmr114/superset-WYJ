import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeDraft,decodeDraft} from './local-draft';
import type {CardInput} from '@/lib/client/api';
const draft:CardInput={alias:'Horse founder',approvedBlurb:'Horse matchmaking',offers:[],seeks:[],interests:[],availability:'weekends'};
test('unfinished matching drafts survive serialization without requiring publication',()=>{const restored=decodeDraft(encodeDraft(draft,1));assert.equal(restored?.brief.approvedBlurb,'Horse matchmaking');assert.deepEqual(restored?.brief.offers,[]);assert.equal(restored?.step,1);});
test('saved published profile references survive but private fields and consent never serialize',()=>{const input={...draft,background:'PRIVATE',contact:'PRIVATE',consent:true};const encoded=encodeDraft(input,2,'idea-id');assert.ok(!encoded.includes('PRIVATE'));assert.ok(!encoded.includes('consent'));assert.equal(decodeDraft(encoded)?.publishedId,'idea-id');});
test('corrupt or unknown draft fields are rejected without breaking the intake',()=>{assert.equal(decodeDraft('{'),null);assert.equal(decodeDraft(JSON.stringify({version:1,brief:{...draft,background:'PRIVATE'}})),null);assert.equal(decodeDraft(JSON.stringify({version:2,brief:draft})),null);});
