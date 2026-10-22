import {mkdirSync,openSync,readFileSync,writeFileSync,closeSync,unlinkSync,chmodSync} from 'node:fs';
import path from 'node:path';
/** PGlite's filesystem is single-process: refuse a second writer rather than lose data. */
export function lockLocalData(directory:string):()=>void{
 mkdirSync(directory,{recursive:true,mode:0o700});chmodSync(directory,0o700);
 const lock=directory+'.lock';
 for(let attempt=0;attempt<2;attempt++){
  try{const fd=openSync(lock,'wx',0o600);writeFileSync(fd,String(process.pid));closeSync(fd);let released=false;const release=()=>{if(released)return;released=true;try{unlinkSync(lock);}catch{}};process.once('exit',release);return()=>{process.removeListener('exit',release);release();};}
  catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;const pid=Number(readFileSync(lock,'utf8'));let alive=true;try{process.kill(pid,0);}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')alive=false;}if(!alive){unlinkSync(lock);continue;}throw new Error('Local WYJ data is already open in another server process. Stop that server or set a different WYJ_DATA_DIR.');}
 }
 throw new Error('Could not open local WYJ storage.');
}
