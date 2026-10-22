import {z} from 'zod';
import type {MatchingCard} from '@/lib/contracts';

/** A reference to an already-published brief, never a new free-text payload. */
export const EnhancementRequest=z.object({
 ideaId:z.string().min(1).max(200),
 briefVersion:z.number().int().positive(),
 consent:z.literal(true),
}).strict();
export type EnhancementRequestInput=z.infer<typeof EnhancementRequest>;
export type EnhancementResult={markdown:string;provider:'DeepSeek';model:string;briefVersion:number};

/** Shared by the exact outgoing preview and server. Explicit projection prevents accidental identity leakage. */
export function approvedEnhancementInput(card:MatchingCard){
 return {
  approvedBlurb:card.approvedBlurb,
  offers:[...card.offers],seeks:[...card.seeks],interests:[...card.interests],availability:card.availability,
  ...(card.preferences?{preferences:{
   techStack:[...card.preferences.techStack],strengths:[...card.preferences.strengths],
   partnerStrengths:[...card.preferences.partnerStrengths],workStyles:[...card.preferences.workStyles],
  }}:{}),
 };
}
