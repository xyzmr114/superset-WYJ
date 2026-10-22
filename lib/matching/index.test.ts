import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankCandidates } from './index';
import type { MatchingCard } from '../contracts';
const me:MatchingCard={id:'a',eventId:'event',alias:'A',offers:['engineering'],seeks:['sales'],interests:['developer-tools'],availability:'weekends',approvedBlurb:'',version:1};
test('excludes self and other events; ranks complementary skills',()=>{
 const partner={...me,id:'b',offers:['sales'],seeks:['engineering']};
 const result=rankCandidates(me,[me,{...partner,id:'outside',eventId:'elsewhere'},partner]);
 assert.equal(result.length,1); assert.equal(result[0].candidate.id,'b'); assert.equal(result[0].score,100);
});
test('does not invent matches for unrelated attendees',()=>{assert.deepEqual(rankCandidates(me,[{...me,id:'c',interests:['climate'],offers:['design'],seeks:['data'],availability:'full_time'}]),[])});
