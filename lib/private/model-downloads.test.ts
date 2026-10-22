import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

for(const [model,file] of [['laya','scripts/browser-laya/worker.mjs'],['bonsai','scripts/browser-bonsai/worker.mjs']]) {
 test(`${model} downloads fixed assets from Blob without forwarding private inputs`,async()=>{
  const calls:{url:string;options:any}[]=[];
  const self:any={location:{origin:'https://wyj.example',href:'https://wyj.example/worker.mjs'},postMessage(){},fetch:async(url:string,options:any)=>{calls.push({url:String(url),options});return {ok:false};}};
  const source=readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'');
  const env={backends:{onnx:{wasm:{}}},fetch:undefined};
  vm.runInNewContext(source,{self,globalThis:self,URL,Response,ReadableStream,env,MODEL_ASSET_BASE_URL:'https://example.public.blob.vercel-storage.com/wyj-v1'});
  if(model==='bonsai')assert.equal(env.fetch,self.fetch);
  const path=model==='laya'?'/models/laya/encoder.onnx':'/models/bonsai/Bonsai-1.7B-ONNX/onnx/model_q1.onnx_data';
  await self.fetch('https://wyj.example'+path);
  assert.equal(calls[0].url,'https://example.public.blob.vercel-storage.com/wyj-v1'+path);
  assert.equal(calls[0].options.credentials,'omit');
  for(const [url,options] of [
   ['https://wyj.example'+path+'?profile=PRIVATE',undefined],
   ['https://foreign.example'+path,undefined],
   ['https://wyj.example/api/agent',undefined],
   ['https://wyj.example'+path,{method:'POST',body:'PRIVATE'}],
  ] as const) await assert.rejects(()=>self.fetch(url,options));
  assert.equal(calls.length,1);
  const runtimePath=model==='laya'?'/laya-runtime/ort-wasm-simd-threaded.jsep.wasm':'/bonsai-runtime/ort-wasm-simd-threaded.jsep.wasm';
  await self.fetch('https://wyj.example'+runtimePath);
  assert.equal(calls[1].url,'https://example.public.blob.vercel-storage.com/wyj-v1'+runtimePath);
 });
}

test('Bonsai reports blocked weights before entering the library loader',async()=>{
 const messages:any[]=[];let libraryCalled=false;
 const self:any={location:{origin:'https://wyj.example',href:'https://wyj.example/worker.mjs'},postMessage:(m:any)=>messages.push(m),fetch:async()=>new Response('Your store is blocked',{status:403})};
 const source=readFileSync('scripts/browser-bonsai/worker.mjs','utf8').replace(/^import .*;\r?\n/gm,'');
 vm.runInNewContext(source,{self,URL,Response,Uint8Array,AbortSignal,navigator:{gpu:{requestAdapter:async()=>({})}},env:{backends:{onnx:{wasm:{}}}},pipeline:async()=>{libraryCalled=true;throw Error('library loader');},MODEL_ASSET_BASE_URL:'https://example.public.blob.vercel-storage.com/v1'});
 await self.onmessage({data:{id:1,type:'warm'}});
 assert.equal(libraryCalled,false);
 assert.equal(messages.at(-1).code,'ASSET_BLOCKED');
});

test('Bonsai supplies external weights explicitly so failed library downloads cannot hang',async()=>{
 let options:any;const messages:any[]=[];
 const pipe:any=()=>{};pipe.tokenizer=()=>({});pipe.model={generate:async()=>{}};
 const self:any={location:{origin:'https://wyj.example',href:'https://wyj.example/worker.mjs'},postMessage:(m:any)=>messages.push(m),fetch:async()=>new Response(new Uint8Array([1,2,3]))};
 const source=readFileSync('scripts/browser-bonsai/worker.mjs','utf8').replace(/^import .*;\r?\n/gm,'');
 vm.runInNewContext(source,{self,URL,Response,Uint8Array,AbortSignal,navigator:{gpu:{requestAdapter:async()=>({})}},env:{backends:{onnx:{wasm:{}}}},pipeline:async(_task:any,_model:any,o:any)=>{options=o;return pipe;},MODEL_ASSET_BASE_URL:''});
 await self.onmessage({data:{id:1,type:'warm'}});
 assert.equal(options.use_external_data_format,false);
 assert.equal(options.session_options.externalData[0].path,'model_q1.onnx_data');
 assert.deepEqual([...options.session_options.externalData[0].data],[1,2,3]);
 assert.equal(messages.at(-1).type,'ready');
});
