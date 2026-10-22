import {STRENGTHS,type MatchingCard} from '@/lib/contracts';
import type {LocalClassification} from './classifier-contract';
import type {CardInput} from '@/lib/client/api';
export function withPartnerNeeds(brief:CardInput,needs:string[]):CardInput{
 const seeks=[...new Set(needs)].slice(0,5);
 return {...brief,seeks,preferences:{techStack:brief.preferences?.techStack??[],strengths:brief.preferences?.strengths??[],workStyles:brief.preferences?.workStyles??[],partnerStrengths:seeks.filter(s=>(STRENGTHS as readonly string[]).includes(s))}};
}
export function withLocalSuggestions(brief:CardInput,result:LocalClassification):CardInput{
 return {...brief,offers:brief.offers.length?brief.offers:result.suggested.offers.slice(0,5),interests:brief.interests.length?brief.interests:result.suggested.interests.slice(0,4)};
}
export const availabilityLabel=(value:MatchingCard['availability'])=>value==='weekends'?'Evenings & weekends':value==='full_time'?'Full-time':'Exploring';
