import type {ReactNode} from 'react';
import type {MatchingCard} from '@/lib/contracts';
import styles from './founder.module.css';
export const label=(text:string)=>({'ai-agents':'AI agents','developer-tools':'Developer tools','full_time':'Full-time','weekends':'Evenings & weekends','exploring':'Exploring','technical depth':'Technical depth'}[text]??text.charAt(0).toUpperCase()+text.slice(1));
type Profile=Pick<MatchingCard,'alias'|'offers'|'seeks'|'interests'|'approvedBlurb'|'availability'|'preferences'>;

// A founder brief laid out like a document: what the room sees, field by field.
// The name line is drawn redacted because identity is never part of the brief.
export default function FounderProfile({profile,preview=false,flat=false,isSavedCopy=false}:{profile:Profile;preview?:boolean;flat?:boolean;isSavedCopy?:boolean}){
 const p=profile.preferences;
 const empty=(text:string)=><span className={styles.placeholder}>{text}</span>;
 const row=(name:string,value:ReactNode)=><div className={styles.row}><dt>{name}</dt><dd>{value}</dd></div>;
 return <article className={`${styles.profile} ${flat?styles.flat:''}`} aria-label={preview?'Founder brief preview':'Founder brief'}>
  <div className={styles.head}><span>{preview?(isSavedCopy?'Saved brief copy':'Brief · preview'):'Founder brief'}</span><span>{preview?(isSavedCopy?'Manage in My ideas':'Not published'):'Pseudonymous'}</span></div>
  <h2 className={styles.name}>{profile.alias||'Your alias'}</h2>
  <p className={styles.sealed}><span className={styles.redact} aria-hidden/>Selected name and contact shared only after mutual approval</p>
  <dl className={styles.fields}>
   {row('Building',profile.approvedBlurb?<span className={styles.idea}>{profile.approvedBlurb}</span>:empty('Your idea appears here as you write it.'))}
   {row('Offers',profile.offers.length?<span className={styles.tags}>{profile.offers.map(t=><span key={t}>{label(t)}</span>)}</span>:empty('What you bring'))}
   {row('Seeks',profile.seeks.length?<span className={styles.tags}>{profile.seeks.map(t=><span className={styles.need} key={t}>{label(t)}</span>)}</span>:empty('What you need in a partner'))}
   {profile.interests.length>0&&row('Topics',profile.interests.map(label).join(', '))}
   {row('Time',label(profile.availability))}
   {p?.strengths.length?row('Strengths',p.strengths.map(label).join(', ')):null}
   {p?.techStack.length?row('Stack',p.techStack.join(', ')):null}
   {p?.workStyles.length?row('Style',p.workStyles.map(label).join(', ')):null}
  </dl>
 </article>;
}
