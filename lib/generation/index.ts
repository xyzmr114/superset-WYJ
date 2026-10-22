import type { MatchingCard, Opportunity } from '@/lib/contracts';
export function proposeOpportunity(a: MatchingCard,b: MatchingCard): Opportunity {
 const domain=a.interests.find(x=>b.interests.includes(x)) ?? 'a shared problem';
 return {title:`Explore ${domain} together`,problemHypothesis:`Find one repetitive workflow in ${domain} that a small team can improve. This template is a hypothesis, not validated demand.`,targetUser:'To be chosen after customer interviews',whyThisPair:[`${a.alias} offers ${a.offers.join(', ')}.`,`${b.alias} offers ${b.offers.join(', ')}.`],evidenceIds:[],unknowns:['Who has this problem?','Will they pay?','Are both founders ready to commit?'],nextExperiment:'Interview five prospective users and document one repeated pain point before building.',generationMode:'template'};
}
