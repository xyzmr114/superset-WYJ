"use client";
import {useState} from 'react';
import type {BrowserAction,BrowserReceipt} from '@/lib/browser/contracts';
import {browserCommand,useBrowserConnection} from './BrowserDock';
import styles from './agent.module.css';

export default function BrowserActionCard({action,onEdit}:{action:BrowserAction;onEdit:(action:BrowserAction)=>void}){
  const connection=useBrowserConnection();const [receipt,setReceipt]=useState<BrowserReceipt|null>(null);
  const [pending,setPending]=useState(false);const [error,setError]=useState('');const [copied,setCopied]=useState(false);
  const completed=receipt?.status==='submitted'||receipt?.status==='unknown';
  async function run(command:'prepare'|'submit'){
    setPending(true);setError('');
    try {setReceipt(await browserCommand({command,action}));}
    catch(error){setError(error instanceof Error?error.message:'Browser action failed.');}finally{setPending(false);}
  }
  async function copy(){try{await navigator.clipboard.writeText(action.body);setCopied(true);}catch{setError('Clipboard unavailable. Select and copy the draft text.');}}
  return <article className={styles.actionCard}>
    <p className="eyebrow">{action.kind==='linkedin_post'?'LINKEDIN POST':'LINKEDIN OUTREACH'}</p>
    <h3>{action.title}</h3>
    {action.kind==='linkedin_message'&&<p><a href={action.profileUrl} target="_blank" rel="noreferrer">View recipient profile ↗</a></p>}
    <label htmlFor={'action-'+action.id}>Your draft<textarea id={'action-'+action.id} value={action.body} maxLength={3000} disabled={pending||!!completed} onChange={event=>{onEdit({...action,body:event.target.value});setReceipt(null);setCopied(false);}}/></label>
    <div className={styles.actions}>
      <button className={styles.quiet} onClick={()=>void copy()}>{copied?'Copied':'Copy text'}</button>
      {!completed&&<button disabled={pending||!connection.data?.connected||!action.body.trim()} onClick={()=>void run('prepare')}>{pending?'Working…':'Prepare in browser'}</button>}
      {receipt?.status==='prepared'&&<button disabled={pending} onClick={()=>void run('submit')}>{action.kind==='linkedin_post'?'Publish this post':'Send this message'}</button>}
    </div>
    {receipt&&<p role="status" className="muted">{receipt.message}</p>}
    {!connection.data?.connected&&<p className="muted">Connect LinkedIn to prepare this draft in your browser.</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
  </article>;
}
