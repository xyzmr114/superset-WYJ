"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {restoreWorkingDraft,saveWorkingDraft,type WorkingDraft as Draft} from '@/lib/agent/workspace';
import Markdown from '@/components/shared/Markdown';
import FounderReview from './FounderReview';
import styles from './pitch.module.css';

function download(markdown:string){
  const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='WYJ-solution-memo.md';
  document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function WorkingDraft(){
  const [saved,setSaved]=useState<Draft|null>(null);
  const [markdown,setMarkdown]=useState('');
  const [ready,setReady]=useState(false);
  const [preview,setPreview]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const dirty=!!saved&&saved.markdown!==markdown;
  useEffect(()=>{
    try {const draft=restoreWorkingDraft(sessionStorage);setSaved(draft);setMarkdown(draft?.markdown??'');}
    catch {setError('This browser could not open the local draft. Return to chat to copy it.');}
    setReady(true);
  },[]);
  // Save edits in the tab so navigation, refresh, and returning to chat preserve them.
  useEffect(()=>{
    if(!ready||!saved||!dirty)return;
    try {const next=saveWorkingDraft(sessionStorage,markdown);setSaved(next);setError('');}
    catch {setError('Your edits could not be kept in this tab. Download a copy before leaving.');}
  },[ready,saved,dirty,markdown]);
  async function copy(){
    try {await navigator.clipboard.writeText(markdown);setMessage('Draft copied.');}
    catch {setError('Clipboard is unavailable. Download the Markdown file instead.');}
  }
  return <section>
    <div className={styles.topline}><p className="eyebrow">YOUR NEXT CHAPTER / THE FIRST EXPERIMENT</p><Link className="secondary" href="/agent">← Back to our conversation</Link></div>
    <h1>An idea you can<br/><em>put to the test.</em></h1>
    <p className="lead">Make it yours. A clear customer, the right person beside you, and one useful experiment.</p>
    {!ready&&<p role="status">Opening your draft…</p>}
    {ready&&!saved&&<article><h2>Let’s start with your idea.</h2><p>Talk it through with WYJ, then choose “Build my solution memo.” Your draft will open here.</p><Link className="button" href="/agent">Start the conversation →</Link></article>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {message&&<p role="status" className={styles.notice}>{message}</p>}
    {saved&&<>
      <div className={styles.workspace}>
        <article className={styles.editor}>
          <div className={styles.topline}><h2>Your solution memo</h2><span className="badge">{error?'LOCAL COPY UNAVAILABLE':'SAVED IN THIS TAB'}</span></div>
          <div className={styles.tabs} role="group" aria-label="Draft view">
            <button aria-pressed={!preview} onClick={()=>setPreview(false)}>Edit</button>
            <button aria-pressed={preview} onClick={()=>setPreview(true)}>Preview</button>
          </div>
          {preview?<div className={styles.preview}><Markdown>{markdown}</Markdown></div>:<><label htmlFor="working-markdown">Draft Markdown</label><textarea id="working-markdown" className={styles.draft} value={markdown} onChange={event=>{setMarkdown(event.target.value);setMessage('');}} maxLength={100000}/></>}
        </article>
        <aside className={styles.sidebar}>
          <article><p className="eyebrow">TAKE IT WITH YOU</p><h2>Your next conversation starts here.</h2><p>Use this to talk to a potential cofounder, find your first customer, or prepare for super&#123;set&#125;.</p><div className={styles.exports}><button disabled={!markdown.trim()} onClick={()=>download(markdown)}>Download .md</button><button disabled={!markdown.trim()} onClick={()=>void copy()}>Copy draft</button></div><p className="muted">Edits stay in this browser tab. Download a copy to keep it after closing the tab.</p></article>
          <article><p className="eyebrow">WHO WOULD YOU BUILD WITH?</p><h3>Find the missing half.</h3><p>Put the skills you offer and the help you need on your matching card.</p><Link className="button" href="/onboarding">Build my matching card →</Link><p><Link className="secondary" href="/matches">See my counterparts →</Link></p></article>
          <article><h3>Keep thinking together.</h3><p>Return to WYJ to challenge the idea or plan the experiment. Your conversation will still be there.</p><Link className="secondary" href="/agent">Back to WYJ →</Link></article>
        </aside>
      </div>
      <FounderReview disabled={false} onInsert={text=>{setMarkdown(current=>current+text);setPreview(false);setMessage('Your review notes are in the draft.');}}/>
    </>}
  </section>;
}
