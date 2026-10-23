import test from 'node:test';
import assert from 'node:assert/strict';
import type {MatchView} from '@/lib/contracts';
import {uniqueFounderMatches} from './match-display';
const match=(id:string,person:string,status:MatchView['status'],score=80)=>({id,candidate:{id:person,alias:'Same nickname'},status,score,myIntroApproval:status==='pending',theirIntroApproval:false}) as MatchView;
test('repeated founder across ideas appears once, preserving the pending pair and its consent',()=>{
 const revealed={...match('old','person','revealed'),revealedContact:{displayName:'Old approved name',contact:'old@example.com'}};
 const pending=match('new','person','pending');
 const result=uniqueFounderMatches([revealed,pending]);
 assert.deepEqual(result,[pending]);assert.equal(result[0],pending);assert.equal(result[0].revealedContact,undefined);
});
test('founders with the same nickname remain distinct, and score breaks ties within one founder',()=>{
 const a=match('a','first','suggested',70),b=match('b','first','suggested',90),c=match('c','second','suggested',60);
 assert.deepEqual(uniqueFounderMatches([a,b,c]),[b,c]);
});
test('filtering introductions before display preserves their original revealed record',()=>{
 const revealed=match('old','same','revealed'),pending=match('new','same','pending');
 assert.deepEqual(uniqueFounderMatches([revealed,pending].filter(m=>m.status==='revealed')),[revealed]);
});
