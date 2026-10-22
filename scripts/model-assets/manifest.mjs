import {readdir,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
export const roots=['models/laya','models/bonsai','laya-runtime','bonsai-runtime'];
export async function assetFiles(){const files=[];async function walk(dir){for(const entry of await readdir(`public/${dir}`,{withFileTypes:true})){const file=`${dir}/${entry.name}`;if(entry.isDirectory())await walk(file);else if(entry.isFile()&&!file.endsWith('.part'))files.push(file);}}for(const root of roots)await walk(root);return files.sort();}
export async function manifest(){const files=[];for(const file of await assetFiles()){const hash=createHash('sha256');for await(const chunk of createReadStream(`public/${file}`))hash.update(chunk);files.push({file,bytes:(await stat(`public/${file}`)).size,sha256:hash.digest('hex')});}return {format:1,createdAt:new Date().toISOString(),totalBytes:files.reduce((n,f)=>n+f.bytes,0),files};}
if(process.argv[1]?.endsWith('/manifest.mjs')){const result=await manifest();const output=process.argv[2]??'.wyj-local/browser-models-manifest.json';await writeFile(output,JSON.stringify(result,null,2));console.log(`${result.files.length} files, ${result.totalBytes} bytes. Manifest: ${output}`);}
