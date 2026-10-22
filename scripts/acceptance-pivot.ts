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
 const fields={alias:'Private Pine',offers:['engineering'],seeks:['sales'],interests:[topic],availability:'weekends',approvedBlurb:'Explore an agent booking workflow.',publishConsent:true};
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
 const pitch=await a.call('POST',path+'/pitch',{});check(pitch.status===200,'joint pitch unlocked after mutual reveal');check(!/Approved Founder|approved-[ab]@|unapproved-global/.test(pitch.text),'pitch uses aliases rather than identities');
 console.log(JSON.stringify({passed:checks,privacy:'No counterpart identity in JSON before both exact approvals',snapshot:'Global identity edits do not change approved details',pitch:'Unlocked only after mutual reveal'},null,2));
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
