'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {useDemo} from '@/app/providers';
import {api,ApiFailure,type CardInput} from '@/lib/client/api';
import {STRENGTHS,TECH_STACK,WORK_STYLES,type FounderPreferences} from '@/lib/contracts';
import {classifyInBrowser,stopBrowserClassifier,warmBrowserClassifier} from '@/lib/private/browser-classifier';
import {approvedBrief,identifyingDetails} from '@/lib/private/brief';
import {withLocalSuggestions,withPartnerNeeds} from '@/lib/private/profile-draft';
import LocalIdeaHelp from './LocalIdeaHelp';
import FounderProfile,{label} from '@/components/founders/FounderProfile';
import styles from './private.module.css';
const ROLES=['engineering','product','design','sales','data'];
const TOPICS=['travel','ai-agents','developer-tools','payments','healthcare','climate','education','marketplaces'];
const PARTNER=[...ROLES,'communication','customer discovery','execution','community','conflict resolution'];
const empty:FounderPreferences={techStack:[],strengths:[],partnerStrengths:[],workStyles:[]};
function Choices({title,options,value,onChange,max=5}:{title:string;options:readonly string[];value:string[];onChange:(v:string[])=>void;max?:number}){
 return <fieldset className={styles.choices}><legend>{title}</legend><div>{options.map(option=><button type="button" aria-pressed={value.includes(option)} key={option} disabled={!value.includes(option)&&value.length>=max} onClick={()=>onChange(value.includes(option)?value.filter(x=>x!==option):[...value,option])}>{value.includes(option)&&<span aria-hidden>✓ </span>}{label(option)}</button>)}</div></fieldset>;
}
export default function PrivateWorkspace(){
 const router=useRouter(),client=useQueryClient();const {setCard}=useDemo();
 const [classifierReady,setClassifierReady]=useState(false);
 const [step,setStep]=useState(0);const [background,setBackground]=useState('');
 const [brief,setBrief]=useState<CardInput>({alias:'',approvedBlurb:'',offers:[],seeks:[],interests:[],availability:'weekends',preferences:empty});
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[running,setRunning]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const run=useRef(0),request=useRef<AbortController|null>(null);
 useEffect(()=>{const preload=new AbortController();void warmBrowserClassifier(text=>setMessage(text),preload.signal).then(ok=>{if(!preload.signal.aborted){setClassifierReady(ok);setMessage(ok?'Skills assistant ready.':'Choose your skills and topics manually, or retry suggestions.');}});setBrief(b=>({...b,alias:b.alias||`Founder ${crypto.getRandomValues(new Uint32Array(1))[0]%9000+1000}`}));return()=>{preload.abort();run.current++;request.current?.abort();stopBrowserClassifier();};},[]);
 const prefs=brief.preferences!;
 function edit(patch:Partial<CardInput>){setBrief(b=>({...b,...patch}));setConsent(false);setError('');}
 function pref(key:keyof FounderPreferences,value:string[]){edit({preferences:{...prefs,[key]:value}});}
 function cancel(){run.current++;request.current?.abort();stopBrowserClassifier();setRunning(false);setMessage('Stopped. You can select your skills and topics below.');}
 async function suggest(){const id=++run.current;const controller=new AbortController();request.current=controller;setRunning(true);setMessage('Loading the model in your browser…');try{
  const result=await classifyInBrowser(background,brief.approvedBlurb,text=>{if(id===run.current)setMessage(text);},controller.signal);
  if(id!==run.current)return;
  if(result.status==='unavailable'){setMessage('Suggestions aren’t available on this device. Select your skills and topics below.');return;}
  setBrief(b=>withLocalSuggestions(b,result));setConsent(false);
  const count=result.suggested.offers.length+result.suggested.interests.length;
  setMessage(count?'Done — check your skills and topics below. Any choices you already made are kept.':'No confident suggestions found. Choose your skills and topics below. Your idea text is unchanged.');
 }catch{if(id===run.current)setMessage('Couldn’t make suggestions. Choose your skills and topics below.');}finally{if(id===run.current)setRunning(false);}}
 const contactInBrief=identifyingDetails(brief.alias+' '+brief.approvedBlurb);
 const ideaReady=!!brief.approvedBlurb.trim()&&brief.offers.length>0&&brief.interests.length>0&&!contactInBrief;
 function advance(next:number){if(running)cancel();setStep(next);setConsent(false);setError('');window.scrollTo({top:0,behavior:'smooth'});}
 async function publish(){if(!consent||!ideaReady||!brief.seeks.length||busy)return;setBusy(true);setError('');try{
  const payload=approvedBrief(brief);let saved;
  try{saved=await api.publishIdea(payload);}catch(err){if(!(err instanceof ApiFailure)||err.status!==401)throw err;await api.createSession();client.removeQueries({queryKey:['matches']});client.removeQueries({queryKey:['matches-generate']});saved=await api.publishIdea(payload);}
  setCard(saved);setBackground('');await Promise.all([client.invalidateQueries({queryKey:['ideas']}),client.invalidateQueries({queryKey:['published-ideas-for-matches']}),client.invalidateQueries({queryKey:['matches']}),client.invalidateQueries({queryKey:['matches-generate']})]);
  router.push('/matches?published='+encodeURIComponent(saved.ideaId??saved.id));
 }catch(err){setError(err instanceof ApiFailure&&err.code==='IDEA_LIMIT'?'You’ve used your five free idea slots. Open Plans to add more.':err instanceof Error?err.message:'Couldn’t publish. Try again.');}finally{setBusy(false);}}
 return <section className={styles.workspace}>
  <div className={styles.pageHeader}><div><p className="eyebrow">FIND YOUR COFOUNDER</p><h1>Who do you want to build with?</h1><p>A clear idea. The skills you bring. The partner you need.</p></div><Link href="/ideas">My ideas →</Link></div>
  <nav className={styles.steps} aria-label="Create your profile">{['Your idea','Your partner','Preview & publish'].map((title,i)=><button key={title} aria-current={step===i?'step':undefined} disabled={i>step&&(i===1?!ideaReady:!ideaReady||!brief.seeks.length)} onClick={()=>advance(i)}><span>{i<step?'✓':i+1}</span>{title}</button>)}</nav>
  <div className={`${styles.layout} ${step===2?styles.reviewLayout:''}`}><div className={styles.editor}>
   {step===0&&<article className={styles.panel}><h2>What are you building?</h2><p className={styles.hint}>Describe the product and who it helps. This is the idea people will see.</p>
    <label className={styles.field}>Your idea<textarea maxLength={240} value={brief.approvedBlurb} onChange={e=>{if(running)cancel();edit({approvedBlurb:e.target.value});}} placeholder="A booking API that lets AI travel agents check availability and reserve trips."/><span>{brief.approvedBlurb.length}/240</span></label>
    <LocalIdeaHelp idea={brief.approvedBlurb} onUse={text=>edit({approvedBlurb:text})}/>
    <details className={styles.import}><summary>Help me fill my skills & topics</summary><p>Paste your own background. It stays on your device and is never copied into your idea.</p><label className={styles.field}>Your background<textarea maxLength={5000} value={background} onChange={e=>{if(running)cancel();setBackground(e.target.value);setMessage('');}} placeholder="I build Python backends and React apps…"/></label><div className={styles.buttons}><button type="button" disabled={running||(!background.trim()&&!brief.approvedBlurb.trim())} onClick={()=>void suggest()}>{running?'Finding suggestions…':classifierReady?'Suggest skills & topics':'Load skills assistant'}</button>{running&&<button className={styles.secondary} onClick={cancel}>Cancel</button>}</div><p className={styles.hint}>Runs in your browser. First use downloads ~630 MB. You can select the fields yourself instead.</p>{message&&<p className={styles.status} role="status">{message}</p>}</details>
    <Choices title="What do you bring?" options={ROLES} value={brief.offers} onChange={offers=>edit({offers})}/>
    <Choices title="What areas are you exploring?" options={TOPICS} max={4} value={brief.interests} onChange={interests=>edit({interests})}/>
    <details className={styles.optional}><summary>Add your strengths & tech stack</summary><Choices title="Your strengths" options={STRENGTHS} value={prefs.strengths} onChange={v=>pref('strengths',v)}/><Choices title="Your tech stack" options={TECH_STACK} value={prefs.techStack} onChange={v=>pref('techStack',v)}/></details>
    {contactInBrief&&<p role="alert" className={styles.error}>Keep contact details and links out of this profile. You can share them after a mutual introduction.</p>}
    <div className={styles.bottom}><span>{!ideaReady?'Add an idea, a skill and a topic to continue.':'Next: choose your partner’s strengths.'}</span><button disabled={!ideaReady} onClick={()=>advance(1)}>Choose my partner →</button></div>
   </article>}
   {step===1&&<article className={styles.panel}><h2>What would make a good partner?</h2><p className={styles.hint}>Choose up to five skills or strengths. These go straight onto your profile and into matching.</p><Choices title="I’m looking for someone strong in…" options={PARTNER} value={brief.seeks} onChange={needs=>{setBrief(b=>withPartnerNeeds(b,needs));setConsent(false);}}/>
    <label className={styles.field}>When can you build together?<select value={brief.availability} onChange={e=>edit({availability:e.target.value as CardInput['availability']})}><option value="weekends">Evenings & weekends</option><option value="full_time">Full-time</option><option value="exploring">Still exploring</option></select></label>
    <Choices title="How do you like to work? (optional)" options={WORK_STYLES} max={4} value={prefs.workStyles} onChange={v=>pref('workStyles',v)}/>
    <div className={styles.bottom}><button className={styles.secondary} onClick={()=>advance(0)}>← Your idea</button><button disabled={!brief.seeks.length} onClick={()=>advance(2)}>Preview my profile →</button></div>
   </article>}
   {step===2&&<article className={styles.panel}><h2>Meet your next cofounder.</h2><p className={styles.hint}>This profile is exactly what other founders see. Your name and contact stay hidden until you both want an introduction.</p><label className={styles.field}>Your public profile name<input maxLength={40} value={brief.alias} onChange={e=>edit({alias:e.target.value})}/></label>
    <div className={styles.nextSteps}><div><b>1</b><span>Publish your profile</span></div><div><b>2</b><span>Explore compatible founders</span></div><div><b>3</b><span>Both say yes to connect</span></div></div>
    <label className={styles.approve}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I’m happy to share this profile for founder matching.</span></label>
    <div className={styles.bottom}><button className={styles.secondary} onClick={()=>advance(1)}>← Edit partner preferences</button><button disabled={!consent||!brief.alias.trim()||!ideaReady||busy} onClick={()=>void publish()}>{busy?'Publishing…':'Publish & find founders →'}</button></div>
    {error&&<p className={styles.error} role="alert">{error} <Link href="/plans">Plans</Link></p>}
   </article>}
  </div><aside className={styles.preview}><div className={styles.previewTitle}><span>What other founders see</span><span>● Live preview</span></div><FounderProfile profile={brief} preview/><p className={styles.privacy}>Name and contact hidden until mutual approval.</p></aside></div>
 </section>;
}
