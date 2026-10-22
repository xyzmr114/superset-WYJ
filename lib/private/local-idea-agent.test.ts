import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLocalIdea,warmLocalIdeaAgent,improveIdeaLocally,nameProjectLocally,stopLocalIdeaAgent} from './local-idea-agent';

test('a silent model times out, terminates, and can be retried',{timeout:1000},async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const g=globalThis as any,w=g.window,W=g.Worker;let terminated=0;
 class SilentWorker{onmessage:any;onerror:any;postMessage(){}terminate(){terminated++;}}
 g.window={};g.Worker=SilentWorker;
 try{let error:Error|undefined;void warmLocalIdeaAgent().catch(e=>{error=e;});t.mock.timers.tick(180001);await Promise.resolve();await Promise.resolve();assert.match(error?.message??'still pending',/timed out/i);assert.equal(terminated,1);}finally{stopLocalIdeaAgent();if(w===undefined)delete g.window;else g.window=w;if(W===undefined)delete g.Worker;else g.Worker=W;}
});
test('local idea agent bounds the explicitly chosen idea',()=>{
 assert.equal(validateLocalIdea(' travel booking tool '),'travel booking tool');
 assert.throws(()=>validateLocalIdea('x'));assert.throws(()=>validateLocalIdea('x'.repeat(4001)));
});
test('server never performs local generation or downloads',async()=>{
 await assert.rejects(()=>warmLocalIdeaAgent(),/only in your browser/);
 await assert.rejects(()=>improveIdeaLocally('PRIVATE CANARY travel booking tool'),/only in your browser/);
});
test('prewarming sends no text and generated draft stays a worker result',async()=>{
 const g=globalThis as unknown as {window?:unknown;Worker?:unknown};const w=g.window,W=g.Worker;
 const messages:unknown[]=[];
 class FakeWorker {onmessage:((e:{data:unknown})=>void)|null=null;onerror:unknown=null;terminate(){}postMessage(d:{id:number;type:string;idea?:string}){messages.push(d);queueMicrotask(()=>this.onmessage?.({data:d.type==='warm'?{id:d.id,type:'ready'}:{id:d.id,type:'result',text:'A focused draft'}}));}}
 g.window={};g.Worker=FakeWorker;
 try{await warmLocalIdeaAgent();const result=await improveIdeaLocally('PRIVATE CANARY booking tool');assert.deepEqual(Object.keys(messages[0] as object).sort(),['id','type']);assert.equal(result.text,'A focused draft');assert.equal(JSON.stringify(result).includes('PRIVATE CANARY'),false);}finally{stopLocalIdeaAgent();if(w===undefined)delete g.window;else g.window=w;if(W===undefined)delete g.Worker;else g.Worker=W;}
});
test('aborting warmup terminates model loading instead of making a hosted request',async()=>{
 const g=globalThis as unknown as {window?:unknown;Worker?:unknown};const w=g.window,W=g.Worker;let terminated=false;
 class PendingWorker {onmessage:unknown=null;onerror:unknown=null;postMessage(){}terminate(){terminated=true;}}
 g.window={};g.Worker=PendingWorker;
 try{const c=new AbortController();const pending=warmLocalIdeaAgent(undefined,c.signal);c.abort();await assert.rejects(()=>pending,/stopped/);assert.equal(terminated,true);}finally{stopLocalIdeaAgent();if(w===undefined)delete g.window;else g.window=w;if(W===undefined)delete g.Worker;else g.Worker=W;}
});
test('project nicknames use a dedicated local task and reject malformed output',async()=>{
 const g=globalThis as unknown as {window?:unknown;Worker?:unknown};const w=g.window,W=g.Worker;const messages:{type:string;idea?:string}[]=[];let output='Neigh Maniac';
 class FakeWorker{onmessage:((e:{data:unknown})=>void)|null=null;onerror:unknown=null;terminate(){}postMessage(d:{id:number;type:string;idea?:string}){messages.push(d);queueMicrotask(()=>this.onmessage?.({data:{id:d.id,type:'result',text:output}}));}}
 g.window={};g.Worker=FakeWorker;
 try{const result=await nameProjectLocally('Horse tinder');assert.equal(result.text,'Neigh Maniac');assert.equal(messages[0].type,'name');assert.equal(messages[0].idea,'Horse tinder');output='https://not-a-nickname.invalid';await assert.rejects(()=>nameProjectLocally('Horse tinder'),/another spin/);}finally{stopLocalIdeaAgent();if(w===undefined)delete g.window;else g.window=w;if(W===undefined)delete g.Worker;else g.Worker=W;}
});
