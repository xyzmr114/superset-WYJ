import {test} from 'node:test';
import assert from 'node:assert/strict';
import {q,matchRow} from './store';
import {decideIntroduction} from './intro-consent';
import {changeTrial,getTrial,trialAction} from './trials';
import type {MatchingCard,TrialPlan} from '@/lib/contracts';
import {proposeOpportunity} from '@/lib/generation';
import {hashToken} from './http';
import {GET,POST} from '../../app/api/matches/[id]/trial/route';
delete process.env.DATABASE_URL;
let sequence=0;
async function pair(reveal=true){
 const suffix=++sequence;const a:MatchingCard={id:'trial-a-'+suffix,eventId:'trial-test',alias:'Quiet Pine',offers:['engineering'],seeks:['sales'],interests:['agent-travel'],availability:'weekends',approvedBlurb:'Agent travel booking',version:1};
 const b:MatchingCard={...a,id:'trial-b-'+suffix,alias:'Open Cedar'};
 for(const c of [a,b]){
  await q('insert into participants (id,event_id) values ($1,$2)',[c.id,c.eventId]);
  await q('insert into cards (participant_id,event_id,alias,offers,seeks,interests,availability,approved_blurb) values ($1,$2,$3,$4,$5,$6,$7,$8)',[c.id,c.eventId,c.alias,c.offers,c.seeks,c.interests,c.availability,c.approvedBlurb]);
 }
 const [row]=await q(`insert into matches (id,event_id,a,b,score,opportunity,evidence) values ($1,$2,$3,$4,100,$5::jsonb,'[]') returning *`,['trial-match-'+suffix,a.eventId,a.id,b.id,JSON.stringify(proposeOpportunity(a,b))]);
 const m=matchRow(row);
 if(reveal){for(const p of [a,b])await decideIntroduction(m,p.id,{decision:'approve',identity:{displayName:p.alias,contact:p.id+'@example.invalid'}});}
 return {a,b,m};
}
const plan=():TrialPlan=>({goal:'Test agent travel demand',deliverable:'Prototype plus three interviews',myContribution:'Build the prototype',theirContribution:'Run interviews',deadline:new Date(Date.now()+48*3600000).toISOString()});
test('trial reads and writes require membership and mutual identity approval',async()=>{
 const {a,m}=await pair(false);await assert.rejects(()=>getTrial(m.id,'outsider'),/Not found/);await assert.rejects(()=>changeTrial(m.id,'outsider',{action:'propose',plan:plan()}),/Not found/);
 await assert.rejects(()=>getTrial(m.id,a.id),/Both founders/);await assert.rejects(()=>changeTrial(m.id,a.id,{action:'propose',plan:plan()}),/Both founders/);
});
test('contributions follow the caller and a proposal never implies approval',async()=>{
 const {a,b,m}=await pair();assert.equal((await getTrial(m.id,a.id)),null);const p=plan();const first=await changeTrial(m.id,a.id,{action:'propose',plan:p});
 assert.equal(first.version,1);assert.equal(first.myApproval,false);assert.equal(first.theirApproval,false);assert.equal(first.status,'proposed');
 const other=(await getTrial(m.id,b.id))!;assert.equal(other.plan.myContribution,p.theirContribution);assert.equal(other.plan.theirContribution,p.myContribution);
 await changeTrial(m.id,a.id,{action:'approve',version:1});assert.equal((await getTrial(m.id,b.id))!.theirApproval,true);
 const edited=await changeTrial(m.id,b.id,{action:'propose',version:1,plan:{...other.plan,myContribution:'Recruit five interviews'}});assert.equal(edited.version,2);assert.equal(edited.myApproval,false);assert.equal(edited.theirApproval,false);assert.equal((await getTrial(m.id,a.id))!.plan.theirContribution,'Recruit five interviews');
 await assert.rejects(()=>changeTrial(m.id,a.id,{action:'approve',version:1}),/changed/);await assert.rejects(()=>changeTrial(m.id,a.id,{action:'propose',version:1,plan:p}),/changed/);
});
test('both exact approvals fix the plan; repeats are idempotent',async()=>{
 const {a,b,m}=await pair();await changeTrial(m.id,a.id,{action:'propose',plan:plan()});await changeTrial(m.id,a.id,{action:'approve',version:1});await changeTrial(m.id,a.id,{action:'approve',version:1});assert.equal((await getTrial(m.id,a.id))!.status,'proposed');
 await changeTrial(m.id,b.id,{action:'approve',version:1});assert.equal((await getTrial(m.id,a.id))!.status,'active');await assert.rejects(()=>changeTrial(m.id,a.id,{action:'propose',version:1,plan:plan()}),/fixed/);
});
test('individual feedback is never returned to the other founder; only mutual continuation unlocks',async()=>{
 const {a,b,m}=await pair();await changeTrial(m.id,a.id,{action:'propose',plan:plan()});await assert.rejects(()=>changeTrial(m.id,a.id,{action:'feedback',version:1,decision:'continue'}),/Both founders/);
 for(const p of [a,b])await changeTrial(m.id,p.id,{action:'approve',version:1});await changeTrial(m.id,a.id,{action:'feedback',version:1,decision:'continue'});
 assert.equal((await getTrial(m.id,b.id))!.myFeedback,undefined);assert.equal((await getTrial(m.id,b.id))!.bothWantContinue,false);assert.equal((await getTrial(m.id,b.id))!.status,'active');
 const pendingView=(await getTrial(m.id,a.id));await changeTrial(m.id,b.id,{action:'feedback',version:1,decision:'pass'});const view=(await getTrial(m.id,a.id))!;assert.deepEqual(view,pendingView,'A partner pass must look identical to feedback still pending');assert.equal(view.status,'active');assert.equal(view.bothWantContinue,false);assert.doesNotMatch(JSON.stringify(view),/pass|theirFeedback|feedbackBy/);
 await assert.rejects(()=>changeTrial(m.id,b.id,{action:'feedback',version:1,decision:'continue'}),/already/);await changeTrial(m.id,b.id,{action:'feedback',version:1,decision:'pass'});
});
test('two independent continue decisions share only the mutual outcome',async()=>{
 const {a,b,m}=await pair();await changeTrial(m.id,a.id,{action:'propose',plan:plan()});for(const p of [a,b])await changeTrial(m.id,p.id,{action:'approve',version:1});for(const p of [a,b])await changeTrial(m.id,p.id,{action:'feedback',version:1,decision:'continue'});
 assert.equal((await getTrial(m.id,a.id))!.bothWantContinue,true);assert.equal((await getTrial(m.id,b.id))!.status,'complete');
});
test('past deadlines and extra private fields are rejected',async()=>{
 const {a,m}=await pair();await assert.rejects(()=>changeTrial(m.id,a.id,{action:'propose',plan:{...plan(),deadline:'2020-01-01'}}),/future/);
 assert.equal(trialAction.safeParse({action:'propose',plan:{...plan(),profile:'private'}}).success,false);assert.equal(trialAction.safeParse({action:'approve',version:1,participantId:a.id}).success,false);
});

test('concurrent initial proposals and edits accept exactly one version',async()=>{
 const {a,b,m}=await pair();
 for(const version of [0,1]){
  const results=await Promise.allSettled([a,b].map(p=>changeTrial(m.id,p.id,{action:'propose',version,plan:plan()})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const rejected=results.find(r=>r.status==='rejected');assert.equal(rejected?.status==='rejected'&&rejected.reason.code,'STALE_VERSION');
  const [row]=await q('select * from trials where match_id=$1',[m.id]);assert.equal(row.version,version+1);
 }
});

test('concurrent approvals preserve both bits and concurrent private decisions cannot replace the winner',async()=>{
 const {a,b,m}=await pair();await changeTrial(m.id,a.id,{action:'propose',plan:plan()});
 await Promise.all([a,b].map(p=>changeTrial(m.id,p.id,{action:'approve',version:1})));
 assert.equal((await getTrial(m.id,a.id))!.status,'active');
 const results=await Promise.allSettled(['continue','pass'].map(decision=>changeTrial(m.id,a.id,{action:'feedback',version:1,decision:decision as 'continue'|'pass'})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const rejected=results.find(r=>r.status==='rejected');assert.equal(rejected?.status==='rejected'&&rejected.reason.code,'FEEDBACK_FIXED');
 assert.equal((await getTrial(m.id,b.id))!.myFeedback,undefined);
});

test('a final approval racing an edit never approves the replacement version',async()=>{
 const {a,b,m}=await pair();await changeTrial(m.id,a.id,{action:'propose',plan:plan()});await changeTrial(m.id,a.id,{action:'approve',version:1});
 const results=await Promise.allSettled([
  changeTrial(m.id,b.id,{action:'approve',version:1}),
  changeTrial(m.id,a.id,{action:'propose',version:1,plan:plan()}),
 ]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const trial=(await getTrial(m.id,a.id))!;
 if(trial.version===1)assert.equal(trial.status,'active');
 else{assert.equal(trial.version,2);assert.equal(trial.myApproval,false);assert.equal(trial.theirApproval,false);}
});

test('missing plans, stale feedback and expired approvals retain their errors',async()=>{
 const {a,b,m}=await pair();
 await assert.rejects(()=>changeTrial(m.id,a.id,{action:'approve',version:1}),{code:'NO_TRIAL'});
 await changeTrial(m.id,a.id,{action:'propose',plan:plan()});await changeTrial(m.id,a.id,{action:'approve',version:1});
 await q("update trials set deadline=now()-interval '1 second' where match_id=$1",[m.id]);
 await changeTrial(m.id,a.id,{action:'approve',version:1});
 await assert.rejects(()=>changeTrial(m.id,b.id,{action:'approve',version:1}),{code:'PAST_DEADLINE'});
 await changeTrial(m.id,b.id,{action:'propose',version:1,plan:plan()});
 await assert.rejects(()=>changeTrial(m.id,a.id,{action:'feedback',version:1,decision:'continue'}),{code:'STALE_VERSION'});
});

test('trial API awaits authenticated reads and writes and keeps outsiders at 404',async()=>{
 const {a,b,m}=await pair();
 for(const p of [a,b])await q('update participants set token_hash=$2 where id=$1',[p.id,hashToken(p.id)]);
 const ctx={params:Promise.resolve({id:m.id})};
 const request=(me:string,body?:unknown)=>new Request(`http://localhost/api/matches/${m.id}/trial`,{method:body?'POST':'GET',headers:{cookie:`wyj_session=${me}`,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const proposal=await POST(request(a.id,{action:'propose',plan:plan()}),ctx);assert.equal(proposal.status,200);assert.equal((await proposal.json()).trial.version,1);
 const response=await GET(request(b.id),ctx);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal((await response.json()).trial.plan.myContribution,plan().theirContribution);
 const other=await pair();await q('update participants set token_hash=$2 where id=$1',[other.a.id,hashToken(other.a.id)]);
 assert.equal((await GET(request(other.a.id),ctx)).status,404);
 assert.equal((await GET(new Request(`http://localhost/api/matches/${m.id}/trial`),ctx)).status,401);
});
