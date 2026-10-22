"use client";
import {useEffect,useState} from 'react';
import type {ResearchPerson} from '@/lib/agent/schema';
import {PROSPECTS_KEY,restoreProspects,shortlist,profileKey,followupPrompt,type Prospect} from '@/lib/agent/prospects';
import type {BrowserAction,BrowserReceipt} from '@/lib/browser/contracts';
import {browserCommand,useBrowserConnection} from './BrowserDock';
import styles from './agent.module.css';

type ReceiptUpdate={action:BrowserAction;receipt:BrowserReceipt};
export default function ProspectBoard({people,goal,actions,onFollowup,canDraft,receiptUpdate}:{people:ResearchPerson[];goal:string;actions:BrowserAction[];onFollowup:(prompt:string,label:string)=>void;canDraft:boolean;receiptUpdate:ReceiptUpdate|null}){
  const [prospects,setProspects]=useState<Prospect[]>([]);const [ready,setReady]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{try{setProspects(restoreProspects(localStorage));}catch{setError('Prospect storage is unavailable.');}setReady(true);},[]);
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(PROSPECTS_KEY,JSON.stringify(prospects));}catch{setError('Could not save prospects on this device.');}},[prospects,ready]);
  useEffect(()=>{
    if(!receiptUpdate||receiptUpdate.action.kind==='linkedin_post'||receiptUpdate.receipt.status!=='submitted')return;
    const {action}=receiptUpdate;
    setProspects(old=>old.map(p=>profileKey(p.url)===profileKey(action.profileUrl)?{...p,status:action.kind==='linkedin_connection'&&p.status==='shortlisted'?'invited':p.status,lastDraft:action.body,updatedAt:new Date().toISOString()}:p));
  },[receiptUpdate]);
  useEffect(()=>{
    if(!ready)return;
    setProspects(old=>{let changed=false;const next=old.map(p=>{const latest=actions.filter(a=>a.kind!=='linkedin_post'&&profileKey(a.profileUrl)===profileKey(p.url)).at(-1);if(!latest||latest.body===p.lastDraft)return p;changed=true;return {...p,lastDraft:latest.body};});return changed?next:old;});
  },[actions,ready]);
  function update(url:string,changes:Partial<Prospect>){setProspects(old=>old.map(p=>p.url===url?{...p,...changes,updatedAt:new Date().toISOString()}:p));}
  function draft(person:Prospect){const latest=actions.filter(a=>a.kind!=='linkedin_post'&&profileKey(a.profileUrl)===profileKey(person.url)).at(-1);onFollowup(followupPrompt({...person,lastDraft:latest?.body??person.lastDraft}),person.reply.trim()?`Draft a response to ${person.name}. Their latest reply: ${person.reply}`:`Draft a follow-up for ${person.name} about ${person.goal||'our project'}. No reply recorded yet.`);}
  return <article className={styles.prospectBoard}>
    <p className="eyebrow">YOUR PEOPLE</p><h2>Turn introductions into conversations.</h2>
    <p className="muted">Saved on this device, across chats. Track replies here and prepare the next message.</p>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {people.length>0&&<details open><summary>People researched · {people.length}</summary><div className={styles.people}>{people.map(person=>{
      const saved=prospects.some(p=>profileKey(p.url)===profileKey(person.url));
      return <div className={styles.person} key={person.url}><h3><a href={person.url} target="_blank" rel="noreferrer">{person.name} ↗</a></h3><p className="muted">{person.text?'Profile read · evidence available':'Found in search · profile not read yet'}</p>{person.text&&<details><summary>Read profile evidence</summary><p className={styles.profileText}>{person.text}</p></details>}<button className={styles.quiet} disabled={!ready||saved||prospects.length>=100} onClick={()=>setProspects(old=>{const next=shortlist(old,person,goal);const latest=actions.filter(a=>a.kind!=='linkedin_post'&&profileKey(a.profileUrl)===profileKey(person.url)).at(-1);return next.map(p=>profileKey(p.url)===profileKey(person.url)?{...p,lastDraft:latest?.body??p.lastDraft}:p);})}>{saved?'Saved to shortlist':'Save to shortlist'}</button></div>;
    })}</div></details>}
    <h3>Shortlist · {prospects.length}</h3>
    {!prospects.length&&<p className="muted">Save someone from your research to keep their context and track the conversation.</p>}
    {prospects.map(person=><ProspectRow key={person.url} person={person} update={changes=>update(person.url,changes)} remove={()=>setProspects(old=>old.filter(p=>p.url!==person.url))} draft={()=>draft(person)} canDraft={canDraft}/>)}
  </article>;
}
function ProspectRow({person,update,remove,draft,canDraft}:{person:Prospect;update:(changes:Partial<Prospect>)=>void;remove:()=>void;draft:()=>void;canDraft:boolean}){
  const connection=useBrowserConnection();const [checking,setChecking]=useState(false);const [thread,setThread]=useState('');const [error,setError]=useState('');
  async function checkReplies(){setChecking(true);setError('');try{const result=await browserCommand({command:'read_conversation',profileUrl:person.url});setThread(result.text);}catch(e){setError(e instanceof Error?e.message:'Conversation unavailable.');}finally{setChecking(false);}}
  return <div className={styles.prospect}>
    <div className={styles.actions}><h3><a href={person.url} target="_blank" rel="noreferrer">{person.name} ↗</a></h3><span className={styles.badge}>{person.status}</span></div>
    {person.goal&&<details className={styles.goalContext}><summary>Saved goal</summary><p className="muted">{person.goal}</p></details>}
    <label>Why this person?<textarea maxLength={2000} value={person.reason} onChange={e=>update({reason:e.target.value})} placeholder="Their experience, why they fit, and what I want to learn."/></label>
    <label>Conversation status<select value={person.status} onChange={e=>update({status:e.target.value as Prospect['status']})}><option value="shortlisted">Shortlisted</option><option value="invited">Invitation pending</option><option value="connected">Connected</option><option value="replied">Replied</option><option value="closed">Closed</option></select></label>
    <p className="muted">Update status after checking LinkedIn. A confirmed invitation sent from WYJ updates it automatically.</p>
    <button className={styles.quiet} disabled={checking||!connection.data?.signedIn} onClick={()=>void checkReplies()}>{checking?'Reading conversation…':'Check LinkedIn replies'}</button>
    {error&&<p role="status" className={styles.error}>{error} You can paste their reply below.</p>}
    {thread&&<details open><summary>Visible conversation · select their reply to copy below</summary><pre className={styles.profileText}>{thread}</pre></details>}
    <label>Latest reply<textarea value={person.reply} maxLength={12000} onChange={e=>update({reply:e.target.value,...(e.target.value.trim()?{status:'replied' as const}:{})})} placeholder="Paste their actual reply here. WYJ uses it to write your next message."/></label>
    <div className={styles.actions}><button disabled={!canDraft||person.status==='closed'} onClick={draft}>{person.reply.trim()?'Draft a response →':'Draft a follow-up →'}</button><button className={styles.quiet} onClick={remove}>Remove from shortlist</button></div>
  </div>;
}
