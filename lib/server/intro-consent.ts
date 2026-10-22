import {z} from 'zod';
import {db,type Match} from './store';
import {HttpError} from './http';
export const introIdentity=z.object({displayName:z.string().trim().min(1).max(80),contact:z.string().trim().min(1).max(200)}).strict();
export const introDecision=z.discriminatedUnion('decision',[
 z.object({decision:z.literal('approve'),identity:introIdentity}).strict(),
 z.object({decision:z.literal('decline')}).strict(),
 z.object({decision:z.literal('withdraw')}).strict(),
]);
export const mutuallyApproved=(m:Match)=>!m.declinedBy&&!!m.introConsents?.[m.a]&&!!m.introConsents?.[m.b]&&m.approvals.has(m.a)&&m.approvals.has(m.b);
export function decideIntroduction(m:Match,me:string,input:z.infer<typeof introDecision>){
 if(me!==m.a&&me!==m.b)throw new HttpError(404,'NOT_FOUND','Not found.');
 if(input.decision==='approve'){
  if(m.declinedBy)throw new HttpError(409,'DECLINED','This pairing was passed on.');
  const existing=m.introConsents?.[me];
  if(existing){if(existing.identity.displayName!==input.identity.displayName||existing.identity.contact!==input.identity.contact)throw new HttpError(409,'CONSENT_FIXED','Withdraw your approval before choosing different contact details.');return;}
  const mine=(me===m.a?m.aCard:m.bCard)??db.cards.get(me);if(!mine)throw new HttpError(409,'NO_CARD','Publish your brief first.');
  m.introConsents??={};
  m.introConsents[me]={identity:{...input.identity},briefVersion:mine.version,approvedAt:new Date().toISOString()};
  m.approvals.add(me);
 }else{
  if(mutuallyApproved(m))throw new HttpError(409,'ALREADY_REVEALED','You have both approved this introduction. The details already shared cannot be recalled.');
  m.approvals.delete(me);if(m.introConsents)delete m.introConsents[me];
  if(input.decision==='decline')m.declinedBy??=me;
 }
}
