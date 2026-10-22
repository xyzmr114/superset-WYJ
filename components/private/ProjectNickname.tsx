'use client';
import {useEffect,useRef,useState} from 'react';
import {nameProjectLocally} from '@/lib/private/local-idea-agent';
import styles from './private.module.css';
export default function ProjectNickname({idea,alias,auto,onName}:{idea:string;alias:string;auto:boolean;onName:(name:string,source:string,previousAlias:string)=>void}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const sequence=useRef(0),tried=useRef(false),current=useRef({idea,alias,onName});current.current={idea,alias,onName};
 async function generate(){const source=current.current.idea,previousAlias=current.current.alias;const id=++sequence.current;setBusy(true);setError('');setStatus('Finding your project’s alter ego…');try{const result=await nameProjectLocally(source,message=>{if(id===sequence.current)setStatus(message);});if(id!==sequence.current||current.current.idea!==source)return;if(current.current.alias!==previousAlias){setStatus('Kept the name you just edited.');return;}current.current.onName(result.text,source,previousAlias);setStatus('Named on your device. Yours to edit.');}catch(e){if(id===sequence.current)setError(e instanceof Error?e.message:'Could not make a name. Yours is still editable.');}finally{if(id===sequence.current)setBusy(false);}}
 useEffect(()=>{const timer=setTimeout(()=>{if(auto&&!tried.current){tried.current=true;void generate();}},0);return()=>{clearTimeout(timer);sequence.current++;};},[]);
 return <div className={styles.nickname}><div><strong>Your project’s alter ego</strong><p>Let the local model get a little weird with it.</p></div><button type="button" disabled={busy||!idea.trim()} onClick={()=>void generate()}>{busy?'Naming…':'Give me a fun name ↻'}</button>{status&&<span role="status">{status}</span>}{error&&<span role="alert">{error}</span>}</div>;
}
