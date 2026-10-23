import test from 'node:test';
import assert from 'node:assert/strict';
import {progressSampleAgreements} from '../../scripts/demo/progress';
import type {api} from '../../scripts/demo/client';
const session={alias:'Fixture',participantId:'sample-account',cookie:'test-only',displayName:'Fixture',contact:'fixture@example.com'};
test('sample helper never approves an unknown account and posts only the exact trial or pitch version',async()=>{
 const calls:any[]=[];const rows=[{kind:'trial',resource:'one',version:3,founder:'sample-account'},{kind:'pitch',resource:'two',version:7,founder:'sample-account'},{kind:'trial',resource:'human',version:1,founder:'human-account'}];
 const options={sessions:()=>[session],now:()=>10000,request:(async(...args:any[])=>{calls.push(args);return {status:200,data:{}};}) as typeof api};
 await progressSampleAgreements({q:async()=>rows},new Map(),0,options);
 assert.equal(calls.length,2);
 assert.deepEqual(calls[0],['POST','/api/matches/one/trial',{action:'approve',version:3},'test-only']);
 assert.deepEqual(calls[1],['POST','/api/pitches/two/approve',{version:7},'test-only']);
});
test('sample agreement delay does not approve immediately or re-use delay for another version',async()=>{
 let time=1000,calls=0,version=1;const seen=new Map<string,number>();
 const options={sessions:()=>[session],now:()=>time,request:(async()=>{calls++;return {status:200,data:{}};}) as typeof api};
 const db={q:async()=>[{kind:'trial',resource:'plan',version,founder:'sample-account'}]};
 await progressSampleAgreements(db,seen,4000,options);assert.equal(calls,0);
 time=5001;await progressSampleAgreements(db,seen,4000,options);assert.equal(calls,1);
 version=2;await progressSampleAgreements(db,seen,4000,options);assert.equal(calls,1);
});
