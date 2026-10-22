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

test('warmup shares one public-only initialization and classification waits without replacing handlers',async()=>{
 const {warmBrowserClassifier,stopBrowserClassifier}=await import('./browser-classifier');
 const globals=globalThis as unknown as {window?:unknown;Worker?:unknown};const savedWindow=globals.window,savedWorker=globals.Worker;
 let instance:WarmWorker;let created=0;const messages:unknown[]=[];
 class WarmWorker{
  onmessage:((event:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;
  constructor(){instance=this;created++;}terminate(){}
  postMessage(message:{type:string}){messages.push(message);if(message.type==='classify')queueMicrotask(()=>this.onmessage?.({data:{type:'result',result:{status:'needs_review',suggested:{offers:['engineering'],seeks:[],interests:['travel'],availability:null}}}}));}
 }
 globals.window={};globals.Worker=WarmWorker;
 try{
  const progress:string[]=[];const first=warmBrowserClassifier(message=>progress.push(message));const second=warmBrowserClassifier();
  const result=classifyInBrowser('PRIVATE-PRELOAD-CANARY','travel');
  assert.equal(created,1);assert.deepEqual(messages,[{type:'warmup'}]);
  instance!.onmessage?.({data:{type:'progress',message:'Preparing public weights'}});assert.deepEqual(progress,['Preparing public weights']);
  instance!.onmessage?.({data:{type:'ready'}});
  assert.deepEqual(await Promise.all([first,second]),[true,true]);assert.equal((await result).status,'needs_review');
  assert.deepEqual(messages,[{type:'warmup'},{type:'classify',text:'Profile: PRIVATE-PRELOAD-CANARY\nIdea: travel'}]);
  assert.equal(await warmBrowserClassifier(),true);assert.equal(created,1);assert.equal(messages.length,2);
 }finally{stopBrowserClassifier();if(savedWindow===undefined)delete globals.window;else globals.window=savedWindow;if(savedWorker===undefined)delete globals.Worker;else globals.Worker=savedWorker;}
});

test('aborting a warmup subscriber does not cancel another subscriber or leak profile text',async()=>{
 const {warmBrowserClassifier,stopBrowserClassifier}=await import('./browser-classifier');
 const globals=globalThis as unknown as {window?:unknown;Worker?:unknown};const savedWindow=globals.window,savedWorker=globals.Worker;
 let instance:WarmWorker,terminated=0;const messages:unknown[]=[];
 class WarmWorker{onmessage:((event:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;constructor(){instance=this;}terminate(){terminated++;}postMessage(message:unknown){messages.push(message);}}
 globals.window={};globals.Worker=WarmWorker;
 try{
  const controller=new AbortController();const aborted=warmBrowserClassifier(undefined,controller.signal);const remaining=warmBrowserClassifier();controller.abort();assert.equal(await aborted,false);assert.equal(terminated,0);
  instance!.onmessage?.({data:{type:'ready'}});assert.equal(await remaining,true);assert.deepEqual(messages,[{type:'warmup'}]);
 }finally{stopBrowserClassifier();if(savedWindow===undefined)delete globals.window;else globals.window=savedWindow;if(savedWorker===undefined)delete globals.Worker;else globals.Worker=savedWorker;}
});

test('stopping during preload resolves both preload and waiting classification',async()=>{
 const {warmBrowserClassifier,stopBrowserClassifier}=await import('./browser-classifier');
 const globals=globalThis as unknown as {window?:unknown;Worker?:unknown};const savedWindow=globals.window,savedWorker=globals.Worker;
 let terminated=0;const messages:unknown[]=[];
 class WarmWorker{onmessage:unknown=null;onerror:unknown=null;terminate(){terminated++;}postMessage(message:unknown){messages.push(message);}}
 globals.window={};globals.Worker=WarmWorker;
 try{
  const warm=warmBrowserClassifier();const pending=classifyInBrowser('PRIVATE-STOP-CANARY','travel');stopBrowserClassifier();assert.equal(await warm,false);assert.equal((await pending).status,'unavailable');assert.equal(terminated,1);assert.deepEqual(messages,[{type:'warmup'}]);
 }finally{stopBrowserClassifier();if(savedWindow===undefined)delete globals.window;else globals.window=savedWindow;if(savedWorker===undefined)delete globals.Worker;else globals.Worker=savedWorker;}
});
