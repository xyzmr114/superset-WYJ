import type {MatchingCard} from '@/lib/contracts';
import type {z} from 'zod';
import {db,type Participant} from './store';
import {HttpError,newId} from './http';
import {Card} from './brief-schema';
type Accounts={ideas:Map<string,MatchingCard[]>;plans:Map<string,'free'|'premium'>};
const globalAccounts=globalThis as typeof globalThis&{__wyjAccounts?:Accounts};
const accounts=globalAccounts.__wyjAccounts??= {ideas:new Map(),plans:new Map()};
export const hasIdeaCollection=(id:string)=>accounts.ideas.has(id);
export function ideasFor(id:string):MatchingCard[]{
 const current=accounts.ideas.get(id);if(current)return current;
 const legacy=db.cards.get(id);return legacy?[legacy]:[];
}
export function planFor(id:string){const plan=accounts.plans.get(id)??'free';return {plan,ideaCount:ideasFor(id).length,ideaLimit:plan==='free'?5:null,billingConnected:false};}
export function choosePlan(id:string,plan:'free'|'premium'){
 if(plan==='free'&&ideasFor(id).length>5)throw new HttpError(409,'TOO_MANY_IDEAS','This session has more than five published ideas. Keep Premium preview to retain them.');
 accounts.plans.set(id,plan);return planFor(id);
}
export function publishIdea(me:Participant,input:z.infer<typeof Card>){
 const old=ideasFor(me.id);const plan=planFor(me.id);
 if(plan.ideaLimit!==null&&old.length>=plan.ideaLimit)throw new HttpError(409,'IDEA_LIMIT','Free includes five published ideas with unlimited founder matches. Open plans for Premium.');
 const {publishConsent:_,...fields}=input;
 const idea:MatchingCard={...structuredClone(fields),id:me.id,eventId:me.eventId,ideaId:newId(),version:1};
 // Preserve older pairings before changing the participant's current idea.
 for(const match of db.matches.values()){
  const a=db.cards.get(match.a),b=db.cards.get(match.b);
  if(!match.aCard&&a)match.aCard=structuredClone(a);
  if(!match.bCard&&b)match.bCard=structuredClone(b);
 }
 accounts.ideas.set(me.id,[...old,idea]);db.cards.set(me.id,idea);return idea;
}
