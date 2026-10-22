import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {submitBrowserAction} from './session';
import {browserActionSchema} from './contracts';

async function fixture(options:{changed?:boolean;uncertain?:boolean}={}){
  const directory=await mkdtemp(path.join(tmpdir(),'wyj-browser-test-'));
  const id=crypto.randomUUID();const action=browserActionSchema.parse({id:crypto.randomUUID(),kind:'linkedin_post',title:'A test draft',body:'The exact reviewed post'});
  let clicks=0;
  const page={isClosed:()=>false,url:()=> 'https://www.linkedin.com/sharing/compose',waitForURL:async()=>{if(options.uncertain)throw new Error('No confirmation');}};
  const button={count:async()=>1,isEnabled:async()=>true,click:async()=>{clicks++;}};
  const session={profile:directory,signedIn:true,page,busy:false,receipts:new Map(),prepared:new Map([[action.id,{page,action,fingerprint:createHash('sha256').update(JSON.stringify(action)).digest('hex'),editor:{innerText:async()=>options.changed?'Unexpected browser edits':action.body},dialog:{getByRole:()=>button}}]])};
  const sessions=(globalThis as unknown as {__wyjBrowsers:Map<string,unknown>}).__wyjBrowsers;sessions.set(id,session);
  return {id,action,clicks:()=>clicks,cleanup:async()=>{sessions.delete(id);await rm(directory,{recursive:true,force:true});},receipts:async()=>JSON.parse(await readFile(path.join(directory,'wyj-receipts.json'),'utf8'))};
}
test('a changed browser draft is never submitted',async()=>{
  const f=await fixture({changed:true});try{await assert.rejects(()=>submitBrowserAction(f.id,f.action),/draft has changed/);assert.equal(f.clicks(),0);}finally{await f.cleanup();}
});
test('a confirmed submission is recorded and cannot be repeated under the same action ID',async()=>{
  const f=await fixture();try{assert.equal((await submitBrowserAction(f.id,f.action)).status,'submitted');assert.equal((await submitBrowserAction(f.id,f.action)).status,'submitted');assert.equal(f.clicks(),1);assert.equal((await f.receipts())[0].status,'submitted');}finally{await f.cleanup();}
});
test('lost confirmation records an unknown result and blocks repeat submission',async()=>{
  const f=await fixture({uncertain:true});try{assert.equal((await submitBrowserAction(f.id,f.action)).status,'unknown');assert.equal((await submitBrowserAction(f.id,f.action)).status,'unknown');assert.equal(f.clicks(),1);assert.equal((await f.receipts())[0].status,'unknown');}finally{await f.cleanup();}
});
