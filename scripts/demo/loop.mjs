import { spawn } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(process.env.WALKTHROUGH_OUTPUT || '.wyj-demo/loop-recordings');
await mkdir(root, {recursive:true});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let stopping=false, child;
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{stopping=true;child?.kill('SIGTERM');});
const previous=Number(process.env.WALKTHROUGH_WAIT_PID);
if(previous) while(!stopping) {try {process.kill(previous,0); await wait(1000);} catch {break;}}
let cycle=0;
while(!stopping) {
  const dir=path.join(root,`cycle-${Date.now()}`);
  console.log(`Starting walkthrough ${++cycle}`);
  const code=await new Promise(resolve=>{
    child=spawn(process.execPath,['scripts/demo/walkthrough.mjs'],{stdio:'inherit',env:{...process.env,WALKTHROUGH_OUTPUT:dir}});
    child.once('exit',resolve);child.once('error',error=>{console.error(error.message);resolve(1);});
  });
  console.log(`Walkthrough ${cycle} finished (${code ?? 'stopped'}).`);
  const recordings=(await readdir(root)).filter(name=>/^cycle-\d+$/.test(name)).sort().reverse();
  for(const old of recordings.slice(3)) await rm(path.join(root,old),{recursive:true,force:true});
  if(!stopping) await wait(4000);
}
