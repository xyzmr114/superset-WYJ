import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ideasFor,publishIdea,planFor,choosePlan} from './ideas';
import {db,type Participant,type Match} from './store';
import {Card} from './brief-schema';
import {toView} from './matches';
import {decideIntroduction} from './intro-consent';
import {proposeOpportunity} from '@/lib/generation';
let seq=0;const participant=():Participant=>({id:'idea-test-'+(++seq),eventId:'ideas-test',tokenHash:'test'});
const brief=(alias='Quiet Pine')=>Card.parse({alias,offers:['engineering'],seeks:['sales'],interests:['travel'],availability:'weekends',approvedBlurb:'Booking tools for agents.',publishConsent:true});
test('free allows five different published ideas; sixth requires Premium preview',()=>{
 const me=participant();for(let i=0;i<5;i++)publishIdea(me,brief('Idea '+i));
 assert.equal(ideasFor(me.id).length,5);assert.equal(new Set(ideasFor(me.id).map(i=>i.ideaId)).size,5);assert.equal(planFor(me.id).ideaLimit,5);
 assert.throws(()=>publishIdea(me,brief()),/five/);choosePlan(me.id,'premium');publishIdea(me,brief('Sixth'));assert.equal(ideasFor(me.id).length,6);assert.equal(planFor(me.id).billingConnected,false);assert.throws(()=>choosePlan(me.id,'free'),/five/);
});
test('new idea preserves older pair brief and approval version',()=>{
 const a=participant(),b=participant();const ca={...brief('Old A'),id:a.id,eventId:a.eventId,version:7};const cb={...brief('Old B'),id:b.id,eventId:b.eventId,version:3};db.cards.set(a.id,ca);db.cards.set(b.id,cb);
 const m:Match={id:'idea-match-'+seq,eventId:a.eventId,a:a.id,b:b.id,score:100,opportunity:proposeOpportunity(ca,cb),evidence:[],approvals:new Set(),declinedBy:null};db.matches.set(m.id,m);
 publishIdea(a,brief('New A'));publishIdea(b,brief('New B'));
 assert.equal(toView(m,a.id).candidate.alias,'Old B');assert.equal(toView(m,a.id).myBrief?.alias,'Old A');
 decideIntroduction(m,a.id,{decision:'approve',identity:{displayName:'Chosen A',contact:'a@example.invalid'}});assert.equal(toView(m,a.id).myConsent?.briefVersion,7);
});
test('server publication schema rejects private extras and non-allowlisted preferences',()=>{
 assert.equal(Card.safeParse({...brief(),rawProfile:'PRIVATE'}).success,false);
 assert.equal(Card.safeParse({...brief(),preferences:{techStack:['Private employer'],strengths:[],partnerStrengths:[],workStyles:[]}}).success,false);
});
