'use client';
import {useEffect,useState} from 'react';
import type {MatchView} from '@/lib/contracts';
import styles from './privacy-proof.module.css';
type Snapshot={stage:string;at:string;status:number;body:Record<string,unknown>;raw:string};
export default function PrivacyProof({match}:{match:MatchView}){
 const [open,setOpen]=useState(false),[refresh,setRefresh]=useState(0),[snapshots,setSnapshots]=useState<Snapshot[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const endpoint='/api/matches/'+encodeURIComponent(match.id);
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();setLoading(true);setError('');
  void(async()=>{try{
   const response=await fetch(endpoint,{cache:'no-store',credentials:'same-origin',signal:controller.signal});
   const raw=await response.text();const body=JSON.parse(raw) as Record<string,unknown>;
   if(!response.ok)throw new Error(`HTTP ${response.status}: response unavailable for this session.`);
   const approvals=Number(body.myIntroApproval===true)+Number(body.theirIntroApproval===true);
   const stage=approvals===2?'Two approvals':approvals===1?'One approval':'Before approval';
   const snapshot={stage,at:new Date().toISOString(),status:response.status,body,raw};
   setSnapshots(old=>[...old.filter(s=>s.stage!==stage),snapshot]);setSelected(stage);
  }catch(err){if(!controller.signal.aborted)setError(err instanceof Error?err.message:'Could not read response.');}
  finally{if(!controller.signal.aborted)setLoading(false);}})();
  return()=>controller.abort();
 },[open,refresh,endpoint,match.myIntroApproval,match.theirIntroApproval]);
 const active=snapshots.find(s=>s.stage===selected)??snapshots[snapshots.length-1];
 const hasContact=!!active&&Object.hasOwn(active.body,'revealedContact');
 const both=!!active&&active.body.myIntroApproval===true&&active.body.theirIntroApproval===true;
 const valid=!active||hasContact===both;
 return <details data-privacy-proof className={styles.proof} onToggle={event=>setOpen(event.currentTarget.open)}><summary>Live privacy evidence · inspect server response</summary>
  <p>This reads the actual authenticated match endpoint. Open before approving to capture each stage. Responses stay in this tab’s memory and are not uploaded or saved.</p>
  <p><strong>Brief:</strong> your approved brief is shared for matching. <strong>Identity:</strong> the server stores chosen introduction details; your counterpart receives them only after mutual approval.</p>
  <code>GET {endpoint}</code>
  <div className={styles.actions}>{snapshots.map(s=><button type="button" key={s.stage} aria-pressed={selected===s.stage} onClick={()=>setSelected(s.stage)}>{s.stage}</button>)}<button type="button" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>{loading?'Reading response…':'Fetch live response'}</button></div>
  {error&&<p role="alert">{error}</p>}
  {active&&<><div className={`${styles.result} ${!valid?styles.failure:''}`} role="status"><strong>{!valid?'Unexpected disclosure state — inspect response':hasContact?'Two approvals: counterpart contact is present':'Counterpart contact is absent from this response'}</strong><span>HTTP {active.status} · {new Date(active.at).toLocaleTimeString()} · revealedContact: {hasContact?'present':'omitted'}</span></div><p>{active.stage==='One approval'?'One person approved; this response still contains no revealedContact field.':active.stage==='Two approvals'?'Both approved; the response now includes the counterpart’s selected name and contact.':'No introduction approval has been given; contact is omitted.'}</p><pre aria-label={`Actual API response: ${active.stage}`}>{JSON.stringify(active.body,null,2)}</pre><p className={styles.note}>The JSON above is the complete parsed response, with no fields hidden by this panel. You can verify the same GET in browser DevTools → Network. Earlier captures are observations, not current access permissions. Reloading clears them.</p></>}
 </details>;
}
