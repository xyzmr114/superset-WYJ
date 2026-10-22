import type {FounderPreferences} from '@/lib/contracts';
import type {CardInput} from '@/lib/client/api';

// Projection is deliberate: private text never becomes public prose automatically.
export function suggestedIdea(interests:string[],offers:string[]){
 const topic=interests[0]||'a shared problem';
 return `Exploring a product in ${topic}. I bring ${offers.join(' and ')||'an early idea'} and want to test a small first project with a complementary founder.`;
}
export function approvedBrief(input:CardInput):CardInput{
 const preferences:FounderPreferences|undefined=input.preferences?{
  techStack:[...input.preferences.techStack],strengths:[...input.preferences.strengths],
  partnerStrengths:[...input.preferences.partnerStrengths],workStyles:[...input.preferences.workStyles],
 }:undefined;
 return {alias:input.alias.trim(),offers:[...input.offers],seeks:[...input.seeks],interests:[...input.interests],availability:input.availability,approvedBlurb:input.approvedBlurb.trim(),...(preferences?{preferences}:{})};
}
export function identifyingDetails(text:string){
 return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|linkedin\.com|(?:\+?\d[\d ().-]{8,}\d)/i.test(text);
}
