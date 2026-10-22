import {z} from 'zod';
import {transaction,matchRow,type Match} from './store';
import {isIdeaPublished} from './ideas';
import {HttpError,notFound} from './http';
export const introIdentity=z.object({displayName:z.string().trim().min(1).max(80),contact:z.string().trim().min(1).max(200)}).strict();
export const introDecision=z.discriminatedUnion('decision',[
 z.object({decision:z.literal('approve'),identity:introIdentity}).strict(),
 z.object({decision:z.literal('decline')}).strict(),
 z.object({decision:z.literal('withdraw')}).strict(),
]);
export const mutuallyApproved=(m:Match)=>!m.declinedBy&&!!m.introConsents?.[m.a]&&!!m.introConsents?.[m.b]&&m.approvals.has(m.a)&&m.approvals.has(m.b);

export async function decideIntroduction(m:Match,me:string,input:z.infer<typeof introDecision>):Promise<Match>{
 if(me!==m.a&&me!==m.b)throw notFound();
 return transaction(async query=>{
 // Same participant locks as publication changes, in a stable order, prevent a
 // second approval racing an unpublish from revealing a withdrawn brief.
 await query('select id from participants where id=any($1) order by id for update',[[m.a,m.b].sort()]);
 const [current]=await query('select * from matches where id=$1',[m.id]);
 if(!current)throw notFound();
 m=matchRow(current);
 const side=me===m.a?'a':'b';
 if(input.decision==='approve'){
  if(!mutuallyApproved(m)&&(!await isIdeaPublished(m.a,m.aCard?.ideaId,query)||!await isIdeaPublished(m.b,m.bCard?.ideaId,query)))
   throw new HttpError(409,'BRIEF_UNPUBLISHED','One founder has unpublished this brief. This introduction is no longer available.');
  // The conditional update freezes the first complete snapshot, even for concurrent requests.
  const [row]=await query(
   `update matches set ${side}_approved=true, ${side}_identity=$2::jsonb, ${side}_approved_at=now(),
      ${side}_card_version=coalesce((${side}_card->>'version')::integer,(select version from cards where participant_id=$3))
    where id=$1 and declined_by is null
      and (not ${side}_approved or ${side}_identity is null or ${side}_approved_at is null or ${side}_card_version is null)
      and (${side}_card is not null or exists (select 1 from cards where participant_id=$3)) returning *`,
   [m.id,JSON.stringify(input.identity),me]);
  if(row)return matchRow(row);
  const [stored]=await query('select * from matches where id=$1',[m.id]);
  if(!stored)throw notFound();
  const fresh=matchRow(stored);
  if(fresh.declinedBy)throw new HttpError(409,'DECLINED','This pairing was passed on.');
  const existing=fresh.introConsents?.[me];
  if(!existing)throw new HttpError(409,'NO_CARD','Publish your brief first.');
  if(existing.identity.displayName!==input.identity.displayName||existing.identity.contact!==input.identity.contact)
   throw new HttpError(409,'CONSENT_FIXED','Withdraw your approval before choosing different contact details.');
  return fresh;
 }
 // Check disclosure and clear only this person's consent in one atomic write.
 const [row]=await query(
  `update matches set ${side}_approved=false, ${side}_identity=null, ${side}_approved_at=null, ${side}_card_version=null
     ${input.decision==='decline'?', declined_by=coalesce(declined_by,$2)':''}
   where id=$1 and not (a_approved and b_approved and a_identity is not null and b_identity is not null
     and a_approved_at is not null and b_approved_at is not null and a_card_version is not null and b_card_version is not null) returning *`,
  input.decision==='decline'?[m.id,me]:[m.id]);
 if(!row)throw new HttpError(409,'ALREADY_REVEALED','The details already shared cannot be recalled.');
 return matchRow(row);
 });
}
