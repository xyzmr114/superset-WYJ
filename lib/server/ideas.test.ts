import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ideasFor,publishIdea,planFor,choosePlan} from './ideas';
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

test('server publication schema rejects private extras and non-allowlisted preferences',()=>{
 assert.equal(Card.safeParse({...brief(),rawProfile:'PRIVATE'}).success,false);
 assert.equal(Card.safeParse({...brief(),preferences:{techStack:['Private employer'],strengths:[],partnerStrengths:[],workStyles:[]}}).success,false);
});
