import { NextResponse } from 'next/server';
import { q,transaction } from '@/lib/server/store';
import { HttpError, assertSameOrigin, newId, requireSession, route } from '@/lib/server/http';
import { evidenceFor, myMatches, pairKey, views } from '@/lib/server/matches';
import { rankCandidates,scorePair,hasPartnerFit } from '@/lib/matching';
import { proposeOpportunity } from '@/lib/generation';
import {ideasFor,isIdeaPublished} from '@/lib/server/ideas';
import type {MatchingCard} from '@/lib/contracts';

export const POST = route(async (req) => {
 assertSameOrigin(req);
 const me=await requireSession(req),mine=await ideasFor(me.id);
 if(!mine.length)throw new HttpError(409,'NO_CARD','Publish your approved idea first.');
 const participants=await q('select id from participants where id<>$1 and event_id=$2 and token_hash is not null',[me.id,me.eventId]);
 const otherIdeas=(await Promise.all(participants.map(p=>ideasFor(p.id)))).flat();
 const previous=await myMatches(me.id);
 const known=new Set(previous.map(m=>JSON.stringify([m.a,m.b,m.aCard?.ideaId??'legacy',m.bCard?.ideaId??'legacy'])));
 for(const idea of mine){
  // Pick the strongest relevant idea from each founder, before ranking founders.
  const best=new Map<string,MatchingCard>();
  for(const card of otherIdeas){
   const scored=scorePair(idea,card);
   if(!scored.sharedInterests.length||!hasPartnerFit(idea,card))continue;
   const prev=best.get(card.id),previous=prev?scorePair(idea,prev):null;
   if(!previous||scored.score>previous.score||(scored.score===previous.score&&scored.preferenceScore>previous.preferenceScore))best.set(card.id,card);
  }
  for(const {candidate,score,sharedInterests} of rankCandidates(idea,[...best.values()],{requireSharedInterest:true,requirePartnerFit:true,limit:Infinity})){
   const [a,b]=pairKey(me.id,candidate.id),aCard=a===me.id?idea:candidate,bCard=b===me.id?idea:candidate;
   const aIdea=aCard.ideaId??'legacy',bIdea=bCard.ideaId??'legacy';
   const key=JSON.stringify([a,b,aIdea,bIdea]);
   if(known.has(key))continue;
   const evidence=await evidenceFor(sharedInterests);
   const opportunity=proposeOpportunity(idea,candidate,evidence);
   await transaction(async query=>{
    await query('select id from participants where id=any($1) order by id for update',[[a,b]]);
    if(!await isIdeaPublished(a,aCard.ideaId,query)||!await isIdeaPublished(b,bCard.ideaId,query))return;
    await query(`insert into matches (id,event_id,a,b,score,opportunity,evidence,a_card,b_card,a_idea_id,b_idea_id)
    values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11) on conflict (a,b,a_idea_id,b_idea_id) do nothing`,
    [newId(),me.eventId,a,b,score,JSON.stringify(opportunity),JSON.stringify(evidence),JSON.stringify(aCard),JSON.stringify(bCard),aIdea,bIdea]);
   });
   known.add(key);
  }
 }
 return NextResponse.json({matches:await views(await myMatches(me.id),me.id)});
});
