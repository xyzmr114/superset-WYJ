'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {useDemo} from '@/app/providers';
import {api,ApiFailure,type CardInput} from '@/lib/client/api';
import {STRENGTHS,TECH_STACK,WORK_STYLES,type FounderPreferences} from '@/lib/contracts';
import {classifyInBrowser,stopBrowserClassifier,warmBrowserClassifier} from '@/lib/private/browser-classifier';
import {approvedBrief,identifyingDetails} from '@/lib/private/brief';
import {withLocalSuggestions,withPartnerNeeds} from '@/lib/private/profile-draft';
import {DRAFT_KEY,encodeDraft,decodeDraft} from '@/lib/private/local-draft';
import ProjectNickname from './ProjectNickname';
import {stopLocalIdeaAgent} from '@/lib/private/local-idea-agent';
import LocalIdeaHelp from './LocalIdeaHelp';
import FounderProfile,{label} from '@/components/founders/FounderProfile';
import styles from './private.module.css';
const ROLES=['engineering','product','design','sales','data'];
const TOPICS=['travel','ai-agents','developer-tools','payments','healthcare','climate','education','marketplaces'];
const PARTNER=[...ROLES,'communication','customer discovery','execution','community','conflict resolution'];
const empty:FounderPreferences={techStack:[],strengths:[],partnerStrengths:[],workStyles:[]};
function Choices({title,options,value,onChange,max=5,id,hint,invalid=false}:{title:string;options:readonly string[];value:string[];onChange:(v:string[])=>void;max?:number;id?:string;hint?:string;invalid?:boolean}){
 const [custom,setCustom]=useState(''),[customError,setCustomError]=useState('');
 const all=[...options,...value.filter(v=>!options.includes(v))];
 function add(){const text=custom.trim();if(!text)return;if(value.some(v=>v.toLowerCase()===text.toLowerCase())){setCustom('');return;}if(value.length>=max){setCustomError(`Choose up to ${max}. Remove a selection to add another.`);return;}if(identifyingDetails(text)){setCustomError('Use a skill or niche, without contact details or links.');return;}onChange([...value,text]);setCustom('');setCustomError('');}
 return <fieldset id={id} tabIndex={-1} aria-invalid={invalid||undefined} className={`${styles.choices} ${invalid?styles.invalid:''}`}><legend>{title}</legend>{hint&&<p className={styles.hint}>{hint}</p>}<div>{all.map(option=><button type="button" aria-pressed={value.includes(option)} key={option} disabled={!value.includes(option)&&value.length>=max} onClick={()=>onChange(value.includes(option)?value.filter(x=>x!==option):[...value,option])}>{value.includes(option)&&<span aria-hidden>✓ </span>}{label(option)}</button>)}</div><div className={styles.customChoice}><input aria-label={`Add custom: ${title}`} maxLength={40} placeholder="Something else? Type your own…" value={custom} onChange={e=>{setCustom(e.target.value);setCustomError('');}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}}/><button type="button" onClick={add}>Add</button></div><p className={styles.selectionCount}>{value.length}/{max} selected · press Enter or Add to include your own</p>{(customError||invalid)&&<p className={styles.fieldError} role="alert">{customError||'Choose an option or add your own to continue.'}</p>}</fieldset>;
}
export default function PrivateWorkspace(){
 const router=useRouter(),searchParams=useSearchParams(),client=useQueryClient();const {setCard}=useDemo();
 const [draftReady,setDraftReady]=useState(false),[draftStatus,setDraftStatus]=useState(''),[publishedId,setPublishedId]=useState<string|undefined>();
 const [classifierReady,setClassifierReady]=useState(false);
 const [attempted,setAttempted]=useState(false),[aliasEdited,setAliasEdited]=useState(false);
 const root=useRef<HTMLElement|null>(null);
 const [step,setStep]=useState(0);const [background,setBackground]=useState('');
 const [brief,setBrief]=useState<CardInput>({alias:'',approvedBlurb:'',offers:[],seeks:[],interests:[],availability:'weekends',preferences:empty});
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[running,setRunning]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const run=useRef(0),request=useRef<AbortController|null>(null);
 useEffect(()=>{const preload=new AbortController();void warmBrowserClassifier(text=>setMessage(text),preload.signal).then(ok=>{if(!preload.signal.aborted){setClassifierReady(ok);setMessage(ok?'Skills assistant ready.':'Choose your skills and topics manually, or retry suggestions.');}});try{const saved=decodeDraft(localStorage.getItem(DRAFT_KEY));if(saved){setBrief(saved.brief);setStep(saved.step);setPublishedId(saved.publishedId);setAliasEdited(true);setDraftStatus(saved.publishedId?'Your published profile is saved.':'Your draft is restored.');}else setBrief(b=>({...b,alias:b.alias||`Founder ${crypto.getRandomValues(new Uint32Array(1))[0]%9000+1000}`}));}catch{setDraftStatus('Draft saving is unavailable in this browser.');}setDraftReady(true);return()=>{preload.abort();run.current++;request.current?.abort();stopBrowserClassifier();stopLocalIdeaAgent();};},[]);
 useEffect(()=>{if(!draftReady)return;try{localStorage.setItem(DRAFT_KEY,encodeDraft(brief,step,publishedId));}catch{setDraftStatus('Draft saving is unavailable in this browser.');}},[brief,step,publishedId,draftReady]);
 function startFresh(){run.current++;request.current?.abort();if(running){stopBrowserClassifier();setClassifierReady(false);}setRunning(false);setMessage('');setBrief({alias:`Founder ${crypto.getRandomValues(new Uint32Array(1))[0]%9000+1000}`,approvedBlurb:'',offers:[],seeks:[],interests:[],availability:'weekends',preferences:empty});setBackground('');setConsent(false);setPublishedId(undefined);setStep(0);setAliasEdited(false);setAttempted(false);setError('');setDraftStatus('New draft started.');}
 const newIdea=searchParams.get('new')==='1';
 useEffect(()=>{if(!draftReady||!newIdea)return;startFresh();const url=new URL(window.location.href);url.searchParams.delete('new');router.replace(url.pathname+url.search+url.hash,{scroll:false});},[newIdea,draftReady,router]);
 const prefs=brief.preferences!;
 function edit(patch:Partial<CardInput>){setPublishedId(undefined);setBrief(b=>({...b,...patch}));setConsent(false);setError('');}
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
 function missing(next:number):{id:string;message:string}|null{
  if(!brief.approvedBlurb.trim())return {id:'idea-field',message:'Describe your idea to continue.'};
  if(identifyingDetails(brief.approvedBlurb))return {id:'idea-field',message:'Remove contact details or links from the idea.'};
  if(!brief.offers.length)return {id:'offers-field',message:'Choose a skill you bring, or add your own.'};
  if(!brief.interests.length)return {id:'niche-field',message:'Choose your project’s niche, or add your own.'};
  if(next>1&&!brief.seeks.length)return {id:'partner-field',message:'Choose what you need in a partner, or add your own.'};
  if(next>2&&(!brief.alias.trim()||identifyingDetails(brief.alias)))return {id:'alias-field',message:'Add a public profile name without contact details.'};
  if(next>2&&!consent)return {id:'consent-field',message:'Approve the profile before sharing it.'};
  return null;
 }
 function showMissing(next:number){const issue=missing(next);if(!issue)return false;setAttempted(true);setError(issue.message);const targetStep=['idea-field','offers-field','niche-field'].includes(issue.id)?0:issue.id==='partner-field'?1:2;setStep(targetStep);requestAnimationFrame(()=>{const field=root.current?.querySelector<HTMLElement>('#'+issue.id);field?.scrollIntoView({behavior:'smooth',block:'center'});const focus=field?.matches('input,textarea')?field:field?.querySelector<HTMLElement>('input,textarea,button')??field;focus?.focus({preventScroll:true});});return true;}
 function advance(next:number){if(next>step&&showMissing(next))return;setAttempted(false);if(running)cancel();setStep(next);setConsent(false);setError('');window.scrollTo({top:0,behavior:'smooth'});}
 async function publish(){if(busy||showMissing(3))return;setBusy(true);setError('');try{
  const payload=approvedBrief(brief);let saved;
  try{saved=await api.publishIdea(payload);}catch(err){if(!(err instanceof ApiFailure)||err.status!==401)throw err;await api.createSession();client.removeQueries({queryKey:['matches']});client.removeQueries({queryKey:['matches-generate']});saved=await api.publishIdea(payload);}
  setCard(saved);setBackground('');setPublishedId(saved.ideaId??saved.id);try{localStorage.setItem(DRAFT_KEY,encodeDraft(brief,2,saved.ideaId??saved.id));}catch{}await Promise.all([client.invalidateQueries({queryKey:['ideas']}),client.invalidateQueries({queryKey:['published-ideas-for-matches']}),client.invalidateQueries({queryKey:['matches']}),client.invalidateQueries({queryKey:['matches-generate']})]);
  router.push('/matches?published='+encodeURIComponent(saved.ideaId??saved.id));
 }catch(err){setError(err instanceof ApiFailure&&err.code==='IDEA_LIMIT'?'You’ve used your five free idea slots. Open Plans to add more.':err instanceof Error?err.message:'Couldn’t publish. Try again.');}finally{setBusy(false);}}
 return <section ref={root} className={styles.workspace}>
  <div className={styles.pageHeader}><div><p className="eyebrow">FIND YOUR COFOUNDER</p><h1>Who do you want to build with?</h1><p>A clear idea. The skills you bring. The partner you need.</p></div><Link href="/ideas">My ideas →</Link></div>
  {draftReady&&<div className={styles.draftNotice}><span>{draftStatus||'Matching fields are saved on this device. Background text is not saved.'}{publishedId&&<> <Link href="/ideas">View saved profiles →</Link></>}</span><button type="button" onClick={startFresh}>Start a new idea</button></div>}
  <nav className={styles.steps} aria-label="Create your profile">{['Your idea','Your partner','Preview & publish'].map((title,i)=><button key={title} aria-current={step===i?'step':undefined} onClick={()=>advance(i)}><span>{i<step?'✓':i+1}</span>{title}</button>)}</nav>
  <div className={`${styles.layout} ${step===2?styles.reviewLayout:''}`}><div className={styles.editor}>
   {step===0&&<article className={styles.panel}><h2>What are you building?</h2><p className={styles.hint}>Describe the product and who it helps. People see it only after you publish.</p>
    <label className={styles.field}>Your idea<textarea id="idea-field" aria-invalid={attempted&&!brief.approvedBlurb.trim()||undefined} maxLength={240} value={brief.approvedBlurb} onChange={e=>{if(running)cancel();edit({approvedBlurb:e.target.value});}} placeholder="A booking API that lets AI travel agents check availability and reserve trips."/><span>{brief.approvedBlurb.length}/240</span></label>
    <LocalIdeaHelp idea={brief.approvedBlurb} onUse={text=>edit({approvedBlurb:text})}/>
    <details className={styles.import}><summary>Help me fill my skills & topics</summary><p>Paste your own background. It stays on your device and is never copied into your idea. For custom suggestions, use short phrases such as “Skills: horse training” and “Niche: equestrian matchmaking”.</p><label className={styles.field}>Your background<textarea maxLength={5000} value={background} onChange={e=>{if(running)cancel();setBackground(e.target.value);setMessage('');}} placeholder="I build Python backends and React apps…"/></label><div className={styles.buttons}><button type="button" disabled={running||(!background.trim()&&!brief.approvedBlurb.trim())} onClick={()=>void suggest()}>{running?'Finding suggestions…':classifierReady?'Suggest skills & topics':'Load skills assistant'}</button>{running&&<button className={styles.secondary} onClick={cancel}>Cancel</button>}</div><p className={styles.hint}>Runs in your browser. First use downloads ~630 MB. You can select the fields yourself instead.</p>{message&&<p className={styles.status} role="status">{message}</p>}</details>
    <Choices id="offers-field" invalid={attempted&&!brief.offers.length} title="What do you bring?" options={ROLES} value={brief.offers} onChange={offers=>edit({offers})}/>
    <Choices id="niche-field" invalid={attempted&&!brief.interests.length} title="What’s your project’s niche?" hint="The space or audience you’re building for — for example, equestrian matchmaking, indie games or travel." options={TOPICS} max={4} value={brief.interests} onChange={interests=>edit({interests})}/>
    <details className={styles.optional}><summary>Add your strengths & tech stack</summary><Choices title="Your strengths" options={STRENGTHS} value={prefs.strengths} onChange={v=>pref('strengths',v)}/><Choices title="Your tech stack" options={TECH_STACK} value={prefs.techStack} onChange={v=>pref('techStack',v)}/></details>
    {contactInBrief&&<p role="alert" className={styles.error}>Keep contact details and links out of this profile. You can share them after a mutual introduction.</p>}
    <div className={styles.bottom}><span>{!ideaReady?'Add an idea, a skill and a topic to continue.':'Next: choose your partner’s strengths.'}</span><button onClick={()=>advance(1)}>Choose my partner →</button></div>
   </article>}
   {step===1&&<article className={styles.panel}><h2>What would make a good partner?</h2><p className={styles.hint}>Choose up to five skills or strengths. These go straight onto your profile and into matching.</p><Choices id="partner-field" invalid={attempted&&!brief.seeks.length} title="I’m looking for someone strong in…" options={PARTNER} value={brief.seeks} onChange={needs=>{setBrief(b=>withPartnerNeeds(b,needs));setConsent(false);}}/>
    <label className={styles.field}>When can you build together?<select value={brief.availability} onChange={e=>edit({availability:e.target.value as CardInput['availability']})}><option value="weekends">Evenings & weekends</option><option value="full_time">Full-time</option><option value="exploring">Still exploring</option></select></label>
    <Choices title="How do you like to work? (optional)" options={WORK_STYLES} max={4} value={prefs.workStyles} onChange={v=>pref('workStyles',v)}/>
    <div className={styles.bottom}><button className={styles.secondary} onClick={()=>advance(0)}>← Your idea</button><button onClick={()=>advance(2)}>Preview my profile →</button></div>
   </article>}
   {step===2&&<article className={styles.panel}><h2>Meet your next cofounder.</h2><p className={styles.hint}>Review the exact brief to publish: nickname, idea, skills, project niche, partner preferences, availability and any optional strengths, stack or working style. Matching and proposed counterparts can see these fields after publishing.</p><label className={styles.field}>Your public profile name<input id="alias-field" maxLength={40} value={brief.alias} onFocus={e=>{if(!aliasEdited||/^Founder \d+$/.test(brief.alias))e.currentTarget.select();}} onChange={e=>{setAliasEdited(true);edit({alias:e.target.value});}}/><span>Pick a nickname. The suggested name is selected when you click, so typing replaces it.</span></label>
    <ProjectNickname idea={brief.approvedBlurb} alias={brief.alias} auto={/^Founder \d+$/.test(brief.alias)} onName={(name,source,previousAlias)=>{setBrief(b=>b.approvedBlurb===source&&b.alias===previousAlias?{...b,alias:name}:b);setConsent(false);setPublishedId(undefined);setAliasEdited(false);}}/>
    <div className={styles.nextSteps}><div><b>1</b><span>Publish your profile</span></div><div><b>2</b><span>Explore compatible founders</span></div><div><b>3</b><span>Both say yes to connect</span></div></div>
    <label className={styles.approve}><input id="consent-field" type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Publish exactly this brief to WYJ’s matching service and proposed counterparts. My identity and contact are shared separately, only after mutual approval.</span></label>
    <div className={styles.bottom}><button className={styles.secondary} onClick={()=>advance(1)}>← Edit partner preferences</button><button disabled={busy} onClick={()=>void publish()}>{busy?'Publishing…':'Publish & find founders →'}</button></div>

   </article>}
    {error&&<p className={styles.error} role="alert">{error}{error.includes("five free")&&<> <Link href="/plans">Plans</Link></>}</p>}
  </div><aside className={styles.preview}><div className={styles.previewTitle}><span>{publishedId?'Your saved brief copy':'Draft preview · only you'}</span><span>● Updates as you type</span></div><FounderProfile profile={brief} preview/><p className={styles.privacy}>{publishedId?'View My ideas to manage the saved publication. Your chosen identity and contact require separate approval from both people.':'Only you see this draft until you publish. Your chosen identity and contact require separate approval from both people.'}</p></aside></div>
 </section>;
}
