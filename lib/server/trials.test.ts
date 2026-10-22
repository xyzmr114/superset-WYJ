import {test} from 'node:test';
import assert from 'node:assert/strict';
import {db,type Match} from './store';
import {decideIntroduction} from './intro-consent';
import {changeTrial,getTrial,trialAction} from './trials';
import type {MatchingCard,TrialPlan} from '@/lib/contracts';
import {proposeOpportunity} from '@/lib/generation';
let sequence=0;
function pair(reveal=true){
 const suffix=++sequence;const a:MatchingCard={id:'trial-a-'+suffix,eventId:'trial-test',alias:'Quiet Pine',offers:['engineering'],seeks:['sales'],interests:['agent-travel'],availability:'weekends',approvedBlurb:'Agent travel booking',version:1};
 const b:MatchingCard={...a,id:'trial-b-'+suffix,alias:'Open Cedar'};db.cards.set(a.id,a);db.cards.set(b.id,b);
 const m:Match={id:'trial-match-'+suffix,eventId:a.eventId,a:a.id,b:b.id,score:100,opportunity:proposeOpportunity(a,b),evidence:[],approvals:new Set(),declinedBy:null};db.matches.set(m.id,m);
 if(reveal){for(const p of [a,b])decideIntroduction(m,p.id,{decision:'approve',identity:{displayName:p.alias,contact:p.id+'@example.invalid'}});}
 return {a,b,m};
}
const plan=():TrialPlan=>({goal:'Test agent travel demand',deliverable:'Prototype plus three interviews',myContribution:'Build the prototype',theirContribution:'Run interviews',deadline:new Date(Date.now()+48*3600000).toISOString()});
test('trial reads and writes require membership and mutual identity approval',()=>{
 const {a,m}=pair(false);assert.throws(()=>getTrial(m.id,'outsider'),/Not found/);assert.throws(()=>changeTrial(m.id,'outsider',{action:'propose',plan:plan()}),/Not found/);
 assert.throws(()=>getTrial(m.id,a.id),/Both founders/);assert.throws(()=>changeTrial(m.id,a.id,{action:'propose',plan:plan()}),/Both founders/);
});
test('contributions follow the caller and a proposal never implies approval',()=>{
 const {a,b,m}=pair();assert.equal(getTrial(m.id,a.id),null);const p=plan();const first=changeTrial(m.id,a.id,{action:'propose',plan:p});
 assert.equal(first.version,1);assert.equal(first.myApproval,false);assert.equal(first.theirApproval,false);assert.equal(first.status,'proposed');
 const other=getTrial(m.id,b.id)!;assert.equal(other.plan.myContribution,p.theirContribution);assert.equal(other.plan.theirContribution,p.myContribution);
 changeTrial(m.id,a.id,{action:'approve',version:1});assert.equal(getTrial(m.id,b.id)!.theirApproval,true);
 const edited=changeTrial(m.id,b.id,{action:'propose',version:1,plan:{...other.plan,myContribution:'Recruit five interviews'}});assert.equal(edited.version,2);assert.equal(edited.myApproval,false);assert.equal(edited.theirApproval,false);assert.equal(getTrial(m.id,a.id)!.plan.theirContribution,'Recruit five interviews');
 assert.throws(()=>changeTrial(m.id,a.id,{action:'approve',version:1}),/changed/);assert.throws(()=>changeTrial(m.id,a.id,{action:'propose',version:1,plan:p}),/changed/);
});
test('both exact approvals fix the plan; repeats are idempotent',()=>{
 const {a,b,m}=pair();changeTrial(m.id,a.id,{action:'propose',plan:plan()});changeTrial(m.id,a.id,{action:'approve',version:1});changeTrial(m.id,a.id,{action:'approve',version:1});assert.equal(getTrial(m.id,a.id)!.status,'proposed');
 changeTrial(m.id,b.id,{action:'approve',version:1});assert.equal(getTrial(m.id,a.id)!.status,'active');assert.throws(()=>changeTrial(m.id,a.id,{action:'propose',version:1,plan:plan()}),/fixed/);
});
test('individual feedback is never returned to the other founder; only mutual continuation unlocks',()=>{
 const {a,b,m}=pair();changeTrial(m.id,a.id,{action:'propose',plan:plan()});assert.throws(()=>changeTrial(m.id,a.id,{action:'feedback',version:1,decision:'continue'}),/Both founders/);
 for(const p of [a,b])changeTrial(m.id,p.id,{action:'approve',version:1});changeTrial(m.id,a.id,{action:'feedback',version:1,decision:'continue'});
 assert.equal(getTrial(m.id,b.id)!.myFeedback,undefined);assert.equal(getTrial(m.id,b.id)!.bothWantContinue,false);assert.equal(getTrial(m.id,b.id)!.status,'active');
 const pendingView=getTrial(m.id,a.id);changeTrial(m.id,b.id,{action:'feedback',version:1,decision:'pass'});const view=getTrial(m.id,a.id)!;assert.deepEqual(view,pendingView,'A partner pass must look identical to feedback still pending');assert.equal(view.status,'active');assert.equal(view.bothWantContinue,false);assert.doesNotMatch(JSON.stringify(view),/pass|theirFeedback|feedbackBy/);
 assert.throws(()=>changeTrial(m.id,b.id,{action:'feedback',version:1,decision:'continue'}),/already/);changeTrial(m.id,b.id,{action:'feedback',version:1,decision:'pass'});
});
test('two independent continue decisions share only the mutual outcome',()=>{
 const {a,b,m}=pair();changeTrial(m.id,a.id,{action:'propose',plan:plan()});for(const p of [a,b])changeTrial(m.id,p.id,{action:'approve',version:1});for(const p of [a,b])changeTrial(m.id,p.id,{action:'feedback',version:1,decision:'continue'});
 assert.equal(getTrial(m.id,a.id)!.bothWantContinue,true);assert.equal(getTrial(m.id,b.id)!.status,'complete');
});
test('past deadlines and extra private fields are rejected',()=>{
 const {a,m}=pair();assert.throws(()=>changeTrial(m.id,a.id,{action:'propose',plan:{...plan(),deadline:'2020-01-01'}}),/future/);
 assert.equal(trialAction.safeParse({action:'propose',plan:{...plan(),profile:'private'}}).success,false);assert.equal(trialAction.safeParse({action:'approve',version:1,participantId:a.id}).success,false);
});
