import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openLocalDatabase} from './store';
import {hashToken,sessionCookieName,sessionToken} from './http';
import {POST} from '@/app/api/session/route';
test('disk database retains the profile and session token after closing and reopening',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'wyj-persist-'));const data=path.join(directory,'db');let db=await openLocalDatabase(data);
 try{
  await db.q('insert into participants(id,event_id,token_hash) values ($1,$2,$3)',['persist-founder','event-demo',hashToken('persist-token')]);
  const card={id:'persist-founder',eventId:'event-demo',ideaId:'persist-horse',version:1,alias:'Horse founder',offers:['horse training'],seeks:['engineering'],interests:['horse matchmaking'],availability:'weekends',approvedBlurb:'Horse matchmaking'};
  await db.q('insert into ideas(idea_id,participant_id,card) values ($1,$2,$3::jsonb)',['persist-horse','persist-founder',JSON.stringify(card)]);
  await assert.rejects(openLocalDatabase(data),/another server process/);
  await db.end();db=await openLocalDatabase(data);
  assert.equal((await db.q('select id from participants where token_hash=$1',[hashToken('persist-token')]))[0].id,'persist-founder');
  assert.deepEqual((await db.q('select card from ideas where idea_id=$1',['persist-horse']))[0].card,card);
 }finally{await db.end();await rm(directory,{recursive:true,force:true});}
});
test('starting again reuses and renews a valid session instead of orphaning published profiles',async()=>{
 const request=(cookie?:string)=>new Request('http://localhost/api/session',{method:'POST',headers:{host:'localhost','content-type':'application/json',...(cookie?{cookie}:{})},body:'{}'});
 const first=await POST(request(),undefined);assert.equal(first.status,200);const before=await first.json();const cookie=first.headers.get('set-cookie')!;assert.match(cookie,/Max-Age=2592000/);
 const next=await POST(request(cookie.split(';')[0]),undefined);assert.equal(next.status,200);assert.deepEqual(await next.json(),before);assert.match(next.headers.get('set-cookie')!,/HttpOnly/);
});

test('local ports keep distinct session cookies and malformed cookies are unauthenticated',()=>{assert.equal(sessionCookieName(new Request('http://localhost:3002/api/session')),'wyj_session_3002');const req=new Request('http://localhost:3002/api/session',{headers:{cookie:'wyj_session=old; wyj_session_3002=correct; wyj_session_3001=other'}});assert.equal(sessionToken(req),'correct');assert.equal(sessionToken(new Request('http://localhost:3002/api/session',{headers:{cookie:'wyj_session_3002=%zz'}})),null);});
