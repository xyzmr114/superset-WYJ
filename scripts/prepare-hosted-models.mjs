import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {build} from 'esbuild';
import {MODEL_ASSET_BASE_URL} from '../public/model-assets.mjs';

const assetBase=process.env.MODEL_ASSET_BASE_URL??MODEL_ASSET_BASE_URL;
if(assetBase){
 const base=new URL(assetBase);
 assert(base.protocol==='https:'&&base.hostname.endsWith('.public.blob.vercel-storage.com')&&!base.search&&!base.hash);
 const manifest=JSON.parse(await readFile('scripts/browser-models-manifest.json','utf8'));
 // Models and WASM stay in Blob; deploy only the small JS runtimes and their licenses.
 for(const asset of manifest.files.filter(a=>/^(laya|bonsai)-runtime\//.test(a.file)&&!a.file.endsWith('.wasm')&&!a.file.endsWith('/worker.mjs'))){
  assert(!asset.file.includes('..')&&/^[a-zA-Z0-9_./-]+$/.test(asset.file));
  const target=path.join('public',asset.file);
  let bytes=await readFile(target).catch(()=>null);
  if(!bytes||bytes.length!==asset.bytes||createHash('sha256').update(bytes).digest('hex')!==asset.sha256){
   const response=await fetch(assetBase+'/'+asset.file);
   assert(response.ok,`Runtime download failed: ${asset.file}`);
   bytes=Buffer.from(await response.arrayBuffer());
  }
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);
 }
 console.log('Prepared checksum-verified hosted runtimes; model weights remain in Blob.');
}
if(process.env.MODEL_ASSET_BASE_URL!==undefined)await writeFile('public/model-assets.mjs',`export const MODEL_ASSET_BASE_URL = ${JSON.stringify(assetBase)};\n`);
// Refresh workers for both asset modes. Do not require downloaded models or WASM
// merely to build a fresh clone: manual entry must remain deployable without them.
await mkdir('public/laya-runtime',{recursive:true});
await mkdir('public/bonsai-runtime',{recursive:true});
await build({entryPoints:['scripts/browser-laya/worker.mjs'],outfile:'public/laya-runtime/worker.mjs',bundle:true,platform:'browser',format:'esm',external:['/model-assets.mjs','/laya-runtime/*'],target:'es2022'});
await build({entryPoints:['scripts/browser-bonsai/worker.mjs'],outfile:'public/bonsai-runtime/worker.mjs',bundle:true,platform:'browser',format:'esm',conditions:['browser'],external:['/model-assets.mjs'],target:'es2022'});
console.log(assetBase
 ? 'Rebuilt both workers from current source; fixed public assets use the hosted base.'
 : 'Rebuilt both workers from current source; using local public assets. Missing models keep manual entry available.');
