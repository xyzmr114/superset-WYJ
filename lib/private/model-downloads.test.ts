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
