// Recover ONLY exact built-in fictional fixtures. Never adopt a user account by alias alone.
import {createHash,randomBytes} from 'node:crypto';
import {connect} from '../../lib/server/store';
import {setIdeaPublished} from '../../lib/server/ideas';
import type {DemoFounder} from './founders';
import {api,loadSessions,saveSessions,type Session} from './client';

export async function restoreFixedFounder(founder:DemoFounder):Promise<Session|null>{
 if(!process.env.DATABASE_URL)return null;
 const db=connect(process.env.DATABASE_URL);
 try{
  const rows=await db.q(`select p.id,p.event_id,i.idea_id,i.published,
   (select count(*)::int from matches m where (m.a=p.id or m.b=p.id) and m.declined_by is null and m.a_approved<>m.b_approved) as pending
   from participants p join identities d on d.participant_id=p.id join ideas i on i.participant_id=p.id
   where p.event_id='event-demo' and d.display_name=$1 and d.contact=$2 and i.card->>'alias'=$3
    and i.card->>'approvedBlurb'=$4 and i.card->'offers'=$5::jsonb and i.card->'seeks'=$6::jsonb
    and i.card->'interests'=$7::jsonb and i.card->>'availability'=$8
   order by i.published desc,pending desc,p.created_at`,[founder.displayName,founder.contact,founder.alias,founder.approvedBlurb,JSON.stringify(founder.offers),JSON.stringify(founder.seeks),JSON.stringify(founder.interests),founder.availability]);
  if(!rows.length)return null;
  const sessions=loadSessions(),known=sessions.find(s=>s.alias===founder.alias);
  const canonical=rows.find(r=>r.published&&r.pending>0)??rows.find(r=>r.published&&r.id===known?.participantId)??rows[0];
  let session=known?.participantId===canonical.id?known:undefined;
  if(!session||(await api('GET','/api/me/ideas',undefined,session.cookie)).status!==200){
   // Rotate a lost script credential only after the exact fixture and fictional identity checks above.
   const token=randomBytes(32).toString('base64url');
   await db.q('update participants set token_hash=$2 where id=$1',[canonical.id,createHash('sha256').update(token).digest('hex')]);
   session={alias:founder.alias,participantId:canonical.id,cookie:'wyj_session='+token,displayName:founder.displayName,contact:founder.contact};
  }
  saveSessions([...sessions.filter(s=>s.alias!==founder.alias),session]);
  // Unpublish is reversible; it preserves previously revealed contacts and receipts.
  // Never transfer a human approval to another pair. Keep the pending pair's original fixture account.
  for(const duplicate of rows)if(duplicate.published&&duplicate.idea_id!==canonical.idea_id)
   await setIdeaPublished({id:duplicate.id,eventId:duplicate.event_id},duplicate.idea_id,false);
  return session;
 }finally{await db.end();}
}
