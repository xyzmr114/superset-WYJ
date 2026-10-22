import {z} from 'zod';
import type {MatchingCard} from '@/lib/contracts';
import type {EvidenceResult} from '@/lib/evidence/github';
export const ResearchRequest=z.object({ideaId:z.string().min(1).max(200),briefVersion:z.number().int().positive(),consent:z.literal(true)}).strict();
export type ResearchInput=z.infer<typeof ResearchRequest>;
export function researchQuery(card:MatchingCard){return `${card.interests.slice(0,2).join(' ')} software tools open source`.slice(0,128);}
export type ResearchResult={query:string;briefVersion:number;sources:{title:string;url:string;summary:string}[];page:{title:string;url:string;content:string}|null;projects:EvidenceResult;warnings:string[];researchedAt:string};
