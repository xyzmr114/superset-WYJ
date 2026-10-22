import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {build} from 'esbuild';
import {MODEL_ASSET_BASE_URL} from '../public/model-assets.mjs';

if(MODEL_ASSET_BASE_URL){
 const base=new URL(MODEL_ASSET_BASE_URL);
 assert(base.protocol==='https:'&&base.hostname.endsWith('.public.blob.vercel-storage.com')&&!base.search&&!base.hash);
 const manifest=JSON.parse(await readFile('scripts/browser-models-manifest.json','utf8'));
 // Models and WASM stay in Blob; deploy only the small JS runtimes and their licenses.
 for(const asset of manifest.files.filter(a=>/^(laya|bonsai)-runtime\//.test(a.file)&&!a.file.endsWith('.wasm')&&!a.file.endsWith('/worker.mjs'))){
  assert(!asset.file.includes('..')&&/^[a-zA-Z0-9_./-]+$/.test(asset.file));
  const response=await fetch(MODEL_ASSET_BASE_URL+'/'+asset.file);
  assert(response.ok,`Runtime download failed: ${asset.file}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  const target=path.join('public',asset.file);
  await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);
 }
 await writeFile('public/laya-runtime/worker.mjs',await readFile('scripts/browser-laya/worker.mjs'));
 await build({entryPoints:['scripts/browser-bonsai/worker.mjs'],outfile:'public/bonsai-runtime/worker.mjs',bundle:true,platform:'browser',format:'esm',conditions:['browser'],external:['/model-assets.mjs'],target:'es2022'});
 console.log('Prepared checksum-verified runtimes; model weights remain in Blob.');
}
