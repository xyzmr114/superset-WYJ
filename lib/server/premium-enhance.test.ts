import {test} from 'node:test';
import assert from 'node:assert/strict';
import {db,type Participant} from './store';
import {choosePlan,publishIdea} from './ideas';
import {enhanceApprovedIdea} from './premium-enhance';
import {EnhancementRequest,approvedEnhancementInput} from '@/lib/premium/enhancement-contract';
import {POST} from '@/app/api/premium/enhance/route';
import {hashToken,SESSION_COOKIE} from './http';
import type {MatchingCard} from '@/lib/contracts';
let sequence=0;
function founder(premium=true){
 const me:Participant={id:`enhance-founder-${++sequence}`,eventId:'premium-test',tokenHash:'not-real-cookie'};
 db.participants.set(me.id,me);if(premium)choosePlan(me.id,'premium');
 const idea=publishIdea(me,{alias:'Alias excluded from cloud',offers:['engineering'],seeks:['sales'],interests:['travel'],availability:'weekends',approvedBlurb:'A booking layer for travel agents.',preferences:{techStack:['TypeScript'],strengths:['technical depth'],partnerStrengths:['sales'],workStyles:['async-first']},publishConsent:true});
 db.identities.set(me.id,{displayName:'PRIVATE_NAME_CANARY',contact:'PRIVATE_CONTACT_CANARY'});
 return {me,idea,input:{ideaId:idea.ideaId!,briefVersion:idea.version,consent:true as const}};
}
const text='## Improved concept\nA narrow booking workflow for independent travel agents.\n## 48-hour test\nTry a manual workflow with three agents and measure time saved.';
const okay=async()=>Response.json({choices:[{message:{content:text},finish_reason:'stop'}]});
const status=(value:number)=>async()=>new Response(null,{status:value});

test('cloud request strictly references a published idea and explicit exact-version consent',()=>{
 const input={ideaId:'idea',briefVersion:1,consent:true};assert.equal(EnhancementRequest.safeParse(input).success,true);
 for(const bad of [{...input,consent:false},{...input,briefVersion:0},{...input,rawProfile:'SECRET'},{...input,brief:{approvedBlurb:'new unreviewed text'}},{...input,answers:{problem:'SECRET'}},{...input,participantId:'another-owner'}])assert.equal(EnhancementRequest.safeParse(bad).success,false);
});
test('DeepSeek receives only the exact projected approved brief, never identity, IDs, aliases or arbitrary private properties',async()=>{
 const {me,idea,input}=founder();Object.assign(idea,{privateGoal:'PRIVATE_GOAL_CANARY',rawProfile:'PRIVATE_PROFILE_CANARY'});
 let requestBody='';let endpoint='';
 const result=await enhanceApprovedIdea(me,input,{apiKey:'unit-test-key',fetch:async(url,init)=>{endpoint=String(url);requestBody=String(init?.body);assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer unit-test-key');assert.equal(init?.cache,'no-store');assert.ok(init?.signal);return okay();}});
 assert.equal(endpoint,'https://api.deepseek.com/chat/completions');
 const sent=JSON.parse(requestBody);assert.equal(sent.model,'deepseek-flash');assert.equal(sent.messages.length,2);
 assert.deepEqual(JSON.parse(sent.messages[1].content),approvedEnhancementInput(idea));
 assert.doesNotMatch(requestBody,/PRIVATE_|Alias excluded|enhance-founder-|premium-test|ideaId/);
 assert.deepEqual(result,{markdown:text,model:'deepseek-flash',provider:'DeepSeek',briefVersion:1});
});
test('free plan, another owner, stale version and missing consent are rejected before any provider call',async()=>{
 const free=founder(false),a=founder(),b=founder();let calls=0;
 const options={apiKey:'unit-test-key',fetch:async()=>{calls++;return okay();}};
 await assert.rejects(()=>enhanceApprovedIdea(free.me,free.input,options),{status:403,code:'PREMIUM_REQUIRED'});
 await assert.rejects(()=>enhanceApprovedIdea(a.me,b.input,options),{status:404});
 await assert.rejects(()=>enhanceApprovedIdea(a.me,{...a.input,briefVersion:99},options),{status:409,code:'BRIEF_CHANGED'});
 await assert.rejects(()=>enhanceApprovedIdea(a.me,{...a.input,consent:false as true},options),{status:400,code:'CONSENT_REQUIRED'});
 assert.equal(calls,0);
});
test('missing configuration and provider failures return honest errors without template fallback or provider body',async()=>{
 const {me,input}=founder();
 await assert.rejects(()=>enhanceApprovedIdea(me,input,{apiKey:''}),{status:503});
 for(const providerStatus of [401,402,500])await assert.rejects(()=>enhanceApprovedIdea(me,input,{apiKey:'test',fetch:status(providerStatus)}),{status:502,code:'PROVIDER_UNAVAILABLE'});
 await assert.rejects(()=>enhanceApprovedIdea(me,input,{apiKey:'test',fetch:status(429)}),{status:429,code:'PROVIDER_BUSY'});
 await assert.rejects(()=>enhanceApprovedIdea(me,input,{apiKey:'test',fetch:async()=>{throw new Error('sensitive provider error');}}),{status:502});
 for(const content of ['', 'too short', 'x'.repeat(20001)])await assert.rejects(()=>enhanceApprovedIdea(me,input,{apiKey:'test',fetch:async()=>Response.json({choices:[{message:{content}}]})}),{status:502,code:'INVALID_PROVIDER_OUTPUT'});
 await assert.rejects(()=>enhanceApprovedIdea(me,input,{apiKey:'test',fetch:async()=>Response.json({choices:[{message:{content:text},finish_reason:'length'}]})}),{status:502});
});
test('route requires a cookie session and rejects cross-origin before provider access',async()=>{
 const unauth=await POST(new Request('http://localhost/api/premium/enhance',{method:'POST',headers:{host:'localhost','Content-Type':'application/json'},body:JSON.stringify({ideaId:'x',briefVersion:1,consent:true})}),undefined);
 assert.equal(unauth.status,401);
 const cross=await POST(new Request('http://localhost/api/premium/enhance',{method:'POST',headers:{host:'localhost',origin:'https://other.test'},body:'{}'}),undefined);
 assert.equal(cross.status,403);
});
test('projection omits optional preferences when absent and clones all nested arrays',()=>{
 const card:MatchingCard={id:'id',eventId:'event',version:1,alias:'unused',approvedBlurb:'idea',offers:['engineering'],seeks:['sales'],interests:['travel'],availability:'weekends'};
 assert.equal('preferences' in approvedEnhancementInput(card),false);
 card.preferences={techStack:['Python'],strengths:['execution'],partnerStrengths:['sales'],workStyles:['async-first']};
 const payload=approvedEnhancementInput(card);payload.offers.push('data');payload.preferences!.techStack.push('SQL');assert.equal(card.offers.length,1);assert.equal(card.preferences.techStack.length,1);
});

test('authenticated route rejects arbitrary text and missing approval before any provider request',async()=>{
 const {me,input}=founder();const token='enhancement-test-'+me.id;db.sessions.set(hashToken(token),me.id);
 for(const body of [{...input,rawProfile:'PRIVATE_PROFILE'},{...input,answers:{notes:'PRIVATE_NOTES'}},{...input,consent:false}]){
  const result=await POST(new Request('http://localhost/api/premium/enhance',{method:'POST',headers:{host:'localhost','Content-Type':'application/json',cookie:SESSION_COOKIE+'='+token},body:JSON.stringify(body)}),undefined);
  assert.equal(result.status,400);assert.doesNotMatch(await result.text(),/PRIVATE_/);
 }
});
