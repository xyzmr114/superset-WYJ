import {test} from 'node:test';
import assert from 'node:assert/strict';
import {q,matchRow} from './store';
import {introDecision,decideIntroduction} from './intro-consent';
import {getMyMatch,toView} from './matches';
import {isRevealed} from './pitches';
import {proposeOpportunity} from '@/lib/generation';
import {founderA,founderB} from '@/fixtures/profiles';
delete process.env.DATABASE_URL;
let sequence=0;
async function pair(){
 const suffix=++sequence;
 const a={...founderA,id:'consent-a-'+suffix,version:2},b={...founderB,id:'consent-b-'+suffix,version:3};
 for(const c of [a,b]){
  await q('insert into participants (id,event_id) values ($1,$2)',[c.id,c.eventId]);
  await q('insert into cards (participant_id,event_id,alias,offers,seeks,interests,availability,approved_blurb,version) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[c.id,c.eventId,c.alias,c.offers,c.seeks,c.interests,c.availability,c.approvedBlurb,c.version]);
 }
 const [row]=await q('insert into matches (id,event_id,a,b,score,opportunity,evidence) values ($1,$2,$3,$4,100,$5::jsonb,\'[]\') returning *',['consent-match-'+suffix,a.eventId,a.id,b.id,JSON.stringify(proposeOpportunity(a,b))]);
 return {a,b,m:matchRow(row)};
}
const identityA={displayName:'Founder A',contact:'a-private@example.invalid'},identityB={displayName:'Founder B',contact:'b-private@example.invalid'};
test('persisted exact approvals gate JSON identity and pitch; retries preserve the receipt',async()=>{
 const {a,b,m}=await pair();
 const first=await decideIntroduction(m,a.id,{decision:'approve',identity:identityA});
 for(const me of [a.id,b.id])assert.doesNotMatch(JSON.stringify(await toView(first,me)),/a-private|b-private|Founder A|Founder B|revealedContact/);
 assert.equal(isRevealed(first),false);
 assert.equal((await toView(first,b.id)).theirIntroApproval,true);
 const retry=await decideIntroduction(first,a.id,{decision:'approve',identity:identityA});
 assert.equal(retry.introConsents![a.id].approvedAt,first.introConsents![a.id].approvedAt);
 await assert.rejects(()=>decideIntroduction(first,a.id,{decision:'approve',identity:{...identityA,contact:'changed'}}),/Withdraw/);
 await q('insert into identities (participant_id,display_name,contact) values ($1,$2,$3)',[a.id,'Changed elsewhere','unapproved']);
 await decideIntroduction(first,b.id,{decision:'approve',identity:identityB});
 const persisted=await getMyMatch(m.id,a.id);
 assert.equal(isRevealed(persisted),true);
 assert.deepEqual((await toView(persisted,b.id)).revealedContact,identityA);
 assert.deepEqual((await toView(persisted,a.id)).revealedContact,identityB);
 assert.equal((await toView(persisted,a.id)).myConsent?.briefVersion,2);
 await assert.rejects(()=>decideIntroduction(persisted,a.id,{decision:'withdraw'}),/cannot be recalled/);
});
test('withdraw only clears the caller; decline prevents later disclosure',async()=>{
 const {a,b,m}=await pair();
 const first=await decideIntroduction(m,a.id,{decision:'approve',identity:identityA});
 const withdrawn=await decideIntroduction(first,a.id,{decision:'withdraw'});
 assert.equal((await toView(withdrawn,a.id)).status,'suggested');
 const second=await decideIntroduction(withdrawn,b.id,{decision:'approve',identity:identityB});
 assert.equal((await toView(second,a.id)).revealedContact,undefined);
 const declined=await decideIntroduction(second,a.id,{decision:'decline'});
 assert.equal((await toView(declined,b.id)).status,'declined');
 await assert.rejects(()=>decideIntroduction(declined,a.id,{decision:'approve',identity:identityA}),/passed on/);
});
test('outsiders and invalid consent fail; legacy approval bits never reveal identity',async()=>{
 const {a,b,m}=await pair();
 await assert.rejects(()=>getMyMatch(m.id,'outsider'),/Not found/);
 await assert.rejects(()=>decideIntroduction(m,'outsider',{decision:'approve',identity:identityA}),/Not found/);
 assert.equal(introDecision.safeParse({decision:'approve'}).success,false);
 assert.equal(introDecision.safeParse({decision:'approve',identity:identityA,participantId:a.id}).success,false);
 await q('update matches set a_approved=true,b_approved=true where id=$1',[m.id]);
 const legacy=await getMyMatch(m.id,a.id);
 assert.equal(isRevealed(legacy),false);
 assert.equal((await toView(legacy,a.id)).revealedContact,undefined);
});
test('concurrent different approvals cannot replace the winning snapshot',async()=>{
 const {a,m}=await pair();
 const results=await Promise.allSettled([
  decideIntroduction(m,a.id,{decision:'approve',identity:identityA}),
  decideIntroduction(m,a.id,{decision:'approve',identity:{...identityA,contact:'different'}}),
 ]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected').length,1);
});
