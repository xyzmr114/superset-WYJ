"use client";
import {useState} from 'react';
import {reviewPrompts,buildReviewAppendix,type ReviewAnswers,type ReviewAnswer} from './framework';
import styles from './pitch.module.css';
export default function FounderReview({onInsert,disabled}:{onInsert:(text:string)=>void;disabled:boolean}) {
  const [answers,setAnswers]=useState<ReviewAnswers>({});
  const [inserted,setInserted]=useState(false);
  function update(id:string,patch:Partial<ReviewAnswer>){setInserted(false);setAnswers(previous=>({...previous,[id]:{...(previous[id]??{note:'',status:'unknown'}),...patch}}));}
  const appendix=buildReviewAppendix(answers);
  return <details className={styles.review}>
    <summary><span>Prepare a solution memo</span><span className="badge">9 EVIDENCE QUESTIONS</span></summary>
    <p>Drawn from public super&#123;set&#125; writing, with separate general startup prompts. This is our preparation aid, not its official application or selection rubric.</p>
    <p className="muted">super&#123;set&#125; describes message testing as an experienced studio practice. A clear pitch or encouraging conversation does not establish product-market fit.</p>
    <p className={styles.notice}>Notes stay in this tab until you choose “Add notes to draft.” That copies them into the shared draft editor; saving then sends them to the server in connected mode. Include only information you intend both founders to review.</p>
    <div className={styles.promptGrid}>
      {reviewPrompts.map(prompt=>{const answer=answers[prompt.id]??{note:'',status:'unknown'};return <article key={prompt.id}>
        <span className="badge">{prompt.origin==='published'?'PUBLIC SUPER{SET} APPROACH':'GENERAL STARTUP PRACTICE'}</span>
        <h3>{prompt.title}</h3><p><strong>{prompt.question}</strong></p>
        <p className="muted">Evidence to collect: {prompt.evidence}</p>
        <label htmlFor={`status-${prompt.id}`}>Your evidence status</label>
        <select id={`status-${prompt.id}`} value={answer.status} onChange={e=>update(prompt.id,{status:e.target.value as ReviewAnswer['status']})}><option value="unknown">Unknown</option><option value="hypothesis">Hypothesis—not tested</option><option value="observed">Observed—self-reported</option></select>
        <label htmlFor={`note-${prompt.id}`}>Evidence or next question</label>
        <textarea id={`note-${prompt.id}`} value={answer.note} maxLength={3000} onChange={e=>update(prompt.id,{note:e.target.value})} placeholder="Describe what you know, its source, and what is still uncertain."/>
        <p className="muted">Next move: {prompt.nextStep}</p>
        {prompt.source&&<a className="secondary" href={prompt.source.url} target="_blank" rel="noreferrer">Read source ↗</a>}
      </article>})}
    </div>
    <button disabled={disabled||!appendix||inserted} onClick={()=>{onInsert(appendix);setInserted(true);}}>{inserted?'Added to draft—review before saving':'Add notes to draft'}</button>
    <p className="muted">Adding notes changes the draft. Save a new version and get both approvals before export. Completing questions is not proof of demand or likelihood of funding.</p>
  </details>;
}
