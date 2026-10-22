import {test} from 'node:test';
import assert from 'node:assert/strict';
import {db,type Match} from './store';
import {introDecision,decideIntroduction} from './intro-consent';
import {getMyMatch,toView} from './matches';
import {isRevealed} from './pitches';
import {proposeOpportunity} from '@/lib/generation';
import type {MatchingCard} from '@/lib/contracts';
let sequence=0;
function pair(){
 const suffix=++sequence;const a:MatchingCard={id:'consent-a-'+suffix,eventId:'consent-test',alias:'Quiet Pine',offers:['engineering'],seeks:['sales'],interests:['agent-travel'],availability:'weekends',approvedBlurb:'Agent travel booking',version:2};
 const b:MatchingCard={...a,id:'consent-b-'+suffix,alias:'Open Cedar',offers:['sales'],seeks:['engineering'],version:3};db.cards.set(a.id,a);db.cards.set(b.id,b);
 const m:Match={id:'consent-match-'+suffix,eventId:a.eventId,a:a.id,b:b.id,score:100,opportunity:proposeOpportunity(a,b),evidence:[],approvals:new Set(),declinedBy:null};db.matches.set(m.id,m);return {a,b,m};
}
const identityA={displayName:'Founder A',contact:'a-private@example.invalid'};const identityB={displayName:'Founder B',contact:'b-private@example.invalid'};
test('two independent exact approvals gate identity in JSON and joint pitch access',()=>{
 const {a,b,m}=pair();assert.equal('revealedContact' in toView(m,a.id),false);
 decideIntroduction(m,a.id,{decision:'approve',identity:identityA});
 for(const me of [a.id,b.id]){const body=JSON.stringify(toView(m,me));assert.doesNotMatch(body,/a-private|b-private|Founder A|Founder B|revealedContact/);}
 assert.equal(isRevealed(m),false);assert.equal(toView(m,b.id).theirIntroApproval,true);
 decideIntroduction(m,b.id,{decision:'approve',identity:identityB});
 assert.deepEqual(toView(m,a.id).revealedContact,identityB);assert.deepEqual(toView(m,b.id).revealedContact,identityA);assert.equal(isRevealed(m),true);
});
test('approved identity snapshots cannot be replaced by global identity edits or repeated different approvals',()=>{
 const {a,b,m}=pair();decideIntroduction(m,a.id,{decision:'approve',identity:identityA});
 decideIntroduction(m,a.id,{decision:'approve',identity:identityA});
 const receipt=m.introConsents![a.id].approvedAt;
 assert.throws(()=>decideIntroduction(m,a.id,{decision:'approve',identity:{...identityA,contact:'changed@example.invalid'}}),/Withdraw/);
 db.identities.set(a.id,{displayName:'Changed elsewhere',contact:'not-approved@example.invalid'});
 decideIntroduction(m,b.id,{decision:'approve',identity:identityB});assert.deepEqual(toView(m,b.id).revealedContact,identityA);assert.equal(m.introConsents![a.id].approvedAt,receipt);assert.equal(toView(m,a.id).myConsent?.briefVersion,2);
});
test('withdrawal clears consent without rejecting the pairing and decline blocks later disclosure',()=>{
 const {a,b,m}=pair();decideIntroduction(m,a.id,{decision:'approve',identity:identityA});decideIntroduction(m,a.id,{decision:'withdraw'});
 assert.equal(toView(m,a.id).status,'suggested');assert.equal(m.introConsents?.[a.id],undefined);
 decideIntroduction(m,b.id,{decision:'approve',identity:identityB});assert.equal(toView(m,a.id).revealedContact,undefined);
 decideIntroduction(m,a.id,{decision:'decline'});assert.throws(()=>decideIntroduction(m,a.id,{decision:'approve',identity:identityA}),/passed on/);assert.equal(toView(m,b.id).status,'declined');
});
test('outsiders cannot fetch or consent; missing exact details and forged consent fields fail validation',()=>{
 const {a,m}=pair();assert.throws(()=>getMyMatch(m.id,'outsider'),/Not found/);
 assert.throws(()=>decideIntroduction(m,'outsider',{decision:'approve',identity:identityA}),/Not found/);
 assert.equal(introDecision.safeParse({decision:'approve'}).success,false);
 assert.equal(introDecision.safeParse({decision:'approve',identity:identityA,participantId:a.id}).success,false);
});
test('legacy approval bits alone never release identity or unlock joint pitch',()=>{
 const {a,b,m}=pair();m.approvals.add(a.id);m.approvals.add(b.id);db.identities.set(b.id,identityB);
 assert.equal(toView(m,a.id).revealedContact,undefined);assert.equal(isRevealed(m),false);
});
