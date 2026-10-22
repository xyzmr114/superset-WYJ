import type {Participant} from './store';
import {HttpError,notFound} from './http';
import {ideasFor,planFor} from './ideas';
import {searchWeb,fetchWebPage} from '@/lib/research/web';
import {searchPublicProjects} from '@/lib/evidence/github';
import {researchQuery,type ResearchInput,type ResearchResult} from '@/lib/premium/research-contract';
import {identifyingDetails} from '@/lib/private/brief';
export async function researchApprovedIdea(me:Participant,input:ResearchInput,options:{search?:typeof searchWeb;read?:typeof fetchWebPage;projects?:typeof searchPublicProjects;signal?:AbortSignal}={}):Promise<ResearchResult>{
 if((await planFor(me.id)).plan!=='premium')throw new HttpError(403,'PREMIUM_REQUIRED','Choose Premium preview to research an approved idea.');
 const idea=(await ideasFor(me.id)).find(card=>(card.ideaId??card.id)===input.ideaId);if(!idea)throw notFound();
 if(idea.version!==input.briefVersion)throw new HttpError(409,'BRIEF_CHANGED','Review the current published brief before researching.');
 if(input.consent!==true)throw new HttpError(400,'CONSENT_REQUIRED','Approve the exact search query first.');
 const query=researchQuery(idea);if(identifyingDetails(query))throw new HttpError(400,'INVALID_TOPICS','Use project topics without contact details or links.');
 const signal=options.signal??AbortSignal.timeout(45000);const warnings:string[]=[];
 const [web,projects]=await Promise.all([(options.search??searchWeb)(query,signal).catch(()=>{warnings.push('Live web search is unavailable. No web results were invented.');return {results:[]};}),(options.projects??searchPublicProjects)(idea.interests)]);
 const sources=(web.results as {title:string;url:string;summary:string}[]).map(({title,url,summary})=>({title,url,summary}));
 let page:ResearchResult['page']=null;
 if(sources[0])try{const result=await(options.read??fetchWebPage)(sources[0].url,signal);page={url:result.url,title:result.title,content:result.content.slice(0,6000)};}catch{warnings.push('The first source could not be read. Search summaries remain leads to verify.');}
 if(!sources.length&&!projects.evidence.length)warnings.push('No sources found for these topics. Try a broader published niche.');
 return {query,briefVersion:idea.version,sources,page,projects,warnings,researchedAt:new Date().toISOString()};
}
