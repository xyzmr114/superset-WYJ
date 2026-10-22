import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MockLanguageModelV4} from 'ai/test';
import {runAgent} from './runner';
import type {AgentEvent} from './schema';
const usage={inputTokens:{total:10,noCache:10,cacheRead:0,cacheWrite:0},outputTokens:{total:10,text:10,reasoning:0}};
const draft={title:'A starting point',problem:'Unverified workflow pain',customer:'Unknown buyer',solution:'One narrow workflow',team:'Skills to confirm',whyNow:'Post-pandemic demand is booming',experiment:'Interview five users',teammate:'A partner for customer discovery',jumpTest:'Validate repeated demand before committing',unknowns:['Who pays?']};
test('agent executes tools and carries their results into subsequent model steps',async()=>{
 const model=new MockLanguageModelV4({doGenerate:[
  {content:[{type:'tool-call',toolCallId:'t1',toolName:'get_founder_framework',input:'{}'}],finishReason:{unified:'tool-calls',raw:undefined},usage,warnings:[]},
  {content:[{type:'tool-call',toolCallId:'t2',toolName:'draft_solution_memo',input:JSON.stringify(draft)}],finishReason:{unified:'tool-calls',raw:undefined},usage,warnings:[]},
  {content:[{type:'text',text:'Your working memo is ready.'}],finishReason:{unified:'stop',raw:undefined},usage,warnings:[]}
 ]});
 const events:AgentEvent[]=[];
 await runAgent({provider:'test',model:'test',messages:[{role:'user',content:'Draft my memo'}]},model,e=>events.push(e),new AbortController().signal);
 assert.equal(model.doGenerateCalls.length,2);
 assert.ok(model.doGenerateCalls[1].prompt.some(m=>m.role==='tool'));
 const memo=events.find(e=>e.type==='memo');assert.ok(memo&&memo.type==='memo');assert.match(memo.markdown,/superset.com/);assert.match(memo.markdown,/Add your matching card/);assert.doesNotMatch(memo.markdown,/Skills to confirm/);assert.doesNotMatch(memo.markdown,/Post-pandemic/);assert.match(memo.markdown,/market timing still needs customer evidence/);
 assert.equal(events.at(-1)?.type,'done');
});
test('repeated tool requests stop at the step budget',async()=>{
 const model=new MockLanguageModelV4({doGenerate:async()=>({content:[{type:'tool-call',toolCallId:crypto.randomUUID(),toolName:'get_founder_framework',input:'{}'}],finishReason:{unified:'tool-calls',raw:undefined},usage,warnings:[]})});
 await runAgent({provider:'test',model:'test',messages:[{role:'user',content:'Continue'}]},model,()=>{},new AbortController().signal);
 assert.equal(model.doGenerateCalls.length,10);
});

test('memo action loads framework directly and requests one memo call with teammate and commitment experiment',async()=>{
 const model=new MockLanguageModelV4({doGenerate:[
  {content:[{type:'tool-call',toolCallId:'memo',toolName:'draft_solution_memo',input:JSON.stringify({...draft,teammate:'Find a hostel operator to own customer discovery.',jumpTest:'Get three paid pilots before increasing commitment.'})}],finishReason:{unified:'tool-calls',raw:undefined},usage,warnings:[]},
  {content:[{type:'text',text:'Ready.'}],finishReason:{unified:'stop',raw:undefined},usage,warnings:[]},
 ]});
 const events:AgentEvent[]=[];
 await runAgent({provider:'test',model:'test',action:'draft_memo',messages:[{role:'user',content:'Draft our hostel booking idea'}]},model,event=>events.push(event),new AbortController().signal);
 assert.equal(model.doGenerateCalls.length,1);
 assert.deepEqual(model.doGenerateCalls[0].toolChoice,{type:'tool',toolName:'draft_solution_memo'});
 assert.deepEqual(model.doGenerateCalls[0].tools?.map(tool=>tool.name),['draft_solution_memo']);
 const memo=events.find(event=>event.type==='memo');assert.ok(memo&&memo.type==='memo');
 assert.match(memo.markdown,/Who to build with/);assert.match(memo.markdown,/hostel operator/);assert.match(memo.markdown,/Before making the jump/);assert.match(memo.markdown,/three paid pilots/);
});
