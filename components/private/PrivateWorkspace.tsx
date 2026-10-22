'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useDemo} from '@/app/providers';
import {api,ApiFailure,type CardInput} from '@/lib/client/api';
import {usePrivateProfile} from '@/lib/client/private-profile';
import {STRENGTHS,TECH_STACK,WORK_STYLES,type FounderPreferences} from '@/lib/contracts';
import {classifyInBrowser,stopBrowserClassifier} from '@/lib/private/browser-classifier';
import {approvedBrief,identifyingDetails,suggestedIdea} from '@/lib/private/brief';
import MultiSelect from '@/components/onboarding/MultiSelect';
import styles from './private.module.css';
const SKILLS=['engineering','sales','product','design','data','communication','customer discovery','community','execution'];
const DOMAINS=['travel','ai-agents','developer-tools','payments','healthcare','climate','education','marketplaces'];
const emptyPreferences:FounderPreferences={techStack:[],strengths:[],partnerStrengths:[],workStyles:[]};
function Choices({label,options,value,onChange,max=5}:{label:string;options:readonly string[];value:string[];onChange:(v:string[])=>void;max?:number}){
 return <fieldset className={styles.choices}><legend>{label}</legend><div>{options.map(option=><label key={option} className={value.includes(option)?styles.checked:''}><input type="checkbox" checked={value.includes(option)} disabled={!value.includes(option)&&value.length>=max} onChange={()=>onChange(value.includes(option)?value.filter(x=>x!==option):[...value,option])}/>{option}</label>)}</div></fieldset>;
}
export default function PrivateWorkspace(){
 const router=useRouter();const {setCard}=useDemo();const {profile,update,clear}=usePrivateProfile();
 const [raw,setRaw]=useState('');const [stage,setStage]=useState<'intake'|'review'>('intake');
 const [brief,setBrief]=useState<CardInput>({alias:'Quiet Builder',offers:[],seeks:[],interests:[],availability:'weekends',approvedBlurb:'',preferences:emptyPreferences});
 const [eventCode,setEventCode]=useState('SUPERSET');const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);const [running,setRunning]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');const [classified,setClassified]=useState(false);
 const runId=useRef(0);const classificationRequest=useRef<AbortController|null>(null);
 useEffect(()=>()=>{runId.current++;classificationRequest.current?.abort();stopBrowserClassifier();},[]);
 const prefs=brief.preferences!;
 function edit(patch:Partial<CardInput>){setBrief(b=>({...b,...patch}));setConsent(false);}
 function preference(key:keyof FounderPreferences,value:string[]){edit({preferences:{...prefs,[key]:value}});}
 function changePrivate(){runId.current++;classificationRequest.current?.abort();setRunning(false);setClassified(false);setConsent(false);setMessage('Private input changed. Run the local agent again if you want fresh suggestions.');}
 async function analyze(){const currentRun=++runId.current;const controller=new AbortController();classificationRequest.current=controller;setRunning(true);setError('');setMessage('Loading Laya in this browser…');try{
  const result=await classifyInBrowser(raw,profile.ambition,text=>{if(currentRun===runId.current)setMessage(text);},controller.signal);
  if(currentRun!==runId.current)return;
  if(result.status==='unavailable'){setMessage(result.message);return;}
  const {offers,seeks,interests}=result.suggested;
  setBrief(b=>({...b,offers,seeks:seeks.length?seeks:b.seeks,interests,approvedBlurb:suggestedIdea(interests,offers)}));setConsent(false);setClassified(true);setMessage('Laya ran on this device. Review every suggestion; missing or incorrect labels are yours to correct. Your idea preview uses a broad template, never a copy of your private text.');
 }catch{if(currentRun===runId.current)setMessage('Browser classification unavailable. Continue with manual fields; no private text was sent to a server or hosted model.');}finally{if(currentRun===runId.current)setRunning(false);}}
 function cancelClassification(){runId.current++;classificationRequest.current?.abort();stopBrowserClassifier();setRunning(false);setMessage('Browser classification stopped. Continue with manual fields or load Laya again.');}
 async function publish(){if(!consent||busy)return;setBusy(true);setError('');try{
  const payload=approvedBrief(brief);let card;
  try{card=await api.publishIdea(payload);}catch(err){if(!(err instanceof ApiFailure)||err.status!==401)throw err;await api.createSession(eventCode.trim());card=await api.publishIdea(payload);}
  setCard(card);setRaw('');clear();router.push('/matches');
 }catch(err){if(err instanceof ApiFailure&&err.code==='CARD_FROZEN'){setError('Your published brief already has pairings and is locked to preserve their consent. Open matches to continue.');}else setError(err instanceof ApiFailure&&err.code==='IDEA_LIMIT'?'Your five free idea slots are full. Open plans to preview Premium.':err instanceof Error?err.message:'Could not publish.');}finally{setBusy(false);}}
 const payload={...approvedBrief(brief),publishConsent:true};
 const identifier=identifyingDetails(brief.alias+' '+brief.approvedBlurb);
 const complete=brief.alias.trim()&&brief.offers.length&&brief.seeks.length&&brief.interests.length&&brief.approvedBlurb.trim()&&!identifier;
 return <section><p className="eyebrow">YOUR PRIVATE FOUNDER AGENT</p><h1>Your idea.<br/><em>Your terms.</em></h1><p className="lead">Find someone who brings what you need. Keep your name and the private story behind your idea out of the room.</p>
 <div className={styles.steps}><button aria-pressed={stage==='intake'} onClick={()=>setStage('intake')}>01 · Private context & fit</button><button aria-pressed={stage==='review'} onClick={()=>{if(running)cancelClassification();setStage('review');}}>02 · Review what leaves</button><Link href="/ideas">My ideas & plan →</Link></div>
 {stage==='intake'?<><div className="grid"><article><span className="badge">DEVICE ONLY · CLEARED ON REFRESH</span><h2>Tell your agent privately.</h2><p className="muted">Paste your own profile, not someone else’s. This text stays in tab memory. Laya runs inside this browser. Model files download to your device; your profile and idea are never sent to the room server or a hosted model.</p>
 <label>Your background or profile<textarea maxLength={5000} value={raw} onChange={e=>{setRaw(e.target.value);changePrivate();}} placeholder="What have you built? What do you know well?"/></label>
 <label>Your private idea<textarea maxLength={3000} value={profile.ambition} onChange={e=>{update({ambition:e.target.value});changePrivate();}} placeholder="What would you like to build, and for whom?"/></label>
 <label>What should your agent keep to itself?<textarea maxLength={2000} value={profile.conditions} onChange={e=>update({conditions:e.target.value})} placeholder="Employment plans, constraints, anything you don’t want in your brief. This field is not sent even to Laya."/></label>
 <button disabled={running||(!raw.trim()&&!profile.ambition.trim())} onClick={()=>void analyze()}>{running?'Loading / running browser Laya…':'Load browser Laya & suggest labels'}</button>{running&&<button className={styles.secondary} onClick={cancelClassification}>Cancel browser classification</button>}
 <p className="muted">First use downloads about 630 MB of public model/runtime files. Browser caching may avoid later downloads. No app installation is needed.</p>
 <p className={styles.notice} role="status">{message||'Choose local suggestions or enter every brief field manually. Your private text stays in this browser.'}</p><details><summary>What runs on my device?</summary><p className="muted">Laya uses a browser worker for local ONNX inference. Network requests download code and model files; your private input stays in browser memory. Cancel releases the worker. Suggested labels always require your review.</p></details>
 </article><article><p className="eyebrow">WHAT DOES A GOOD PARTNER LOOK LIKE?</p><h2>More than a matching stack.</h2><p className="muted">Choose the preferences you are comfortable publishing. These are your descriptions, not a model’s personality assessment.</p>
 <Choices label="My strengths" options={STRENGTHS} value={prefs.strengths} onChange={v=>preference('strengths',v)}/>
 <Choices label="I need a partner strong in…" options={STRENGTHS} value={prefs.partnerStrengths} onChange={v=>preference('partnerStrengths',v)}/>
 <Choices label="Tech I like working with" options={TECH_STACK} value={prefs.techStack} onChange={v=>preference('techStack',v)}/>
 <Choices label="How I like to work" options={WORK_STYLES} max={4} value={prefs.workStyles} onChange={v=>preference('workStyles',v)}/>
 <label>Time I can offer<select value={brief.availability} onChange={e=>edit({availability:e.target.value as CardInput['availability']})}><option value="exploring">Exploring</option><option value="weekends">Evenings & weekends</option><option value="full_time">Full-time</option></select></label>
 </article></div><button onClick={()=>{if(running)cancelClassification();setStage('review');}}>Review my public brief →</button></>:<div className="grid"><article><span className="badge">{classified?'LOCAL LABELS · REVIEW REQUIRED':'MANUAL BRIEF · NO MODEL CLAIM'}</span><h2>Shape the brief people see.</h2><p className="muted">Your name is never requested here. Keep employers, names and uniquely identifying project details out of this brief. Pseudonyms reduce disclosure; distinctive ideas can still identify you.</p>
 <label>Public alias<input maxLength={40} value={brief.alias} onChange={e=>edit({alias:e.target.value})}/></label>
 <MultiSelect legend="Skills I offer (up to 5)" suggestions={SKILLS} selected={brief.offers} onChange={v=>edit({offers:v.slice(0,5).map(x=>x.slice(0,40))})}/>
 <MultiSelect legend="Skills I want in a partner (up to 5)" suggestions={SKILLS} selected={brief.seeks} onChange={v=>edit({seeks:v.slice(0,5).map(x=>x.slice(0,40))})}/>
 <MultiSelect legend="Shared problem areas (up to 4)" suggestions={DOMAINS} selected={brief.interests} onChange={v=>edit({interests:v.slice(0,4).map(x=>x.slice(0,40))})} placeholder="Travel, AI, payments…"/>
 <button className={styles.secondary} onClick={()=>edit({approvedBlurb:suggestedIdea(brief.interests,brief.offers)})}>Use a broad idea template</button>
 <label>Public idea brief · {brief.approvedBlurb.length}/240<textarea maxLength={240} value={brief.approvedBlurb} onChange={e=>edit({approvedBlurb:e.target.value})} placeholder="Describe the problem and the partner you want, without your name or employer."/></label>
 {identifier&&<p role="alert">Remove contact details, links or long numbers from the public brief. You can share contact details after mutual approval.</p>}
 <button className={styles.secondary} onClick={()=>setStage('intake')}>← Edit strengths and preferences</button>
 </article><article><p className="eyebrow">EXACT PUBLIC PREVIEW</p><h2>{brief.alias||'Your alias'}</h2><p>{brief.approvedBlurb||'Write your approved idea brief.'}</p><dl><dt>Brings</dt><dd>{brief.offers.join(', ')||'Choose your skills'}</dd><dt>Needs</dt><dd>{brief.seeks.join(', ')||'Choose partner skills'}</dd><dt>Problem areas</dt><dd>{brief.interests.join(', ')||'Choose a shared direction'}</dd><dt>Strengths</dt><dd>{prefs.strengths.join(', ')||'Not shared'}</dd><dt>Partner strengths</dt><dd>{prefs.partnerStrengths.join(', ')||'Not shared'}</dd><dt>Stack</dt><dd>{prefs.techStack.join(', ')||'Not shared'}</dd><dt>Working style</dt><dd>{prefs.workStyles.join(', ')||'Not shared'}</dd><dt>Availability</dt><dd>{brief.availability.replaceAll('_',' ')}</dd></dl>
 <details><summary>Exact outgoing payload</summary><pre className={styles.payload}>{JSON.stringify(payload,null,2)}</pre></details><p className={styles.notice}>Shared with this room’s matcher and proposed counterparts. No private profile, private idea, constraints, name or contact is included. Matching uses rules; no cloud model is called.</p>
 <label>Room code<input maxLength={40} value={eventCode} onChange={e=>{setEventCode(e.target.value);setConsent(false);}}/></label><p className="muted">Existing sessions stay in their joined room. The code is used when creating a new session.</p>
 <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I approve publishing exactly this brief and its selected preferences for matching in my room.</label>
 <button disabled={!complete||!consent||busy||!eventCode.trim()} onClick={()=>void publish()}>{busy?'Publishing…':'Publish my approved brief →'}</button>
 {error&&<p role="alert">{error} <Link href="/plans">Plans →</Link> <Link href="/matches">Matches →</Link></p>}
 </article></div>}
 </section>;
}
