import type { ApiError, MatchingCard, MatchView, IntroductionIdentity } from '@/lib/contracts';
// Only approved card fields and identity go to the server. Private intake never passes through here.
export class ApiFailure extends Error {constructor(message:string,public status:number,public code?:string){super(message);}}
async function call<T>(method:string,url:string,body?:unknown):Promise<T>{
 const response=await fetch(url,{method,headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok){const err=await response.json().catch(()=>null) as ApiError|null;throw new ApiFailure(err?.error?.message ?? `Request failed (${response.status})`,response.status,err?.error?.code);}
 return response.json();
}
export type CardInput = Omit<MatchingCard,'id'|'eventId'|'version'>;
export const api={
 createSession:(eventCode?:string)=>call<{participantId:string;eventId:string}>('POST','/api/session',{eventCode}),
 putIdentity:(displayName:string,contact:string)=>call<{saved:true}>('PUT','/api/me/identity',{displayName,contact}),
 publishIdea:(card:CardInput)=>call<MatchingCard>('POST','/api/me/ideas',{...card,publishConsent:true}),
 publishCard:(card:CardInput)=>call<MatchingCard>('PUT','/api/me/card',{...card,publishConsent:true}),
 generateMatches:()=>call<{matches:MatchView[]}>('POST','/api/matches/generate',{}),
 consent:(id:string,decision:'approve'|'decline'|'withdraw',identity?:IntroductionIdentity)=>call<MatchView>('POST',`/api/matches/${encodeURIComponent(id)}/consent`,{decision,...(decision==='approve'?{identity}:{})}),
};
export async function fetchMatches():Promise<MatchView[]> {
 return (await call<{matches:MatchView[]}>('GET','/api/matches')).matches;
}
export const matchQueryKey=['matches'] as const;
