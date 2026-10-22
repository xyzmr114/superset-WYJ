import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {cardRow,matchRow,migrate,type Db,type Q} from './store';

test('migration upgrades existing pairs without losing cards, consent receipts or pitches',async()=>{
 const lite=new PGlite();
 const query:Q=async(text,params)=>(await lite.query(text,params)).rows;
 const db:Db={q:query,exec:sql=>lite.exec(sql),end:()=>lite.close(),transaction:fn=>lite.transaction(tx=>fn(async(text,params)=>(await tx.query(text,params)).rows))};
 try{
  await db.exec('create table schema_migrations (name text primary key,applied_at timestamptz not null default now())');
  const directory=path.join(process.cwd(),'db','migrations');
  for(const file of readdirSync(directory).filter(file=>/^00[1-4]_/.test(file)).sort()){
   await db.exec(readFileSync(path.join(directory,file),'utf8'));
   await query('insert into schema_migrations (name) values ($1)',[file]);
  }
  for(const [id,alias,version] of [['upgrade-a','Original A',7],['upgrade-b','Original B',3]] as const){
   await query('insert into participants (id,event_id) values ($1,$2)',[id,'upgrade-event']);
   await query(`insert into cards (participant_id,event_id,alias,offers,seeks,interests,availability,approved_blurb,version)
    values ($1,'upgrade-event',$2,'{engineering}','{sales}','{travel}','weekends','Approved original idea',$3)`,[id,alias,version]);
  }
  const [original]=await query(`insert into matches (id,event_id,a,b,score,opportunity,evidence,a_approved,a_identity,a_approved_at,a_card_version)
   values ('upgrade-match','upgrade-event','upgrade-a','upgrade-b',82,'{}','[]',true,'{"displayName":"Chosen name","contact":"chosen@example.invalid"}','2026-10-21T12:00:00Z',7) returning *`);
  await query("insert into pitches (id,match_id,markdown,a_approved_version) values ('upgrade-pitch','upgrade-match','Existing reviewed draft',1)");
  const originalCards=(await query('select * from cards order by participant_id')).map(cardRow);
  const originalReceipt=matchRow(original).introConsents;
  const applied:string[]=[];
  await migrate(db,name=>applied.push(name));
  assert.deepEqual(applied,['005_ideas_and_trials.sql','006_idea_publication.sql']);
  const [upgraded]=await query("select * from matches where id='upgrade-match'");
  const match=matchRow(upgraded);
  assert.deepEqual(match.aCard,originalCards[0]);
  assert.deepEqual(match.bCard,originalCards[1]);
  assert.deepEqual(match.introConsents,originalReceipt);
  assert.deepEqual(match.snapshots,matchRow(original).snapshots);
  assert.equal(match.approvals.has('upgrade-a'),true);
  assert.equal(match.approvals.has('upgrade-b'),false);
  assert.equal(upgraded.a_idea_id,'legacy');assert.equal(upgraded.b_idea_id,'legacy');
  assert.deepEqual((await query('select * from cards order by participant_id')).map(cardRow),originalCards);
  assert.deepEqual(await query('select markdown,a_approved_version from pitches'),[{markdown:'Existing reviewed draft',a_approved_version:1}]);
  await query("update cards set alias='Replacement',version=8 where participant_id='upgrade-a'");
  await migrate(db,name=>applied.push(name));
  assert.deepEqual(applied,['005_ideas_and_trials.sql','006_idea_publication.sql']);
  assert.deepEqual(matchRow((await query("select * from matches where id='upgrade-match'"))[0]).aCard,originalCards[0]);
 }finally{await db.end();}
});
