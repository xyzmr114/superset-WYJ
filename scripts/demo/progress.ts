// Progress only the fictional accounts held by this helper. Human approvals are never inferred.
import type {Db} from '../../lib/server/store';
import {api,loadSessions,type Session} from './client';
export async function progressSampleAgreements(db:Pick<Db,'q'>,seen:Map<string,number>,delay:number,options:{sessions?:()=>Session[];request?:typeof api;now?:()=>number}={}){
 const readSessions=options.sessions??loadSessions,request=options.request??api,now=options.now??Date.now;
 const byId=new Map(readSessions().map(session=>[session.participantId,session]));const ids=[...byId.keys()];
 if(!ids.length)return;
 const waiting=await db.q(`select 'trial' as kind,t.match_id as resource,t.version,
  case when m.a=any($1) and not t.a_approved then m.a else m.b end as founder
  from trials t join matches m on m.id=t.match_id where m.declined_by is null and m.a_approved and m.b_approved and t.deadline>now()
   and ((m.a=any($1) and not t.a_approved and t.b_approved) or (m.b=any($1) and not t.b_approved and t.a_approved))
  union all select 'pitch',p.id,p.version,
  case when m.a=any($1) and p.a_approved_version is distinct from p.version then m.a else m.b end
  from pitches p join matches m on m.id=p.match_id where m.declined_by is null and m.a_approved and m.b_approved
   and ((m.a=any($1) and p.a_approved_version is distinct from p.version and p.b_approved_version=p.version)
     or (m.b=any($1) and p.b_approved_version is distinct from p.version and p.a_approved_version=p.version))`,[ids]);
 for(const item of waiting){
  const session=byId.get(item.founder);if(!session)continue;
  const key=`${item.kind}:${item.resource}:${item.version}`,first=seen.get(key)??now();seen.set(key,first);
  if(now()-first<delay)continue;
  const path=item.kind==='trial'?`/api/matches/${encodeURIComponent(item.resource)}/trial`:`/api/pitches/${encodeURIComponent(item.resource)}/approve`;
  const result=await request('POST',path,item.kind==='trial'?{action:'approve',version:item.version}:{version:item.version},session.cookie);
  if(result.status===200)console.log(`${session.alias}: sample ${item.kind} approval v${item.version} saved`);
  else if(result.status!==409)console.log(`${session.alias}: ${item.kind} approval HTTP ${result.status}`);
 }
}
