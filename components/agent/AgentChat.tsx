"use client";
import {useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useDemo} from '@/app/providers';
import type {AgentEvent} from '@/lib/agent/schema';
import {CHAT_KEY,restoreConversation,openWorkingDraft} from '@/lib/agent/workspace';
import BrowserDock from './BrowserDock';
import BrowserActionCard from './BrowserActionCard';
import type {BrowserAction} from '@/lib/browser/contracts';
import Markdown from '@/components/shared/Markdown';
import styles from './agent.module.css';

type Message={role:'user'|'assistant';content:string};
type Provider={id:string;name:string;supported:boolean;configured:boolean;credentialNames:string[];models:{id:string;name:string;context?:number;inputCost?:number;outputCost?:number}[]};
type Catalog={providers:Provider[];source:string;snapshotDate:string;defaultProvider:string;defaultModel:string};
const starters=[
  'I’m considering leaving my job. Help me figure out what I could build first.',
  'I have an idea for an Airbnb for hostels. Help me find a sharp starting point.',
  'I’m a backend engineer interested in climate. Who would complement me?',
];
const nextMoves=[
  {label:'Sharpen the idea',prompt:'Help me sharpen this idea. Suggest one specific customer and one painful situation to start with, based on our conversation.'},
  {label:'Who do I need?',prompt:'Based on our conversation, what is the most important complementary teammate role, what would they own, and what should we try building together? Don’t search example profiles.'},
  {label:'Plan the first experiment',prompt:'Based on our conversation, propose one experiment I can run before making a bigger commitment. Include who to reach, what to test, and a measurable signal to continue.'},
];

export default function AgentChat(){
  const router=useRouter();
  const {card}=useDemo();
  const [messages,setMessages]=useState<Message[]>([]);
  const [input,setInput]=useState('');
  const [providerId,setProviderId]=useState('');
  const [modelId,setModelId]=useState('');
  const [useCard,setUseCard]=useState(false);
  const [accessCode,setAccessCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [events,setEvents]=useState<string[]>([]);
  const [sources,setSources]=useState<{title:string;url:string}[]>([]);
  const [memo,setMemo]=useState('');
  const [actions,setActions]=useState<BrowserAction[]>([]);
  const [error,setError]=useState('');
  const [storageError,setStorageError]=useState('');
  const abortRef=useRef<AbortController|null>(null);
  const endRef=useRef<HTMLDivElement|null>(null);
  const catalog=useQuery<Catalog>({queryKey:['agent-models'],queryFn:async()=>{
    const response=await fetch('/api/agent/models');
    if(!response.ok)throw new Error('Could not load model catalog.');
    return response.json();
  },staleTime:60000});
  const providers=catalog.data?.providers??[];
  const selectedProvider=providers.find(p=>p.id===(providerId||catalog.data?.defaultProvider))??providers.find(p=>p.configured)??providers[0];
  const selectedModel=selectedProvider?.models.find(m=>m.id===(modelId||catalog.data?.defaultModel))??selectedProvider?.models[0];
  const canSend=ready&&!busy&&!!selectedProvider?.configured&&!!selectedModel;

  useEffect(()=>{
    try {const saved=restoreConversation(sessionStorage);setMessages(saved.messages);setInput(saved.input);setMemo(saved.memo);setSources(saved.sources);setActions(saved.actions);}
    catch {setStorageError('Local storage is unavailable in this tab.');}
    setReady(true);
    return ()=>abortRef.current?.abort();
  },[]);
  useEffect(()=>{
    if(!ready)return;
    try {sessionStorage.setItem(CHAT_KEY,JSON.stringify({messages:messages.slice(-100),input,memo,sources,actions:actions.slice(-30)}));setStorageError('');}
    catch {setStorageError('This tab can’t keep a local copy. Keep the page open and download your draft before leaving.');}
  },[ready,messages,input,memo,sources,actions]);
  useEffect(()=>{if(messages.length)endRef.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[messages,busy]);

  function consume(event:AgentEvent){
    if(event.type==='progress')setEvents(old=>[...old,event.message]);
    if(event.type==='sources')setSources(event.sources);
    if(event.type==='memo')setMemo(event.markdown);
    if(event.type==='action')setActions(old=>[...old,event.action]);
    if(event.type==='answer')setMessages(old=>[...old,{role:'assistant',content:event.text}]);
    if(event.type==='error')setError(event.message);
  }
  async function send(text=input,action:'chat'|'draft_memo'|'outreach'|'social_post'='chat'){
    if(!text.trim()||!canSend||!selectedProvider||!selectedModel)return;
    const next=[...messages,{role:'user' as const,content:text.trim()}];
    setMessages(next);setInput('');setBusy(true);setEvents([]);setError('');
    const controller=new AbortController();abortRef.current=controller;
    try {
      const response=await fetch('/api/agent',{
        method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json',...(accessCode?{'x-agent-access-code':accessCode}:{})},
        body:JSON.stringify({provider:selectedProvider.id,model:selectedModel.id,action,messages:next.slice(-20),
          ...(useCard&&card?{card:{alias:card.alias,offers:card.offers,seeks:card.seeks,interests:card.interests,availability:card.availability,approvedBlurb:card.approvedBlurb}}:{})}),
      });
      if(!response.ok){const data=await response.json();throw new Error(data.error??'Could not start the conversation.');}
      if(!response.body)throw new Error('No response stream.');
      const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let finished=false;let failed=false;
      function readLine(line:string){if(!line.trim())return;const event=JSON.parse(line) as AgentEvent;consume(event);if(event.type==='done')finished=true;if(event.type==='error')failed=true;}
      while(true){
        const {value,done}=await reader.read();
        if(done){buffer+=decoder.decode();break;}
        buffer+=decoder.decode(value,{stream:true});
        let index;while((index=buffer.indexOf('\n'))!==-1){readLine(buffer.slice(0,index));buffer=buffer.slice(index+1);}
      }
      readLine(buffer);
      if(!finished&&!failed)setError('The reply ended early. Any completed draft is still available; try again to continue.');
    }catch(e){setError(controller.signal.aborted?'Stopped.':e instanceof Error?e.message:'Request failed.');}
    finally{setBusy(false);abortRef.current=null;}
  }
  function openMemo(){
    try {openWorkingDraft(sessionStorage,memo);router.push('/pitch?from=agent');}
    catch {setError('Could not open the editor because this browser could not store the draft. Copy the preview below before leaving.');}
  }
  function clearConversation(){setMessages([]);setInput('');setMemo('');setSources([]);setActions([]);setEvents([]);setError('');}

  return <section>
    <p className="eyebrow">YOUR NEXT CHAPTER</p>
    <h1>What would make<br/><em>you jump?</em></h1>
    <p className="lead">A rough idea is enough. Let’s find a starting point, the person you need beside you, and a way to test it.</p>
    <div className={styles.layout}>
      <div>
        <div className={styles.chat} aria-live="polite" aria-busy={busy}>
          {!messages.length&&<div className={styles.empty}>
            <h2>What’s on your mind?</h2>
            <p>Tell me what you can build, what’s pulling you toward it, or what’s holding you back.</p>
            {starters.map(text=><button key={text} disabled={!ready||busy} onClick={()=>setInput(text)}>{text}</button>)}
          </div>}
          {messages.map((message,index)=><div key={index} className={message.role==='user'?styles.user:styles.assistant}>
            <small>{message.role==='user'?'YOU':'WYJ'}</small>
            {message.role==='assistant'?<Markdown>{message.content}</Markdown>:<p>{message.content}</p>}
          </div>)}
          {busy&&<p role="status">{events.at(-1)??'Thinking it through…'}</p>}
          <div ref={endRef}/>
        </div>
        {error&&<p role="alert" className={styles.error}>{error}</p>}
        {storageError&&<p role="status" className={styles.error}>{storageError}</p>}
        {actions.length>0&&<div className={styles.actionList}><h2>Your next moves, ready to run.</h2>{actions.map(action=><BrowserActionCard key={action.id} action={action} onEdit={next=>setActions(old=>old.map(current=>current.id===action.id?next:current))}/>)}</div>}
        <form className={styles.composer} onSubmit={event=>{event.preventDefault();void send();}}>
          <label htmlFor="agent-message">Your message</label>
          <textarea id="agent-message" value={input} onChange={event=>setInput(event.target.value)} maxLength={8000} placeholder="I’ve been thinking about…"/>
          <div className={styles.actions}>
            <button disabled={!canSend||!input.trim()}>Send →</button>
            {busy&&<button type="button" onClick={()=>abortRef.current?.abort()}>Stop</button>}
            {!!messages.length&&<button type="button" className={styles.quiet} disabled={busy} onClick={clearConversation}>Clear conversation</button>}
          </div>
          <p className="muted">Your conversation is kept locally and sent to your selected model when you ask WYJ. Your private intake notes are kept separate.</p>
        </form>
      </div>
      <aside>
        <BrowserDock/>
        <article>
          <p className="eyebrow">MAKE YOUR NEXT MOVE</p>
          <h2>From “what if”<br/>to something concrete.</h2>
          <p className="muted">Talk through an idea, then choose what would help you move it forward.</p>
          <div className={styles.moves}>
            <button className={styles.quiet} disabled={!canSend||!messages.some(m=>m.role==='assistant')} onClick={()=>void send('Draft a LinkedIn post about the idea we have discussed. Invite relevant people to give feedback or try it. Keep my private career details out.','social_post')}>Draft a LinkedIn post ↗</button>
            <button className={styles.quiet} disabled={!canSend||!messages.some(m=>m.role==='assistant')} onClick={()=>void send('Use my connected LinkedIn browser to find a few relevant people for this idea. Read promising profiles, then prepare one short personalized outreach draft.','outreach')}>Find people & prepare outreach ↗</button>
            {nextMoves.map(move=><button key={move.label} className={styles.quiet} disabled={!canSend||!messages.some(m=>m.role==='assistant')} onClick={()=>void send(move.prompt)}>{move.label} ↗</button>)}
            <button disabled={!canSend||!messages.some(m=>m.role==='assistant')} onClick={()=>void send('Turn the idea we have discussed into a solution memo for super{set}. Include the missing teammate, one measurable first experiment, and what I should learn before committing full time.','draft_memo')}>{memo?'Update my solution memo':'Build my solution memo'} →</button>
          </div>
          <Link className="secondary" href="/onboarding">{card?'Edit my matching card':'Build my matching card'} →</Link>
          {card&&<label className="check"><input type="checkbox" checked={useCard} onChange={event=>setUseCard(event.target.checked)}/>Include my matching card: {card.alias}, {card.offers.join(', ')}.</label>}
        </article>
        {memo&&<article>
          <p className="eyebrow">YOUR WORKING DRAFT</p><h3>Something to build on.</h3>
          <p>The idea, the missing teammate, and a first experiment. Open it to edit, preview, or take a copy.</p>
          <button onClick={openMemo} disabled={busy}>Open pitch editor →</button>
          <details className={styles.details}><summary>Read the draft here</summary><Markdown>{memo}</Markdown></details>
        </article>}
        {sources.length>0&&<article><h3>Sources</h3>{sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></p>)}</article>}
        {events.length>0&&<details className={styles.settings}><summary>Work completed</summary><ol>{events.map((event,index)=><li key={index}>{event}</li>)}</ol></details>}
        <details className={styles.settings}>
          <summary>Model & connection</summary>
          {catalog.isError&&<p>Catalog unavailable. <button onClick={()=>void catalog.refetch()}>Retry</button></p>}
          <label>Provider<select disabled={busy} value={selectedProvider?.id??''} onChange={event=>{setProviderId(event.target.value);setModelId('');}}>{providers.map(provider=><option key={provider.id} value={provider.id}>{provider.name}{!provider.supported?' · adapter needed':!provider.configured?' · add key':''}</option>)}</select></label>
          <label>Model<select disabled={busy} value={selectedModel?.id??''} onChange={event=>setModelId(event.target.value)}>{selectedProvider?.models.map(model=><option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
          {selectedModel&&<p className="muted">{selectedModel.context?.toLocaleString()} context · ${selectedModel.inputCost??'?'} / ${selectedModel.outputCost??'?'} per million input / output tokens</p>}
          <p className="muted">Catalog: <a href="https://models.dev" target="_blank" rel="noreferrer">models.dev</a> · {catalog.data?.snapshotDate}. Availability and billing may differ.</p>
          <label>Room access code<input type="password" value={accessCode} onChange={event=>setAccessCode(event.target.value)} autoComplete="off"/></label>
        </details>
        {selectedProvider&&!selectedProvider.configured&&<p className={styles.error}>{selectedProvider.supported?`Add ${selectedProvider.credentialNames.join(' or ')} to .env.local and restart.`:'This provider needs its native adapter.'}</p>}
      </aside>
    </div>
  </section>;
}
