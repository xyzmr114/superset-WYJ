import type {PitchView,ApiError} from '@/lib/contracts';
export class PitchApiError extends Error {constructor(message:string,public status:number){super(message);}}
async function request<T>(url:string,init?:RequestInit):Promise<T>{
 const response=await fetch(url,{...init,headers:{'Content-Type':'application/json',...init?.headers}});
 if(!response.ok){const body=await response.json().catch(()=>null) as ApiError|null;throw new PitchApiError(body?.error?.message ?? `Request failed (${response.status})`,response.status);}
 return response.json();
}
export const pitchApi={
 read:(id:string)=>request<PitchView>(`/api/pitches/${encodeURIComponent(id)}`),
 create:(matchId:string)=>request<PitchView>(`/api/matches/${encodeURIComponent(matchId)}/pitch`,{method:'POST',body:'{}'}),
 save:(pitch:PitchView,markdown:string)=>request<PitchView>(`/api/pitches/${encodeURIComponent(pitch.id)}`,{method:'PUT',body:JSON.stringify({expectedVersion:pitch.version,markdown,proposedIdentityFields:pitch.proposedIdentityFields})}),
 approve:(pitch:PitchView)=>request<PitchView>(`/api/pitches/${encodeURIComponent(pitch.id)}/approve`,{method:'POST',body:JSON.stringify({version:pitch.version})}),
 export:async(id:string)=>{const response=await fetch(`/api/pitches/${encodeURIComponent(id)}/export`);if(!response.ok)throw new PitchApiError('Export refused. Both participants must approve the current saved version.',response.status);return response.text();}
};
