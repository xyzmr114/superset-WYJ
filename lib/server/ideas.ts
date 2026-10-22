import type {MatchingCard} from '@/lib/contracts';
import type {z} from 'zod';
import {cardRow,q,transaction,type Participant,type Q} from './store';
import {HttpError,newId} from './http';
import {Card} from './brief-schema';

export async function hasIdeaCollection(id:string,query:Q=q){
 return (await query('select 1 from ideas where participant_id=$1 limit 1',[id])).length>0;
}
export async function ideasFor(id:string,query:Q=q):Promise<MatchingCard[]>{
 const rows=await query('select card from ideas where participant_id=$1 order by created_at, idea_id',[id]);
 if(rows.length)return rows.map(r=>r.card);
 return (await query('select * from cards where participant_id=$1',[id])).map(cardRow);
}
export async function planFor(id:string,query:Q=q){
 const [row]=await query('select plan from participant_plans where participant_id=$1',[id]);
 const plan:'free'|'premium'=row?.plan??'free';
 return {plan,ideaCount:(await ideasFor(id,query)).length,ideaLimit:plan==='free'?5:null,billingConnected:false};
}
export function choosePlan(id:string,plan:'free'|'premium'){
 return transaction(async query=>{
  await query('select id from participants where id=$1 for update',[id]);
  if(plan==='free'&&(await ideasFor(id,query)).length>5)throw new HttpError(409,'TOO_MANY_IDEAS','This session has more than five published ideas. Keep Premium preview to retain them.');
  await query('insert into participant_plans (participant_id,plan) values ($1,$2) on conflict (participant_id) do update set plan=excluded.plan',[id,plan]);
  return planFor(id,query);
 });
}
export function publishIdea(me:Participant,input:z.infer<typeof Card>){
 return transaction(async query=>{
  // One participant lock serializes publication, legacy edits and plan downgrades.
  await query('select id from participants where id=$1 for update',[me.id]);
  const old=await ideasFor(me.id,query),plan=await planFor(me.id,query);
  if(plan.ideaLimit!==null&&old.length>=plan.ideaLimit)throw new HttpError(409,'IDEA_LIMIT','Free includes five published ideas with unlimited founder matches. Open plans for Premium.');
  const {publishConsent:_,...fields}=input;
  const idea:MatchingCard={...structuredClone(fields),id:me.id,eventId:me.eventId,ideaId:newId(),version:1};
  const [current]=await query('select * from cards where participant_id=$1',[me.id]);
  // Freeze legacy pair briefs before changing the participant's current card.
  if(current)await query('update matches set a_card=case when a=$1 then coalesce(a_card,$2::jsonb) else a_card end,b_card=case when b=$1 then coalesce(b_card,$2::jsonb) else b_card end where a=$1 or b=$1',[me.id,JSON.stringify(cardRow(current))]);
  if(!await hasIdeaCollection(me.id,query))for(const card of old){
   await query('insert into ideas (participant_id,idea_id,card) values ($1,$2,$3::jsonb)',[me.id,card.ideaId??newId(),JSON.stringify(card)]);
  }
  await query('insert into ideas (participant_id,idea_id,card) values ($1,$2,$3::jsonb)',[me.id,idea.ideaId,JSON.stringify(idea)]);
  await query(`insert into cards (participant_id,event_id,alias,offers,seeks,interests,availability,approved_blurb,version,idea_id,preferences)
   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) on conflict (participant_id) do update set alias=excluded.alias,offers=excluded.offers,seeks=excluded.seeks,interests=excluded.interests,availability=excluded.availability,approved_blurb=excluded.approved_blurb,version=excluded.version,idea_id=excluded.idea_id,preferences=excluded.preferences`,
   [me.id,me.eventId,idea.alias,idea.offers,idea.seeks,idea.interests,idea.availability,idea.approvedBlurb,idea.version,idea.ideaId,JSON.stringify(idea.preferences??null)]);
  return idea;
 });
}
