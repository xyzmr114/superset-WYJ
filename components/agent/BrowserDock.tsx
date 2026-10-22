"use client";
import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import type {BrowserStatus} from '@/lib/browser/contracts';
import styles from './agent.module.css';

export async function browserCommand(command:unknown){
  const response=await fetch('/api/browser/linkedin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
  const data=await response.json();if(!response.ok)throw new Error(data.error??'Browser action failed.');return data;
}
export function useBrowserConnection(){
  return useQuery<BrowserStatus>({queryKey:['linkedin-browser'],queryFn:async()=>{
    const response=await fetch('/api/browser/linkedin');if(!response.ok)throw new Error('Browser connection unavailable.');return response.json();
  },refetchInterval:4000,retry:false});
}
export default function BrowserDock(){
  const connection=useBrowserConnection();const client=useQueryClient();
  const [pending,setPending]=useState(false);const [error,setError]=useState('');const [preview,setPreview]=useState(false);
  async function command(name:'connect'|'disconnect'){
    setPending(true);setError('');
    try {await browserCommand({command:name});await client.invalidateQueries({queryKey:['linkedin-browser']});}
    catch(error){setError(error instanceof Error?error.message:'Connection failed.');}finally{setPending(false);}
  }
  return <article>
    <p className="eyebrow">YOUR CONNECTED BROWSER</p><h3>Put the idea out there.</h3>
    <p className="muted">{connection.data?.message??'Checking the local browser companion…'}</p>
    {connection.data?.available&&<div className={styles.actions}>
      <button disabled={pending} onClick={()=>void command('connect')}>{pending?'Opening…':connection.data.connected?'Show LinkedIn browser':'Connect LinkedIn'}</button>
      {connection.data.connected&&<button className={styles.quiet} disabled={pending} onClick={()=>void command('disconnect')}>Disconnect</button>}
    </div>}
    <p className="muted">Sign in directly in the browser window. WYJ can research profiles and prepare outreach using that session.</p>
    {(error||connection.error)&&<p role="alert" className={styles.error}>{error||connection.error?.message}</p>}
    {connection.data?.signedIn&&<details className={styles.details} onToggle={event=>setPreview(event.currentTarget.open)}><summary>View connected browser</summary>{preview&&<img className={styles.browserPreview} src={'/api/browser/linkedin/screenshot?at='+connection.dataUpdatedAt} alt="Current LinkedIn page in your connected browser"/>}</details>}
  </article>;
}
