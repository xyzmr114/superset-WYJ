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
 return <details data-privacy-proof className={styles.proof} onToggle={event=>setOpen(event.currentTarget.open)}><summary>Privacy check</summary>
  <p>Your brief is shared for matching. Contact details are shared with each other only after you both approve.</p>
  {error&&<p role="alert">{error}</p>}
  {active&&<>
   <div className={styles.approvals}><span>{active.body.myIntroApproval===true?'✓ You approved':'○ Your approval needed'}</span><span>{active.body.theirIntroApproval===true?'✓ They approved':'○ Their approval needed'}</span></div>
   <div className={`${styles.result} ${!valid?styles.failure:''}`} role="status"><strong>{!valid?'This check needs attention':hasContact?'Contact shared after mutual approval':'Contact details are hidden from each other'}</strong><span>Checked at {new Date(active.at).toLocaleTimeString()}</span></div>
   {snapshots.length===1&&both&&<p className={styles.note}>This check started after both approvals. No earlier response was recorded.</p>}
  </>}
  <div className={styles.actions}>{snapshots.length>1&&snapshots.map(s=><button type="button" key={s.stage} aria-pressed={selected===s.stage} onClick={()=>setSelected(s.stage)}>{s.stage}</button>)}<button type="button" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>{loading?'Checking…':'Check again'}</button></div>
  {active&&<details data-privacy-response className={styles.technical}><summary>Technical proof · view server response</summary>
   <code>GET {endpoint}</code><p>HTTP {active.status} · revealedContact: {hasContact?'present':'omitted'}. The server stores your chosen introduction details; this response shows what this browser receives.</p>
   <pre aria-label={`Actual API response: ${active.stage}`}>{JSON.stringify(active.body,null,2)}</pre><p className={styles.note}>Complete parsed response, with no fields filtered by this panel. Verify the same GET in DevTools → Network. Earlier captures are timestamped observations, not current permissions. They stay in this tab’s memory; reloading clears them.</p>
  </details>}
 </details>;
}
