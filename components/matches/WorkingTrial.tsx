'use client';
import {useEffect,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import type {TrialPlan,TrialView} from '@/lib/contracts';
import styles from './matches.module.css';

type Action={action:'propose';plan:TrialPlan;version:number}|{action:'approve';version:number}|{action:'feedback';version:number;decision:'continue'|'pass'};
async function request(matchId:string,action?:Action):Promise<TrialView|null>{
 const response=await fetch(`/api/matches/${encodeURIComponent(matchId)}/trial`,{method:action?'POST':'GET',cache:'no-store',...(action?{headers:{'Content-Type':'application/json'},body:JSON.stringify(action)}:{})});
 const body=await response.json();if(!response.ok)throw new Error(body.error?.message??'Could not load the working trial.');return body.trial;
}
const newPlan=():TrialPlan=>({goal:'Test whether we enjoy building together',deliverable:'One prototype and feedback from three potential users',myContribution:'',theirContribution:'',deadline:localDeadline(new Date(Date.now()+48*3600000).toISOString())});
function localDeadline(iso:string){const date=new Date(iso);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
export default function WorkingTrial({matchId}:{matchId:string}){
 const client=useQueryClient();const key=['working-trial',matchId];
 const query=useQuery({queryKey:key,queryFn:()=>request(matchId),refetchInterval:3000,refetchIntervalInBackground:true});
 const [editing,setEditing]=useState(false);const [draft,setDraft]=useState<TrialPlan>(newPlan);const [editingVersion,setEditingVersion]=useState(0);const [reviewed,setReviewed]=useState(false);
 const mutation=useMutation({mutationFn:(action:Action)=>request(matchId,action),onSuccess:trial=>{client.setQueryData(key,trial);setEditing(false);setReviewed(false);},onError:()=>void client.invalidateQueries({queryKey:key})});
 const trial=query.data;const busy=mutation.isPending;
 useEffect(()=>{setReviewed(false);},[trial?.version]);
 function edit(){setDraft(trial?{...trial.plan,deadline:localDeadline(trial.plan.deadline)}:newPlan());setEditingVersion(trial?.version??0);setReviewed(false);setEditing(true);mutation.reset();}
 const field=(name:keyof TrialPlan,value:string)=>{setDraft(current=>({...current,[name]:value}));setReviewed(false);};
 return <section className={styles.block} aria-label="Working trial"><p className="eyebrow">TRY BUILDING TOGETHER</p><h3>A small commitment before a big one.</h3><p>Agree on one useful experiment, who brings what, and a deadline. Both of you approve the same plan.</p>
 {query.isPending&&<p className="muted">Loading your trial…</p>}
 {(query.error||mutation.error)&&<p role="alert">{(mutation.error??query.error)?.message}</p>}
 {query.isError&&<button className={styles.quiet} onClick={()=>void query.refetch()}>Try again</button>}
 {query.isSuccess&&!trial&&!editing&&<button onClick={edit}>Propose a 48-hour working trial →</button>}
 {trial&&!editing&&<>
 <p className="badge">Trial v{trial.version} · {trial.status==='active'?'Both approved · ready to build':trial.status==='complete'?'Trial reflection complete':'Reviewing the proposal'}</p>
 <dl><dt><strong>Goal</strong></dt><dd>{trial.plan.goal}</dd><dt><strong>Deliverable</strong></dt><dd>{trial.plan.deliverable}</dd><dt><strong>Your contribution</strong></dt><dd>{trial.plan.myContribution}</dd><dt><strong>Their contribution</strong></dt><dd>{trial.plan.theirContribution}</dd><dt><strong>Deadline</strong></dt><dd>{new Date(trial.plan.deadline).toLocaleString()}</dd></dl>
 <p className="muted">{trial.myApproval?'✓':'○'} Your approval · {trial.theirApproval?'✓':'○'} Their approval</p>
 {trial.status==='proposed'&&<><label className="check"><input type="checkbox" checked={reviewed} disabled={busy||trial.myApproval} onChange={e=>setReviewed(e.target.checked)}/>I approve this exact trial v{trial.version}, including my contribution and deadline.</label><div className={styles.cardActions}>{!trial.myApproval&&<button disabled={busy||!reviewed} onClick={()=>mutation.mutate({action:'approve',version:trial.version})}>Approve this trial</button>}<button className={styles.quiet} disabled={busy} onClick={edit}>Suggest changes</button></div><p className="muted">Any change creates a new version and clears both approvals.</p></>}
 {(trial.status==='active'||trial.status==='complete')&&<><h4>After you try it: would you keep building together?</h4><p className="muted">Your individual answer stays private. Only a mutual yes is shared.</p>{!trial.myFeedback?<div className={styles.cardActions}><button disabled={busy} onClick={()=>mutation.mutate({action:'feedback',version:trial.version,decision:'continue'})}>Yes, keep building</button><button className={styles.quiet} disabled={busy} onClick={()=>mutation.mutate({action:'feedback',version:trial.version,decision:'pass'})}>Not this time</button></div>:<p>Your private answer is saved: {trial.myFeedback==='continue'?'keep building':'not this time'}.</p>}{trial.bothWantContinue?<p><strong>You both want to keep building. Pick your next milestone together.</strong></p>:trial.myFeedback?<p className="muted">We’ll let you know if there is a mutual yes.</p>:null}</>}
 </>}
 {editing&&<form className={styles.consentReview} onSubmit={e=>{e.preventDefault();if(reviewed)mutation.mutate({action:'propose',version:editingVersion,plan:{...draft,deadline:new Date(draft.deadline).toISOString()}});}}>
 <h4>Propose the exact shared plan</h4><p className="muted">This plan will be shared with your introduced counterpart. Keep private background out of it.</p>
 {(['goal','deliverable','myContribution','theirContribution'] as const).map(name=><label key={name}>{({goal:'Shared goal',deliverable:'Concrete deliverable',myContribution:'My contribution',theirContribution:'Their proposed contribution'})[name]}<textarea required maxLength={500} rows={2} disabled={busy} value={draft[name]} onChange={e=>field(name,e.target.value)}/></label>)}
 <label>Deadline<input type="datetime-local" required min={localDeadline(new Date().toISOString())} disabled={busy} value={draft.deadline} onChange={e=>field('deadline',e.target.value)}/></label>
 <label className="check"><input type="checkbox" checked={reviewed} disabled={busy} onChange={e=>setReviewed(e.target.checked)}/>Share this exact proposal. Each of us will approve it separately.</label>
 <div className={styles.cardActions}><button disabled={busy||!reviewed}>{busy?'Saving…':'Share trial proposal'}</button><button type="button" className={styles.quiet} disabled={busy} onClick={()=>{setEditing(false);setReviewed(false);mutation.reset();}}>Cancel</button></div>
 </form>}
 </section>;
}
