import {put} from '@vercel/blob';
import {createReadStream} from 'node:fs';
import {manifest} from './manifest.mjs';
const prefix=process.env.MODEL_ASSET_PREFIX??'wyj-models-v1';
if(!/^[a-z0-9-]+$/.test(prefix))throw new Error('Use a versioned lowercase MODEL_ASSET_PREFIX.');
const plan=await manifest();
if(!process.argv.includes('--upload')){console.log(JSON.stringify({mode:'dry-run',prefix,totalBytes:plan.totalBytes,files:plan.files.map(f=>f.file)},null,2));process.exit(0);}
if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Set BLOB_READ_WRITE_TOKEN locally. No upload was attempted.');
let base;
for(const {file,bytes} of plan.files){const contentType=file.endsWith('.mjs')||file.endsWith('.js')?'application/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream';const result=await put(`${prefix}/${file}`,createReadStream(`public/${file}`),{access:'public',addRandomSuffix:false,multipart:bytes>5*1024*1024,contentType,cacheControlMaxAge:31536000});base=result.url.slice(0,-file.length-1);console.log(`Uploaded ${file}`);}
await put(`${prefix}/manifest.json`,JSON.stringify(plan,null,2),{access:'public',addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:31536000});
console.log(`Set MODEL_ASSET_BASE_URL to ${base} in public/model-assets.mjs, update scripts/browser-models-manifest.json, then redeploy.`);
