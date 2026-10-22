import { NextResponse } from 'next/server';
import { db } from '@/lib/server/store';
import { HttpError, assertSameOrigin, newId, requireSession, route } from '@/lib/server/http';
import { evidenceFor, myMatches, pairKey, toView } from '@/lib/server/matches';
import { rankCandidates,scorePair } from '@/lib/matching';
import { proposeOpportunity } from '@/lib/generation';
import {ideasFor} from '@/lib/server/ideas';
import type {MatchingCard} from '@/lib/contracts';
const sameIdea=(a:MatchingCard|undefined,b:MatchingCard)=>a?.id===b.id&&(a.ideaId??'legacy')===(b.ideaId??'legacy');
function existing(mine:MatchingCard,other:MatchingCard){return [...db.matches.values()].some(m=>(m.a===mine.id&&m.b===other.id&&sameIdea(m.aCard??db.cards.get(m.a),mine)&&sameIdea(m.bCard??db.cards.get(m.b),other))||(m.b===mine.id&&m.a===other.id&&sameIdea(m.bCard??db.cards.get(m.b),mine)&&sameIdea(m.aCard??db.cards.get(m.a),other)));}
export const POST = route(async (req) => {
 assertSameOrigin(req);const me=requireSession(req);const mine=ideasFor(me.id);
 if(!mine.length)throw new HttpError(409,'NO_CARD','Publish your approved idea first.');
 const otherIdeas=[...db.participants.values()].filter(p=>p.id!==me.id&&p.eventId===me.eventId&&p.tokenHash!==null).flatMap(p=>ideasFor(p.id));
 for(const idea of mine){
  // Pick the strongest relevant idea from each founder, before ranking founders.
  const best=new Map<string,MatchingCard>();
  for(const card of otherIdeas){const scored=scorePair(idea,card);if(!scored.sharedInterests.length)continue;const prev=best.get(card.id);const previous=prev?scorePair(idea,prev):null;if(!previous||scored.score>previous.score||(scored.score===previous.score&&scored.preferenceScore>previous.preferenceScore))best.set(card.id,card);}
  for(const {candidate,score,sharedInterests} of rankCandidates(idea,[...best.values()],{requireSharedInterest:true,limit:Infinity})){
   if(existing(idea,candidate))continue;
   const evidence=await evidenceFor(sharedInterests[0]);if(existing(idea,candidate))continue;
   const opportunity={...proposeOpportunity(idea,candidate),evidenceIds:evidence.map(e=>e.id)};const [a,b]=pairKey(me.id,candidate.id);const id=newId();
   db.matches.set(id,{id,eventId:me.eventId,a,b,aCard:structuredClone(a===me.id?idea:candidate),bCard:structuredClone(b===me.id?idea:candidate),score,opportunity,evidence,approvals:new Set(),declinedBy:null});
  }
 }
 return NextResponse.json({matches:myMatches(me.id).map(m=>toView(m,me.id))});
});
