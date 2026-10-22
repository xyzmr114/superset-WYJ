"use client";
import {useState} from 'react';
import type {BrowserAction,BrowserReceipt} from '@/lib/browser/contracts';
import {browserCommand,useBrowserConnection} from './BrowserDock';
import styles from './agent.module.css';

export default function BrowserActionCard({action,onEdit,onConnection,onReceipt}:{action:BrowserAction;onEdit:(action:BrowserAction)=>void;onConnection:(url:string)=>void;onReceipt?:(action:BrowserAction,receipt:BrowserReceipt)=>void}){
  const connection=useBrowserConnection();const [receipt,setReceipt]=useState<BrowserReceipt|null>(null);
  const [pending,setPending]=useState(false);const [error,setError]=useState('');const [copied,setCopied]=useState(false);
  const completed=receipt?.status==='submitted'||receipt?.status==='unknown';
  async function run(command:'prepare'|'submit'){
    setPending(true);setError('');
    try {const result=await browserCommand({command,action});setReceipt(result);onReceipt?.(action,result);}
    catch(error){setError(error instanceof Error?error.message:'Browser action failed.');}finally{setPending(false);}
  }
  async function copy(){try{await navigator.clipboard.writeText(action.body);setCopied(true);}catch{setError('Clipboard unavailable. Select and copy the draft text.');}}
  return <article className={styles.actionCard}>
    <p className="eyebrow">{action.kind==='linkedin_post'?'LINKEDIN POST':action.kind==='linkedin_connection'?'LINKEDIN CONNECTION NOTE':'LINKEDIN OUTREACH'}</p>
    <h3>{action.title}</h3>
    {action.kind!=='linkedin_post'&&<p><a href={action.profileUrl} target="_blank" rel="noreferrer">View recipient profile ↗</a></p>}
    <label htmlFor={'action-'+action.id}>Your draft<textarea id={'action-'+action.id} value={action.body} maxLength={action.kind==='linkedin_connection'?200:3000} disabled={pending||!!completed} onChange={event=>{onEdit({...action,body:event.target.value});setReceipt(null);setCopied(false);}}/></label>
    <div className={styles.actions}>
      <button className={styles.quiet} onClick={()=>void copy()}>{copied?'Copied':'Copy text'}</button>
      {!completed&&<button disabled={pending||!connection.data?.connected||!action.body.trim()} onClick={()=>void run('prepare')}>{pending?'Working…':'Prepare in browser'}</button>}
      {receipt?.status==='prepared'&&<button disabled={pending} onClick={()=>void run('submit')}>{action.kind==='linkedin_post'?'Publish this post':action.kind==='linkedin_connection'?'Send invitation':'Send this message'}</button>}
    </div>
    {action.kind==='linkedin_connection'&&<p className="muted">{action.body.length}/200 characters</p>}
    {action.kind==='linkedin_message'&&error.includes('Premium')&&<button className={styles.quiet} onClick={()=>onConnection(action.profileUrl)}>Draft a connection note instead →</button>}
    {receipt&&<p role="status" className="muted">{receipt.message}</p>}
    {!connection.data?.connected&&<p className="muted">Connect LinkedIn to prepare this draft in your browser.</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
  </article>;
}
