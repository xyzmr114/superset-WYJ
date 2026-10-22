"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {MatchView,IntroductionIdentity} from '@/lib/contracts';
import type {CheckItem} from '@/lib/client/private-profile';
import JumpChecklist from './JumpChecklist';
import WorkingTrial from './WorkingTrial';
import EvidenceList from './EvidenceList';
import styles from './matches.module.css';

export default function MatchCard({match,checklist,onRequestIntro,onDecline,onWithdraw,pitchHref,busy=false}:{match:MatchView;checklist:CheckItem[];onRequestIntro:(identity:IntroductionIdentity)=>void;onDecline:()=>void;onWithdraw:()=>void;pitchHref?:string;busy?:boolean}){
 const {candidate,opportunity,evidence,status,revealedContact}=match;
 const [review,setReview]=useState(false);const [name,setName]=useState('');const [contact,setContact]=useState('');const [approved,setApproved]=useState(false);const [copied,setCopied]=useState(false);
 useEffect(()=>{if(match.myIntroApproval||status==='declined'){setReview(false);setName('');setContact('');setApproved(false);}},[match.myIntroApproval,status]);
 const title=status==='revealed'?'You both said yes':status==='declined'?'Passed':match.myIntroApproval?'Waiting for their yes':match.theirIntroApproval?'They’re interested':'Worth a conversation?';
 async function copyAgenda(){await navigator.clipboard.writeText(`A 15-minute founder introduction\n\n1. What are we each trying to build?\n2. Where do our skills complement each other?\n3. What can we try together in 48 hours?\n\nSuggested experiment: ${opportunity.nextExperiment}`);setCopied(true);}
 return <article className={styles.matchCard}>
  <div className={styles.cardHeader}><span className="badge">{title}</span><span className="muted">Brief v{candidate.version}</span></div>
  <p className="eyebrow">APPROVED FOUNDER BRIEF</p>{match.myBrief&&<p className="muted">For your idea: {match.myBrief.approvedBlurb}</p>}<h2>{candidate.alias}</h2><p className={styles.blurb}>{candidate.approvedBlurb}</p>
  <div className={styles.tags}>{candidate.interests.map(tag=><span key={tag}>{tag}</span>)}</div>
  <div className={styles.skills}><span><b>Brings</b>{candidate.offers.join(', ')}</span><span><b>Looking for</b>{candidate.seeks.join(', ')}</span><span><b>Time</b>{candidate.availability.replaceAll('_',' ')}</span></div>
  {candidate.preferences&&<details className={styles.details}><summary>Approved strengths & working preferences</summary><p><strong>Strengths:</strong> {candidate.preferences.strengths.join(', ')||'Not shared'}<br/><strong>Wants a partner with:</strong> {candidate.preferences.partnerStrengths.join(', ')||'Not shared'}<br/><strong>Stack:</strong> {candidate.preferences.techStack.join(', ')||'Not shared'}<br/><strong>Works best with:</strong> {candidate.preferences.workStyles.join(', ')||'Not shared'}</p></details>}
  <div className={styles.block}><h4>WHY MEET?</h4><ul className={styles.list}>{opportunity.whyThisPair.map((reason,i)=><li key={i}>{reason}</li>)}</ul></div>
  <ol className={styles.consentSteps} aria-label="Introduction consent status"><li>✓ Brief shared</li><li>{match.myIntroApproval?'✓':'○'} Your approval</li><li>{match.theirIntroApproval?'✓':'○'} Their approval</li></ol>
  {status!=='revealed'&&status!=='declined'&&<p className="muted">Names and contact details stay outside this match response until both of you approve.</p>}
  {status==='pending'&&!match.myIntroApproval&&<p className={styles.waiting}>They would like to meet you. You decide whether to share your details for this introduction.</p>}
  {(status==='suggested'||status==='pending'&&!match.myIntroApproval)&&!review&&<div className={styles.cardActions}><button disabled={busy} onClick={()=>setReview(true)}>Interested · review introduction →</button><button disabled={busy} className={styles.declineBtn} onClick={onDecline}>Pass</button></div>}
  {review&&!match.myIntroApproval&&status!=='declined'&&<form className={styles.consentReview} onSubmit={e=>{e.preventDefault();if(approved&&name.trim()&&contact.trim())onRequestIntro({displayName:name.trim(),contact:contact.trim()});}}>
   <p className="eyebrow">THIS INTRODUCTION ONLY</p><h3>Choose what {candidate.alias} can see.</h3>
   <label htmlFor={'intro-name-'+match.id}>Name to reveal<input id={'intro-name-'+match.id} value={name} maxLength={80} autoComplete="off" required disabled={busy} onChange={e=>{setName(e.target.value);setApproved(false);}}/></label>
   <label htmlFor={'intro-contact-'+match.id}>Contact to reveal<input id={'intro-contact-'+match.id} value={contact} maxLength={200} autoComplete="off" required disabled={busy} placeholder="An email, LinkedIn URL or contact you choose" onChange={e=>{setContact(e.target.value);setApproved(false);}}/></label>
   <div className={styles.exactPreview}><strong>Exact details for this pairing</strong><p>{name.trim()||'Your chosen name'}<br/>{contact.trim()||'Your chosen contact'}</p><small>Recipient: {candidate.alias} · brief v{candidate.version}</small></div>
   <label className="check"><input type="checkbox" checked={approved} disabled={busy} onChange={e=>setApproved(e.target.checked)}/>I approve revealing these exact details to {candidate.alias}, only if they approve this introduction too.</label>
   <div className={styles.cardActions}><button disabled={busy||!approved||!name.trim()||!contact.trim()}>{busy?'Saving approval…':'Approve these details for this intro'}</button><button type="button" className={styles.quiet} disabled={busy} onClick={()=>{setReview(false);setName('');setContact('');setApproved(false);}}>Cancel</button></div>
  </form>}
  {status==='pending'&&match.myIntroApproval&&<div className={styles.waiting}><strong>Your approval is saved. Their details are still hidden.</strong><p>You can withdraw before they approve. Nothing has been sent outside WYJ.</p><button className={styles.quiet} disabled={busy} onClick={onWithdraw}>Withdraw my approval</button></div>}
  {match.myConsent&&<details className={styles.details}><summary>Your consent receipt</summary><p className="muted">Scope: this pairing only · your brief v{match.myConsent.briefVersion}<br/>Fields: name and contact<br/>Approved: {new Date(match.myConsent.approvedAt).toLocaleString()}</p></details>}
  {status==='revealed'&&revealedContact&&<div className={styles.revealed}><p className="eyebrow">MUTUAL INTRODUCTION</p><h3>{revealedContact.displayName}</h3><p className={styles.contact}>{revealedContact.contact}</p><p className="muted">These are the details they selected for this pairing. Your private goals remain on your device.</p><h4>Start with 15 minutes.</h4><p>Compare what you want to build, what each of you brings, and one experiment to try together.</p><div className={styles.cardActions}><button className={styles.quiet} onClick={()=>void copyAgenda().catch(()=>setCopied(false))}>{copied?'Agenda copied':'Copy intro agenda'}</button>{pitchHref&&<Link className="button" href={pitchHref}>Build a joint pitch →</Link>}</div><p className="muted">Arrange the meeting together. WYJ has not sent a message or booked a meeting.</p></div>}
  {status==='revealed'&&<WorkingTrial matchId={match.id}/> }
  {status==='declined'&&<p className={styles.declined}>This pairing is closed. No new identity details will be shared.</p>}
  <details className={styles.details}><summary>A first experiment and public evidence</summary><h4>{opportunity.title}</h4><p>{opportunity.problemHypothesis}</p><p>{opportunity.nextExperiment}</p><EvidenceList evidence={evidence}/>{opportunity.unknowns.length>0&&<><h4>Questions to explore</h4><ul className={styles.list}>{opportunity.unknowns.map((unknown,i)=><li key={i}>{unknown}</li>)}</ul></>}</details>
  <details className={styles.details}><summary>My private fit checklist · stays on this device</summary><JumpChecklist items={checklist}/></details>
 </article>;
}
