/** Against a running WYJ server: pnpm exec tsx scripts/acceptance-pivot.ts http://localhost:3002 */
import assert from 'node:assert/strict';
const base=process.argv[2]??'http://localhost:3002';
const created:Participant[]=[];
class Participant{
 constructor(){created.push(this);}
 cookie='';
 async call(method:string,path:string,body?:unknown){
  const response=await fetch(base+path,{method,headers:{Origin:base,...(this.cookie?{Cookie:this.cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];
  const text=await response.text();let data:any;try{data=JSON.parse(text);}catch{data=null;}
  return {status:response.status,data,text};
 }
}
const a=new Participant(),b=new Participant(),outsider=new Participant();const topic='consent-check-'+Date.now();let checks=0;
function check(condition:unknown,message:string){assert.ok(condition,message);checks++;console.log(`PASS ${checks}: ${message}`);}
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
 const pitchPath='/api/pitches/'+pitch.data.id;
 check((await a.call('GET',pitchPath+'/export')).status===403,'pitch export blocked before approvals');
 check((await a.call('POST',pitchPath+'/approve',{version:pitch.data.version})).status===200,'A approves current pitch');
 check((await a.call('GET',pitchPath+'/export')).status===403,'one pitch approval cannot export');
 check((await b.call('POST',pitchPath+'/approve',{version:pitch.data.version})).data.bothApproved===true,'B approves same pitch version');
 const exported=await a.call('GET',pitchPath+'/export');
 check(exported.status===200&&exported.text.includes('#'),'approved pitch exports real Markdown');
 check(!/Approved Founder|approved-[ab]@/.test(exported.text),'export omits identities unless separately selected');
 check((await outsider.call('GET',pitchPath+'/export')).status===404,'outsider cannot export pitch');
 const edited=await a.call('PUT',pitchPath,{expectedVersion:pitch.data.version,markdown:pitch.data.markdown+'\n\nUpdated validation plan.',proposedIdentityFields:{me:['displayName']}});
 check(edited.status===200&&!edited.data.bothApproved,'editing pitch invalidates both approvals');
 check((await b.call('POST',pitchPath+'/approve',{version:pitch.data.version})).status===409,'stale pitch approval rejected');
 await a.call('POST',pitchPath+'/approve',{version:edited.data.version});await b.call('POST',pitchPath+'/approve',{version:edited.data.version});
 const namedExport=await a.call('GET',pitchPath+'/export');
 check(namedExport.status===200&&namedExport.text.includes(identityA.displayName)&&!namedExport.text.includes(identityA.contact)&&!namedExport.text.includes(identityB.displayName),'export includes only explicitly chosen A name');

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
async function cleanup(){
 let unpublished=0,failures=0;
 for(const participant of created){
  if(!participant.cookie)continue;
  const owned=await participant.call('GET','/api/me/ideas');
  if(owned.status!==200){failures++;continue;}
  for(const idea of owned.data.ideas??[]){
   if(idea.publicationStatus==='unpublished')continue;
   const result=await participant.call('PATCH','/api/me/ideas/'+encodeURIComponent(idea.ideaId??'legacy'),{published:false});
   if(result.status===200)unpublished++;else failures++;
  }
  const after=await participant.call('GET','/api/me/ideas');
  if((after.data.ideas??[]).some((idea:any)=>idea.publicationStatus!=='unpublished'))failures++;
 }
 console.log(JSON.stringify({cleanup:{sessions:created.length,unpublished,failures,preserved:'Published data from other sessions was not touched; no deletion performed.'}},null,2));
 if(failures)process.exitCode=1;
}
run().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(cleanup);

