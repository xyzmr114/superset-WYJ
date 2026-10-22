"use client";
import {useEffect,useReducer,useRef,useState} from 'react';
import Link from 'next/link';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import type {PitchView} from '@/lib/contracts';
import {demoReducer,initialDemo} from './demo-state';
import {pitchApi,PitchApiError} from './api';
import styles from './pitch.module.css';
import FounderReview from './FounderReview';

function download(markdown:string,name:string){const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export default function PitchWorkspace({pitchId,matchId}:{pitchId?:string;matchId?:string}){
 const isDemo=!pitchId&&!matchId;
 const [demo,dispatch]=useReducer(demoReducer,undefined,initialDemo);
 const [activeId,setActiveId]=useState(pitchId);
 const client=useQueryClient();
 const key=['pitch',activeId];
 const live=useQuery({queryKey:key,queryFn:()=>pitchApi.read(activeId!),enabled:!isDemo&&!!activeId,refetchInterval:3000,retry:false});
 const pitch=isDemo?demo:live.data;
 const [draft,setDraft]=useState('');
 const [baseVersion,setBaseVersion]=useState<number|null>(null);
 const [reviewed,setReviewed]=useState(false);
 const [message,setMessage]=useState('');
 const [actionError,setActionError]=useState('');
 const [exporting,setExporting]=useState(false);
 const dirtyRef=useRef(false);
 const dirty=!!pitch&&draft!==pitch.markdown;
 dirtyRef.current=dirty;
 // Polling must never overwrite an unsaved draft. A newer version requires an explicit reload.
 useEffect(()=>{if(pitch&&baseVersion===null){setDraft(pitch.markdown);setBaseVersion(pitch.version);}},[pitch,baseVersion]);
 useEffect(()=>{setReviewed(false);},[pitch?.version,draft]);
 useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(dirtyRef.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[]);
 const stale=!!pitch&&baseVersion!==null&&baseVersion!==pitch.version;
 function acceptSaved(next:PitchView){client.setQueryData(['pitch',next.id],next);setDraft(next.markdown);setBaseVersion(next.version);setReviewed(false);setActionError('');}
 function fail(error:Error){setActionError(error.message);if(error instanceof PitchApiError&&error.status===409)void client.invalidateQueries({queryKey:key});}
 const create=useMutation({mutationFn:()=>pitchApi.create(matchId!),onSuccess:p=>{setActiveId(p.id);acceptSaved(p);},onError:fail});
 const save=useMutation({mutationFn:()=>pitchApi.save({...pitch!,version:baseVersion!},draft),onSuccess:p=>{acceptSaved(p);setMessage('Saved. Both participants must approve this new version.');},onError:fail});
 const approve=useMutation({mutationFn:()=>pitchApi.approve(pitch!),onSuccess:p=>{client.setQueryData(key,p);setMessage('Your approval was recorded for this version.');},onError:fail});
 const busy=create.isPending||save.isPending||approve.isPending||exporting;
 function saveDraft(){setMessage('');setActionError('');if(isDemo){const next=demoReducer(demo,{type:'save',markdown:draft});dispatch({type:'save',markdown:draft});setBaseVersion(next.version);setReviewed(false);setMessage('Saved. Both reviewers need to approve this version.');}else save.mutate();}
 function approveDraft(){setActionError('');if(isDemo){dispatch({type:'approve'});setMessage('Your review is complete.');}else approve.mutate();}
 async function exportDraft(copy:boolean){if(!pitch||dirty||stale||!pitch.exportable||!pitch.bothApproved)return;setExporting(true);setActionError('');try{const text=isDemo?pitch.markdown:await pitchApi.export(pitch.id);if(copy)await navigator.clipboard.writeText(text);else download(text,isDemo?'WYJ-example-pitch.md':`WYJ-pitch-v${pitch.version}.md`);setMessage(copy?'Approved draft copied.':'Approved draft downloaded.');}catch(e){fail(e instanceof Error?e:new Error('Export failed'));}finally{setExporting(false);}}
 return <section><div className={styles.topline}><p className="eyebrow">STEP 03 / BUILD THE CASE</p><span className="badge">{isDemo?'EXAMPLE DRAFT':'JOINT PITCH'}</span></div><h1>A shared idea.<br/><em>A deliberate next step.</em></h1><p className="lead">Shape the first experiment together. Review the exact draft before it leaves the room.</p>

 {!isDemo&&!activeId&&<article><h2>Create the shared draft</h2><p>Start your shared draft once you have both accepted the introduction.</p><button onClick={()=>create.mutate()} disabled={busy}>Create draft for this match</button></article>}
 {!isDemo&&live.isLoading&&<p role="status">Loading your shared draft…</p>}
 {!isDemo&&live.isError&&<div role="alert" className={styles.error}>{live.error.message} <button onClick={()=>void live.refetch()}>Retry</button></div>}
 {actionError&&<div role="alert" className={styles.error}>{actionError}</div>}
 {message&&<p role="status" className={styles.notice}>{message}</p>}
 {pitch&&<FounderReview disabled={busy||stale} onInsert={text=>{setDraft(current=>current+text);setMessage('Review notes added to the editor. Save a new version before requesting approvals.');}}/>}
 {pitch&&<div className={styles.workspace}><article className={styles.editor}><div className={styles.topline}><h2>Joint pitch</h2><span className="badge">VERSION {pitch.version}{dirty?' · UNSAVED':''}</span></div><p className="muted">Make the problem, the team, and your next experiment clear.</p>
 {stale&&<div role="alert" className={styles.error}>A newer saved version is available. Your local text is preserved. Copy any edits you need, then load the latest version before saving or approving.<button onClick={()=>{setDraft(pitch.markdown);setBaseVersion(pitch.version);setReviewed(false);}}>Load latest saved version</button></div>}
 <label htmlFor="pitch-markdown">Draft Markdown</label><textarea id="pitch-markdown" className={styles.draft} value={draft} onChange={e=>setDraft(e.target.value)} spellCheck={false}/><div className="actions"><button disabled={!dirty||stale||busy||!draft.trim()} onClick={saveDraft}>Save new version</button><span className="muted">Every save clears both approvals.</span></div></article>
 <aside className={styles.sidebar}><article><p className="eyebrow">READY TO SHARE?</p><h2>Same draft.<br/>Two approvals.</h2><div className={styles.approval}><span>You</span><strong>{pitch.myApproval?'Approved':'Review needed'}</strong></div><div className={styles.approval}><span>Other founder</span><strong>{pitch.bothApproved?'Approved':'Awaiting mutual approval'}</strong></div><h3>Included details</h3>{Object.keys(pitch.proposedIdentityFields).length===0?<p className="muted">No contact details included.</p>:<ul>{Object.entries(pitch.proposedIdentityFields).map(([owner,fields])=><li key={owner}>{owner}: {fields.join(', ')||'none'}</li>)}</ul>}
 <label className="check"><input type="checkbox" checked={reviewed} disabled={dirty||stale||busy||pitch.myApproval} onChange={e=>setReviewed(e.target.checked)}/>I reviewed saved version {pitch.version}, and am ready to share it.</label><button disabled={!reviewed||dirty||stale||busy||pitch.myApproval} onClick={approveDraft}>{pitch.myApproval?'You approved this version':'Approve this version'}</button>
 {isDemo&&<details><summary className="muted">Try the review flow</summary><button className={styles.demoButton} disabled={!pitch.myApproval||pitch.bothApproved||dirty||stale} onClick={()=>{dispatch({type:'partner'});setMessage('Example reviews complete. You can export this draft.');}}>Simulate second review</button></details>}
 </article><article><p className="eyebrow">TAKE IT WITH YOU</p><h3>Export the approved version</h3><p className="muted">Download a copy when you are both ready.</p><div className={styles.exports}><button disabled={!pitch.exportable||!pitch.bothApproved||dirty||stale||busy} onClick={()=>void exportDraft(false)}>Download .md</button><button disabled={!pitch.exportable||!pitch.bothApproved||dirty||stale||busy} onClick={()=>void exportDraft(true)}>Copy draft</button></div></article></aside></div>}
 <div className="actions"><Link className="secondary" href="/matches">← Back to counterparts</Link>{isDemo&&<button className={styles.demoButton} onClick={()=>{dispatch({type:'reset'});setBaseVersion(null);setReviewed(false);setMessage('');setActionError('');}}>Start over</button>}</div></section>;
}
