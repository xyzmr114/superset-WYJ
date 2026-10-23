import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ideasFor,publishIdea,planFor,choosePlan,otherIdeasInEvent,setIdeaPublished} from './ideas';
import {q,matchRow,type Participant} from './store';
import {Card} from './brief-schema';
import {getMyMatch,toView} from './matches';
import {decideIntroduction} from './intro-consent';
import {hashToken} from './http';
import {proposeOpportunity} from '@/lib/generation';
import {TECH_STACK} from '@/lib/contracts';
import {POST as generate} from '@/app/api/matches/generate/route';
import {PUT as legacyPut} from '@/app/api/me/card/route';

delete process.env.DATABASE_URL;
let seq=0;
async function participant(eventId='ideas-test'):Promise<Participant>{
 const id='idea-test-'+(++seq);
 await q('insert into participants (id,event_id,token_hash) values ($1,$2,$3)',[id,eventId,hashToken(id)]);
 return {id,eventId};
}
const brief=(alias='Quiet Pine')=>Card.parse({alias,offers:['engineering'],seeks:['sales'],interests:['orbital plumbing'],availability:'weekends',approvedBlurb:'Booking tools for agents.',publishConsent:true});
const request=(id:string,body?:unknown)=>new Request('http://localhost/api/test',{method:body?'PUT':'POST',headers:{cookie:'wyj_session='+id,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});

test('persisted free quota is atomic; Premium preview permits more ideas and rejects downgrade',async()=>{
 const me=await participant();
 const results=await Promise.allSettled(Array.from({length:6},(_,i)=>publishIdea(me,brief('Idea '+i))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,5);
 assert.equal(results.filter(r=>r.status==='rejected').length,1);
 const ideas=await ideasFor(me.id);
 assert.equal(ideas.length,5);assert.equal(new Set(ideas.map(i=>i.ideaId)).size,5);
 assert.equal((await planFor(me.id)).ideaLimit,5);
 await choosePlan(me.id,'premium');
 await publishIdea(me,brief('Sixth'));
 assert.equal((await ideasFor(me.id)).length,6);
 assert.equal((await planFor(me.id)).billingConnected,false);
 await assert.rejects(()=>choosePlan(me.id,'free'),/five/);
 assert.equal((await planFor(me.id)).plan,'premium');
});

test('concurrent downgrade and sixth publication cannot leave a free plan above its quota',async()=>{
 const me=await participant();
 await choosePlan(me.id,'premium');
 for(let i=0;i<5;i++)await publishIdea(me,brief('Idea '+i));
 const outcomes=await Promise.allSettled([choosePlan(me.id,'free'),publishIdea(me,brief('Sixth'))]);
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 const plan=await planFor(me.id);
 assert.ok(plan.plan==='premium'||plan.ideaCount<=5);
});

test('new ideas preserve legacy pair briefs and the approved version',async()=>{
 const a=await participant(),b=await participant();
 const {publishConsent:_,...fields}=brief();
 const ca={...fields,alias:'Old A',id:a.id,eventId:a.eventId,version:7},cb={...fields,alias:'Old B',id:b.id,eventId:b.eventId,version:3};
 for(const c of [ca,cb])await q('insert into cards (participant_id,event_id,alias,offers,seeks,interests,availability,approved_blurb,version) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[c.id,c.eventId,c.alias,c.offers,c.seeks,c.interests,c.availability,c.approvedBlurb,c.version]);
 const [row]=await q('insert into matches (id,event_id,a,b,score,opportunity,evidence) values ($1,$2,$3,$4,100,$5::jsonb,\'[]\') returning *',['idea-match-'+seq,a.eventId,...[a.id,b.id].sort(),JSON.stringify(proposeOpportunity(ca,cb))]);
 await publishIdea(a,brief('New A'));await publishIdea(b,brief('New B'));
 assert.equal((await ideasFor(a.id)).length,2);
 const m=await getMyMatch(row.id,a.id),view=await toView(m,a.id);
 assert.equal(view.candidate.alias,'Old B');assert.equal(view.myBrief?.alias,'Old A');
 const approved=await decideIntroduction(m,a.id,{decision:'approve',identity:{displayName:'Chosen A',contact:'a@example.invalid'}});
 assert.equal((await toView(approved,a.id)).myConsent?.briefVersion,7);
});

test('legacy card API preserves preferences and refuses to replace an idea collection',async()=>{
 const me=await participant();
 const input={...brief(),preferences:{techStack:[TECH_STACK[0]],strengths:[],partnerStrengths:[],workStyles:[]}};
 assert.equal((await legacyPut(request(me.id,input),undefined)).status,200);
 assert.deepEqual((await ideasFor(me.id))[0].preferences,input.preferences);
 await publishIdea(me,brief('New idea'));
 const response=await legacyPut(request(me.id,brief('Overwrite')),undefined);
 assert.equal(response.status,409);assert.equal((await response.json()).error.code,'USE_IDEAS');
 assert.equal((await ideasFor(me.id)).length,2);
});

test('matching persists unlimited idea pairs, exact snapshots, and idempotent generation',async()=>{
 const event='ideas-matching',a=await participant(event);
 const first=await publishIdea(a,brief('First A'));
 await publishIdea(a,brief('Second A'));
 const others=[];
 for(let i=0;i<4;i++){
  const b=await participant(event);others.push(b);
  await publishIdea(b,{...brief('Candidate '+i),offers:['sales'],seeks:['engineering']});
 }
 const [response,concurrent]=await Promise.all([generate(request(a.id),undefined),generate(request(a.id),undefined)]);
 assert.equal(response.status,200);assert.equal(concurrent.status,200);
 const matches=(await response.json()).matches;
 assert.equal(matches.length,8);assert.equal(matches.filter((m:{myBrief:{ideaId:string}})=>m.myBrief.ideaId===first.ideaId).length,4);
 assert.equal((await (await generate(request(a.id),undefined)).json()).matches.length,8);
 const [stored]=await q('select * from matches where a=$1 or b=$1',[a.id]);
 const m=matchRow(stored),old=(await toView(m,a.id)).candidate;
 await publishIdea(others.find(p=>p.id===old.id)!,{...brief('Changed candidate'),offers:['sales'],seeks:['engineering']});
 assert.deepEqual((await toView(await getMyMatch(m.id,a.id),a.id)).candidate,old);
});

test('server publication schema accepts bounded custom preferences but rejects private extras',()=>{
 assert.equal(Card.safeParse({...brief(),rawProfile:'PRIVATE'}).success,false);
 assert.equal(Card.safeParse({...brief(),preferences:{techStack:['Equestrian robotics'],strengths:[],partnerStrengths:[],workStyles:[]}}).success,true);
 assert.equal(Card.safeParse({...brief(),preferences:{techStack:['x'.repeat(41)],strengths:[],partnerStrengths:[],workStyles:[]}}).success,false);
});

test('withdrawal retains owner history, cancels pending pairs and never resurrects via legacy cards',async()=>{
 const {savedIdeasFor,isIdeaPublished,setIdeaPublished}=await import('./ideas');
 const a=await participant('withdrawal-test'),b=await participant('withdrawal-test');
 const card=await publishIdea(a,brief('Withdraw me'));
 await publishIdea(b,{...brief('Partner'),offers:['sales'],seeks:['engineering']});
 await generate(request(a.id),undefined);
 const [before]=await q('select * from matches where a=$1 or b=$1',[a.id]);
 assert.ok(before);
 const match=await getMyMatch(before.id,a.id);
 await decideIntroduction(match,a.id,{decision:'approve',identity:{displayName:'Private A',contact:'a@example.invalid'}});
 const [receipt]=await q('select a_identity,b_identity,a_approved_at,b_approved_at from matches where id=$1',[before.id]);
 await setIdeaPublished(a,card.ideaId!,false);
 assert.equal((await ideasFor(a.id)).length,0);
 assert.equal((await savedIdeasFor(a.id))[0].publicationStatus,'unpublished');
 assert.equal(await isIdeaPublished(a.id,card.ideaId),false);
 const [after]=await q('select * from matches where id=$1',[before.id]);
 assert.equal(after.declined_by,a.id);
 assert.deepEqual({a_identity:after.a_identity,b_identity:after.b_identity,a_approved_at:after.a_approved_at,b_approved_at:after.b_approved_at},receipt);
 const republished=await setIdeaPublished(a,card.ideaId!,true);
 assert.equal(republished.publicationStatus,'published');
 assert.equal(await isIdeaPublished(a.id,card.ideaId),true);
 assert.deepEqual((await ideasFor(a.id))[0],card);
 assert.equal((await q('select declined_by from matches where id=$1',[before.id]))[0].declined_by,a.id);
});

test('owner-only publication route rejects outsider and cross-origin, republish honors active quota',async()=>{
 const {PATCH}=await import('@/app/api/me/ideas/[ideaId]/route');
 const {setIdeaPublished,savedIdeasFor}=await import('./ideas');
 const a=await participant(),outsider=await participant();
 const card=await publishIdea(a,brief());
 const ctx={params:Promise.resolve({ideaId:card.ideaId!})};
 const patch=(id:string,published:boolean,origin?:string)=>new Request('http://localhost/api/me/ideas/'+card.ideaId,{method:'PATCH',headers:{host:'localhost',cookie:'wyj_session='+id,'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify({published})});
 assert.equal((await PATCH(patch(outsider.id,false),ctx)).status,404);
 assert.equal((await PATCH(patch(a.id,false,'https://evil.invalid'),ctx)).status,403);
 assert.equal((await PATCH(patch(a.id,false,'http://localhost'),ctx)).status,200);
 for(let i=0;i<5;i++)await publishIdea(a,brief('Replacement '+i));
 assert.equal((await planFor(a.id)).ideaCount,5);
 assert.equal((await savedIdeasFor(a.id)).length,6);
 assert.equal((await PATCH(patch(a.id,true),ctx)).status,409);
 assert.equal((await ideasFor(a.id)).length,5);
 await setIdeaPublished(a,(await ideasFor(a.id))[0].ideaId!,false);
 assert.equal((await PATCH(patch(a.id,true),ctx)).status,200);
});

test('legacy brief can be withdrawn and explicitly republished without card fallback',async()=>{
 const {setIdeaPublished,savedIdeasFor,isIdeaPublished}=await import('./ideas');
 const me=await participant();
 assert.equal((await legacyPut(request(me.id,brief('Legacy')),undefined)).status,200);
 assert.equal(await isIdeaPublished(me.id,'legacy'),true);
 await setIdeaPublished(me,'legacy',false);
 assert.equal((await ideasFor(me.id)).length,0);
 assert.equal(await isIdeaPublished(me.id,'legacy'),false);
 assert.equal((await savedIdeasFor(me.id))[0].publicationStatus,'unpublished');
 assert.equal((await legacyPut(request(me.id,brief('Sneaky replacement')),undefined)).status,409);
 await setIdeaPublished(me,'legacy',true);
 assert.equal((await ideasFor(me.id))[0].alias,'Legacy');
});

test('unpublishing cannot erase contacts already mutually revealed or shared pitch history',async()=>{
 const {setIdeaPublished}=await import('./ideas');
 const a=await participant('revealed-withdrawal'),b=await participant('revealed-withdrawal');
 const ca=await publishIdea(a,brief('A revealed'));
 await publishIdea(b,{...brief('B revealed'),offers:['sales'],seeks:['engineering']});
 await generate(request(a.id),undefined);
 const [row]=await q('select * from matches where a=$1 or b=$1',[a.id]);
 await decideIntroduction(await getMyMatch(row.id,a.id),a.id,{decision:'approve',identity:{displayName:'A',contact:'a@example.invalid'}});
 await decideIntroduction(await getMyMatch(row.id,b.id),b.id,{decision:'approve',identity:{displayName:'B',contact:'b@example.invalid'}});
 await q('insert into pitches (id,match_id,markdown) values ($1,$2,$3)',['retained-pitch-'+seq,row.id,'Existing shared work']);
 const before=await toView(await getMyMatch(row.id,a.id),a.id);
 await setIdeaPublished(a,ca.ideaId!,false);
 const after=await toView(await getMyMatch(row.id,a.id),a.id);
 assert.equal(after.status,'revealed');
 assert.deepEqual(after.revealedContact,before.revealedContact);
 assert.equal((await q('select markdown from pitches where match_id=$1',[row.id]))[0].markdown,'Existing shared work');
});


test('bulk candidates exclude unpublished collections without resurrecting legacy cards',async()=>{
 const me=await participant('bulk-active'),other=await participant('bulk-active');
 const inactive=await publishIdea(other,brief('Withdrawn'));
 const active=await publishIdea(other,brief('Published'));
 await setIdeaPublished(other,inactive.ideaId!,false);
 let candidates=await otherIdeasInEvent(me.id,me.eventId);
 assert.deepEqual(candidates.map(c=>c.ideaId),[active.ideaId]);
 await setIdeaPublished(other,active.ideaId!,false);
 candidates=await otherIdeasInEvent(me.id,me.eventId);
 assert.equal(candidates.length,0);
});
