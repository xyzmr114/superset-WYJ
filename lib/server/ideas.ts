import type {MatchingCard} from '@/lib/contracts';
import type {z} from 'zod';
import {cardRow,q,transaction,type Participant,type Q} from './store';
import {HttpError,newId,notFound} from './http';
import {Card} from './brief-schema';

export async function hasIdeaCollection(id:string,query:Q=q){
 return (await query('select 1 from ideas where participant_id=$1 limit 1',[id])).length>0;
}
export type SavedIdea = MatchingCard & {publicationStatus:'published'|'unpublished';unpublishedAt:string|null};
/** Owner history includes withdrawn briefs. Matching callers must use ideasFor instead. */
export async function savedIdeasFor(id:string,query:Q=q):Promise<SavedIdea[]>{
 const rows=await query('select card,published,unpublished_at from ideas where participant_id=$1 order by created_at, idea_id',[id]);
 if(rows.length)return rows.map(r=>({...r.card,publicationStatus:r.published?'published':'unpublished',unpublishedAt:r.unpublished_at?new Date(r.unpublished_at).toISOString():null}));
 return (await query('select * from cards where participant_id=$1',[id])).map(r=>({...cardRow(r),publicationStatus:'published',unpublishedAt:null}));
}
export async function ideasFor(id:string,query:Q=q):Promise<MatchingCard[]>{
 const saved=await savedIdeasFor(id,query);
 return saved.filter(r=>r.publicationStatus==='published').map(({publicationStatus:_,unpublishedAt:__,...card})=>card);
}
/** Legacy cards are eligible only while no explicit idea collection replaces them. */
export async function isIdeaPublished(id:string,ideaId?:string,query:Q=q):Promise<boolean>{
 const active=await ideasFor(id,query);
 return active.some(card=>ideaId&&ideaId!=='legacy' ? card.ideaId===ideaId : !card.ideaId);
}
export function setIdeaPublished(me:Participant,ideaId:string,published:boolean){
 return transaction(async query=>{
  await query('select id from participants where id=$1 for update',[me.id]);
  // Materialize a legacy card before withdrawing it, so fallback cannot resurrect it.
  if(!await hasIdeaCollection(me.id,query)){
   const [legacy]=await query('select * from cards where participant_id=$1',[me.id]);
   if(legacy&&(legacy.idea_id??'legacy')===ideaId){
    const card=cardRow(legacy);
    await query('insert into ideas (participant_id,idea_id,card) values ($1,$2,$3::jsonb)',[me.id,card.ideaId??('legacy-'+me.id),JSON.stringify(card)]);
   }
  }
  const [row]=await query("select * from ideas where participant_id=$1 and (idea_id=$2 or ($2='legacy' and not (card ? 'ideaId'))) for update",[me.id,ideaId]);
  if(!row)throw notFound();
  if(row.published!==published){
   if(published){
    const plan=await planFor(me.id,query);
    if(plan.ideaLimit!==null&&plan.ideaCount>=plan.ideaLimit)throw new HttpError(409,'IDEA_LIMIT','Free includes five published ideas. Unpublish another idea first.');
   }
   await query('update ideas set published=$3,unpublished_at=case when $3 then null else now() end where participant_id=$1 and idea_id=$2',[me.id,row.idea_id,published]);
   if(!published){
    // Preserve receipts and already revealed contacts. Pending pairs are permanently cancelled.
    await query(`update matches set declined_by=coalesce(declined_by,$1) where not (a_approved and b_approved) and
     ((a=$1 and (a_idea_id=$2 or (a_idea_id='legacy' and not ($3::jsonb ? 'ideaId')))) or
      (b=$1 and (b_idea_id=$2 or (b_idea_id='legacy' and not ($3::jsonb ? 'ideaId')))))`,[me.id,row.idea_id,JSON.stringify(row.card)]);
   }
  }
  return (await savedIdeasFor(me.id,query)).find(card=>(card.ideaId??'legacy')===(row.card.ideaId??'legacy'))!;
 });
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
