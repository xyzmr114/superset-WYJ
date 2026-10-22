"use client";
import {useEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {browserCommand,useBrowserConnection} from './BrowserDock';
import {PROSPECTS_KEY,restoreProspects,pendingAutoReply,nextReplyCheck,replyCheckChanges,followupPrompt,type Prospect} from '@/lib/agent/prospects';
export type Followup=(prompt:string,label:string,url:string,automatic?:boolean)=>Promise<boolean>;
const SETTING='wyj-auto-replies-v1';
export function useReplyMonitor(prospects:Prospect[],setProspects:Dispatch<SetStateAction<Prospect[]>>,ready:boolean,canCheck:boolean,canAutoDraft:boolean,onFollowup:Followup){
  const connection=useBrowserConnection();
  const [enabled,setEnabled]=useState(false);const [status,setStatus]=useState('Automatic reply checks are off.');
  const running=useRef(false);
  const current=useRef({prospects,enabled,ready,canCheck,canAutoDraft,onFollowup,signedIn:connection.data?.signedIn,mounted:true});
  current.current={prospects,enabled,ready,canCheck,canAutoDraft,onFollowup,signedIn:connection.data?.signedIn,mounted:true};
  useEffect(()=>{try{setEnabled(localStorage.getItem(SETTING)==='true');}catch{}},[]);
  function toggle(value:boolean){setEnabled(value);try{localStorage.setItem(SETTING,String(value));}catch{}setStatus(value?'Starting automatic reply checks…':'Automatic reply checks are off.');}
  useEffect(()=>{
    function changed(event:StorageEvent){if(event.key===PROSPECTS_KEY)setProspects(restoreProspects(localStorage));if(event.key===SETTING)setEnabled(event.newValue==='true');}
    window.addEventListener('storage',changed);return ()=>window.removeEventListener('storage',changed);
  },[setProspects]);
  useEffect(()=>{
    current.current.mounted=true;
    async function draftPending(){
      const snapshot=current.current;if(!snapshot.enabled||!snapshot.mounted||!snapshot.canAutoDraft)return false;
      const person=snapshot.prospects.find(p=>pendingAutoReply(p));if(!person)return false;
      setStatus('Drafting a response to '+person.name+'…');
      const ok=await snapshot.onFollowup(followupPrompt(person),'Prepare a response to '+person.name+'’s new LinkedIn reply.',person.url,true);
      if(!current.current.mounted)return true;
      setProspects(old=>old.map(p=>p.url===person.url?{...p,...(ok?{draftedReplyId:person.pendingReplyId,draftRetryAt:0,syncError:''}:{syncError:'The response draft did not finish. Retrying in five minutes.',draftRetryAt:Date.now()+300000})}:p));
      setStatus(ok?'Response draft ready for '+person.name+'.':'Could not finish the response draft for '+person.name+'.');
      return true;
    }
    async function work(){
      const snapshot=current.current;
      if(!snapshot.mounted||!snapshot.enabled||!snapshot.ready)return;
      if(!snapshot.signedIn){setStatus('Waiting for your LinkedIn connection.');return;}
      if(!snapshot.canCheck)return;
      if(await draftPending())return;
      const person=nextReplyCheck(snapshot.prospects,Date.now());
      if(!person){setStatus('Watching for new replies. Closed and shortlisted prospects are skipped.');return;}
      setStatus('Checking '+person.name+'…');
      try{
        const result=await browserCommand({command:'read_conversation',profileUrl:person.url});
        if(!current.current.mounted)return;
        const incoming=result.latestIncoming as {id:string;body:string}|null;
        const changes=replyCheckChanges(result,Date.now());
        setProspects(old=>old.map(p=>p.url===person.url&&p.status!=='closed'?{...p,...changes}:p));
        // Keep this snapshot current until React commits the update, before selecting a queued draft.
        current.current.prospects=current.current.prospects.map(p=>p.url===person.url&&p.status!=='closed'?{...p,...changes}:p);
        if(!await draftPending())setStatus(incoming?'No new reply from '+person.name+'.':result.note??'Conversation checked.');
      }catch(e){
        if(!current.current.mounted)return;
        const message=e instanceof Error?e.message:'LinkedIn check failed.';
        setProspects(old=>old.map(p=>p.url===person.url?{...p,checkedAt:Date.now(),nextCheckAt:Date.now()+300000,syncError:message}:p));
        setStatus('Could not check '+person.name+'. Retrying in five minutes.');
      }
    }
    async function tick(){
      if(running.current||!current.current.enabled)return;running.current=true;
      try{
        if(navigator.locks)await navigator.locks.request('wyj-linkedin-reply-monitor',{ifAvailable:true},async lock=>{if(lock)await work();});
        else {setStatus('Automatic checks need a browser with Web Locks support. Manual checks are available.');}
      }finally{running.current=false;}
    }
    const initial=setTimeout(()=>void tick(),1500);const interval=setInterval(()=>void tick(),60000);
    return ()=>{current.current.mounted=false;clearTimeout(initial);clearInterval(interval);};
  },[enabled,setProspects]);
  return {enabled,toggle,status};
}
