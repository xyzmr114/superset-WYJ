import type {MatchingCard} from '@/lib/contracts';
import styles from './founder.module.css';
export const label=(text:string)=>({'ai-agents':'AI agents','developer-tools':'Developer tools','full_time':'Full-time','weekends':'Evenings & weekends','exploring':'Exploring','technical depth':'Technical depth'}[text]??text.charAt(0).toUpperCase()+text.slice(1));
type Profile=Pick<MatchingCard,'alias'|'offers'|'seeks'|'interests'|'approvedBlurb'|'availability'|'preferences'>;
export default function FounderProfile({profile,preview=false,flat=false}:{profile:Profile;preview?:boolean;flat?:boolean}){
 const p=profile.preferences;
 return <div className={`${styles.profile} ${flat?styles.flat:''}`} aria-label={preview?'Live founder profile preview':'Founder profile'}>
  <div className={styles.cover}><span>{preview?'YOUR PROFILE PREVIEW':'FOUNDER NETWORK'}</span><span className={styles.private}>Identity hidden</span></div>
  <div className={styles.body}><div className={styles.avatar} aria-hidden>{profile.alias.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'F'}</div>
   <h2 className={styles.name}>{profile.alias||'Your founder profile'}</h2><p className={styles.headline}>{profile.offers.length?profile.offers.map(label).join(' · '):'Choose what you bring'}</p>
   <p className={styles.availability}><span/> {label(profile.availability)}</p>
   <div className={styles.section}><h3>Building</h3><p className={styles.idea}>{profile.approvedBlurb||'Your idea will appear here as you write it.'}</p><div className={styles.tags}>{profile.interests.map(t=><span key={t}>{label(t)}</span>)}</div></div>
   <div className={styles.section}><h3>Looking for a partner with</h3><div className={styles.tags}>{profile.seeks.length?profile.seeks.map(t=><span className={styles.need} key={t}>{label(t)}</span>):<p className={styles.placeholder}>Choose what you need in a partner</p>}</div></div>
   {(p?.strengths.length||p?.techStack.length||p?.workStyles.length)?<div className={styles.section}>{p.strengths.length>0&&<p className={styles.detail}><b>Strengths</b>{p.strengths.map(label).join(' · ')}</p>}{p.techStack.length>0&&<p className={styles.detail}><b>Stack</b>{p.techStack.join(' · ')}</p>}{p.workStyles.length>0&&<p className={styles.detail}><b>Working style</b>{p.workStyles.map(label).join(' · ')}</p>}</div>:null}
  </div>
 </div>;
}
