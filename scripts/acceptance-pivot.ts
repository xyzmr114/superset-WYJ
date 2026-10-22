/** Against a running WYJ server: pnpm exec tsx scripts/acceptance-pivot.ts http://localhost:3002 */
import assert from 'node:assert/strict';
const base=process.argv[2]??'http://localhost:3002';
class Participant{
 cookie='';
 async call(method:string,path:string,body?:unknown){
  const response=await fetch(base+path,{method,headers:{Origin:base,...(this.cookie?{Cookie:this.cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];
  const text=await response.text();let data:any;try{data=JSON.parse(text);}catch{throw new Error('Non-JSON response for '+path);}
  return {status:response.status,data,text};
 }
}
const a=new Participant(),b=new Participant(),outsider=new Participant();const topic='consent-check-'+Date.now();let checks=0;
function check(condition:unknown,message:string){assert.ok(condition,message);checks++;}
async function run(){
 for(const person of [a,b,outsider])check((await person.call('POST','/api/session',{eventCode:process.env.EVENT_CODE??'SUPERSET'})).status===200,'create independent session');
 const fields={alias:'Private Pine',offers:['engineering'],seeks:['sales'],interests:[topic],availability:'weekends',approvedBlurb:'Explore an agent booking workflow.',publishConsent:true,preferences:{techStack:['Python'],strengths:['technical depth'],partnerStrengths:['communication'],workStyles:['async-first']}};
 check((await a.call('PUT','/api/me/card',{...fields,rawProfile:'PRIVATE-7192'})).status===400,'raw private field rejected at publication boundary');
 const cardA=await a.call('PUT','/api/me/card',fields);check(cardA.status===200,'publish A');
 const cardB=await b.call('PUT','/api/me/card',{...fields,alias:'Private Cedar',offers:['sales'],seeks:['engineering']});check(cardB.status===200,'publish B');
 const generated=await a.call('POST','/api/matches/generate',{});const match=generated.data.matches?.find((m:any)=>m.candidate.id===cardB.data.id);check(!!match,'find reciprocal match');const path='/api/matches/'+match.id;
 check((await outsider.call('GET',path)).status===404,'outsider cannot read pairing');
 check((await outsider.call('POST',path+'/consent',{decision:'approve',identity:{displayName:'Outsider',contact:'outsider@example.invalid'}})).status===404,'outsider cannot approve');
 check((await a.call('POST',path+'/consent',{decision:'approve'})).status===400,'exact identity is required');
 const identityA={displayName:'Approved Founder A',contact:'approved-a@example.invalid'};const identityB={displayName:'Approved Founder B',contact:'approved-b@example.invalid'};
 check((await a.call('POST',path+'/consent',{decision:'approve',identity:identityA})).status===200,'first approval accepted');
 for(const person of [a,b]){const response=await person.call('GET',path);check(!/revealedContact|Approved Founder|approved-[ab]@/.test(response.text),'one approval has no identity in JSON');}
 check((await a.call('POST',path+'/pitch',{})).status===409,'joint pitch locked before mutual reveal');
 check((await a.call('POST',path+'/consent',{decision:'approve',identity:{...identityA,contact:'unapproved-change@example.invalid'}})).status===409,'cannot replace a consent snapshot');
 check((await a.call('POST',path+'/consent',{decision:'withdraw'})).data.status==='suggested','withdraw resets own consent');
 check((await b.call('POST',path+'/consent',{decision:'approve',identity:identityB})).status===200,'other participant independently approves');
 check(!(await a.call('GET',path)).data.revealedContact,'withdrawn approval still prevents reveal');
 await b.call('PUT','/api/me/identity',{displayName:'Changed global identity',contact:'unapproved-global@example.invalid'});
 const mutual=await a.call('POST',path+'/consent',{decision:'approve',identity:identityA});
 check(mutual.data.status==='revealed'&&mutual.data.revealedContact.contact===identityB.contact,'mutual reveal uses approved B snapshot');
 const reverse=await b.call('GET',path);check(reverse.data.revealedContact.contact===identityA.contact,'B sees approved A snapshot');
 check((await outsider.call('GET',path+'/trial')).status===404,'outsider cannot read working trial');
 const pitch=await a.call('POST',path+'/pitch',{});check(pitch.status===200,'joint pitch unlocked after mutual reveal');check(!/Approved Founder|approved-[ab]@|unapproved-global/.test(pitch.text),'pitch uses aliases rather than identities');
 const plan={goal:'Test booking workflow for travel agents',deliverable:'One prototype and three interviews',myContribution:'Build booking API',theirContribution:'Run customer discovery',deadline:new Date(Date.now()+48*3600000).toISOString()};
 const proposal=await a.call('POST',path+'/trial',{action:'propose',version:0,plan});check(proposal.status===200&&proposal.data.trial.status==='proposed','create exact trial proposal');
 const version=proposal.data.trial.version;
 check((await b.call('GET',path+'/trial')).data.trial.plan.myContribution===plan.theirContribution,'contributions follow each participant perspective');
 check((await a.call('POST',path+'/trial',{action:'approve',version})).data.trial.status==='proposed','one trial approval not active');
 check((await b.call('POST',path+'/trial',{action:'approve',version})).data.trial.status==='active','two approvals activate same version');
 check((await a.call('POST',path+'/trial',{action:'propose',version,plan})).status===409,'active trial cannot silently change');
 const aFeedback=await a.call('POST',path+'/trial',{action:'feedback',version,decision:'continue'});check(aFeedback.data.trial.bothWantContinue===false,'one continuation stays private');
 const bBefore=await b.call('GET',path+'/trial');check(!bBefore.text.includes('myFeedback')&&!bBefore.text.includes('theirFeedback'),'other founder individual feedback absent');
 const mutualTrial=await b.call('POST',path+'/trial',{action:'feedback',version,decision:'continue'});check(mutualTrial.data.trial.bothWantContinue===true,'mutual continuation shared');
 const multi=new Participant();await multi.call('POST','/api/session',{eventCode:process.env.EVENT_CODE??'SUPERSET'});
 for(let i=0;i<5;i++)check((await multi.call('POST','/api/me/ideas',{...fields,alias:'Idea '+i})).status===200,'free idea slot '+(i+1));
 check((await multi.call('POST','/api/me/ideas',fields)).status===409,'sixth free idea blocked');
 check((await multi.call('GET','/api/me/plan')).data.ideaCount===5,'server counts five ideas');
 check((await multi.call('POST','/api/me/plan',{plan:'premium'})).data.billingConnected===false,'premium preview does not claim billing');
 check((await multi.call('POST','/api/me/ideas',fields)).status===200,'premium preview permits sixth idea');
 const peers=[];for(let i=0;i<6;i++){const peer=new Participant();await peer.call('POST','/api/session',{eventCode:process.env.EVENT_CODE??'SUPERSET'});await peer.call('POST','/api/me/ideas',{...fields,alias:'Peer '+i,offers:['sales'],seeks:['engineering']});peers.push(peer);}
 const unlimited=await multi.call('POST','/api/matches/generate',{});check(new Set(unlimited.data.matches.map((m:any)=>m.candidate.id)).size>=6,'more than five founder matches allowed');
 console.log(JSON.stringify({passed:checks,privacy:'No counterpart identity in JSON before both exact approvals',snapshot:'Global identity edits do not change approved details',pitch:'Unlocked only after mutual reveal'},null,2));
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
