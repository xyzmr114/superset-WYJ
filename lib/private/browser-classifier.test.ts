import test from 'node:test';
import assert from 'node:assert/strict';
import { browserClassifierText, classifyInBrowser } from './browser-classifier';
test('browser classifier input is only explicit profile and idea, bounded and labeled',()=>{
 assert.equal(browserClassifierText(' engineer ',' travel '),'Profile: engineer\nIdea: travel');
 assert.equal(browserClassifierText('',''),'');
 assert.equal(browserClassifierText('x'.repeat(12001),''),null);
});
test('server execution never creates a worker or sends private text',async()=>{
 const result=await classifyInBrowser('PRIVATE CANARY','travel');
 assert.equal(result.status,'unavailable'); assert.equal(JSON.stringify(result).includes('PRIVATE CANARY'),false);
});

test('browser request crosses only the worker boundary and strips unapproved output', async()=>{
 const globals=globalThis as unknown as {window?:unknown;Worker?:unknown};
 const savedWindow=globals.window,savedWorker=globals.Worker;
 let posted:unknown;
 class WorkerDouble {
   onmessage:((event:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;
   constructor(readonly url:string){assert.equal(url,'/laya-runtime/worker.mjs');}
   terminate(){}
   postMessage(message:unknown){posted=message; queueMicrotask(()=>this.onmessage?.({data:{type:'result',result:{status:'ready',suggested:{offers:['engineering','PRIVATE CANARY'],seeks:[],interests:['travel'],availability:null}}}}));}
 }
 globals.window={};globals.Worker=WorkerDouble;
 try{
   const result=await classifyInBrowser('PRIVATE CANARY','travel');
   assert.deepEqual(posted,{type:'classify',text:'Profile: PRIVATE CANARY\nIdea: travel'});
   assert.equal(result.status,'needs_review');assert.deepEqual(result.suggested.offers,['engineering']);
   assert.equal(JSON.stringify(result).includes('PRIVATE CANARY'),false);
 }finally{const {stopBrowserClassifier}=await import('./browser-classifier');stopBrowserClassifier();if(savedWindow===undefined)delete globals.window;else globals.window=savedWindow;if(savedWorker===undefined)delete globals.Worker;else globals.Worker=savedWorker;}
});

test('cancellation terminates the worker and returns manual entry without a remote retry',async()=>{
 const globals=globalThis as unknown as {window?:unknown;Worker?:unknown};
 const savedWindow=globals.window,savedWorker=globals.Worker;
 let terminated=false,posts=0;
 class PendingWorker {
   onmessage:unknown=null;onerror:unknown=null;
   terminate(){terminated=true;}
   postMessage(){posts++;}
 }
 globals.window={};globals.Worker=PendingWorker;
 try{
   const controller=new AbortController();
   const pending=classifyInBrowser('PRIVATE CANCEL CANARY','travel',undefined,controller.signal);
   controller.abort();const result=await pending;
   assert.equal(terminated,true);assert.equal(posts,1);assert.equal(result.status,'unavailable');
   assert.equal(JSON.stringify(result).includes('PRIVATE CANCEL CANARY'),false);
 }finally{const {stopBrowserClassifier}=await import('./browser-classifier');stopBrowserClassifier();if(savedWindow===undefined)delete globals.window;else globals.window=savedWindow;if(savedWorker===undefined)delete globals.Worker;else globals.Worker=savedWorker;}
});
