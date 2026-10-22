'use client';
import Link from 'next/link';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import styles from '@/components/plans/plans.module.css';

type Plan='free'|'premium';
type AccountPlan={plan:Plan;ideaCount:number;ideaLimit:number|null;billingConnected:false};
class PlanError extends Error{constructor(message:string,public status:number){super(message);}}
async function loadPlan(plan?:Plan):Promise<AccountPlan>{
 const response=await fetch('/api/me/plan',{method:plan?'POST':'GET',cache:'no-store',...(plan?{headers:{'Content-Type':'application/json'},body:JSON.stringify({plan})}:{})});
 const body=await response.json();if(!response.ok)throw new PlanError(body.error?.message??'Could not update your plan.',response.status);return body;
}
const freeFeatures=['Up to 5 published ideas','Unlimited founder matches','On-device idea improvements','Reviewed pseudonymous briefs','Mutual approval before identity reveal','Working trials with independent approvals'];
const premiumFeatures=['Unlimited published ideas','Idea refinement tools','Structured solution memos','Pitch planning and a clearer next step','All Free matching and consent features'];
export default function Plans(){
 const client=useQueryClient();const query=useQuery({queryKey:['account-plan'],queryFn:()=>loadPlan(),retry:false});
 const mutation=useMutation({mutationFn:loadPlan,onSuccess:result=>{client.setQueryData(['account-plan'],result);void client.invalidateQueries({queryKey:['ideas']});}});
 const account=query.data;const error=mutation.error??query.error;const needsJoin=error instanceof PlanError&&error.status===401;
 return <section className={styles.page}>
  <div className={styles.heading}><p className="eyebrow">ROOM TO FIND YOUR NEXT CHAPTER</p><h1>Find your person.<br/><em>Build your next step.</em></h1><p className="lead">Start with a few ideas and people worth meeting. Explore Premium when you want help turning a possibility into a plan.</p></div>
  {account&&<div className={styles.account}><span><strong>{account.plan==='premium'?'Premium preview':'Free plan'}</strong> · {account.ideaCount} published {account.ideaCount===1?'idea':'ideas'}{account.ideaLimit!==null?` of ${account.ideaLimit}`:''}</span><Link href={account.plan==='premium'?'/premium':'/ideas'}>{account.plan==='premium'?'Open planning tools':'Manage my ideas'} ↗</Link></div>}
  {query.isPending&&<p role="status" className="muted">Checking your current plan…</p>}
  {error&&!needsJoin&&<p role="alert" className={styles.notice}>{error.message} {query.isError&&<button className={styles.retry} onClick={()=>void query.refetch()}>Try again</button>}</p>}
  {needsJoin&&<div className={styles.notice}><p>Create your founder profile to choose a plan and keep your ideas together.</p><Link className="button" href="/agent">Create my profile →</Link></div>}
  {mutation.isSuccess&&<p role="status" className={styles.success}>{mutation.data.plan==='premium'?'Premium preview is enabled. Your planning tools are ready.':'You’re on Free. Your founder matches and introductions remain available.'}</p>}
  <div className={styles.cards}>
   <article className={styles.free}><div className={styles.cardTop}><span className="eyebrow">A PLACE TO BEGIN</span>{account?.plan==='free'&&<span className="badge">Current plan</span>}</div><h2>Free</h2><p className={styles.description}>Explore what you want to build—and who could build it with you.</p><p className={styles.allowance}>5 <span>published ideas</span></p><ul className={styles.features}>{freeFeatures.map(feature=><li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul><div className={styles.bottom}>{needsJoin?<Link className="button" href="/agent">Start with Free →</Link>:<button disabled={!account||mutation.isPending||account.plan==='free'} onClick={()=>mutation.mutate('free')}>{mutation.isPending&&mutation.variables==='free'?'Updating…':account?.plan==='free'?'You’re on Free':'Choose Free'}</button>}<p className="muted">Matching and mutual consent are included.</p></div></article>
   <article className={styles.premium}><div className={styles.cardTop}><span className="eyebrow">FROM POSSIBILITY TO A PLAN</span>{account?.plan==='premium'&&<span className="badge">Preview active</span>}</div><h2>Premium</h2><p className={styles.description}>Give promising ideas a sharper problem, a useful memo and a path forward.</p><p className={styles.allowance}>Unlimited <span>ideas</span></p><ul className={styles.features}>{premiumFeatures.map(feature=><li key={feature}><span aria-hidden="true">↗</span>{feature}</li>)}</ul><div className={styles.bottom}>{needsJoin?<Link className="button" href="/agent">Join to preview Premium →</Link>:<button disabled={!account||mutation.isPending||account.plan==='premium'} onClick={()=>mutation.mutate('premium')}>{mutation.isPending&&mutation.variables==='premium'?'Enabling preview…':account?.plan==='premium'?'Premium preview active':'Preview Premium →'}</button>}<p className="muted">Billing is not connected. This preview does not charge you.</p></div></article>
  </div>
  <div className={styles.footer}><div><p className="eyebrow">THE SAME CONSENT, ON EVERY PLAN</p><h3>Your identity is always your decision.</h3><p>Premium does not change what you publish or who can see your contact details. Each founder still approves the exact brief and each introduction separately.</p></div><Link className="secondary" href="/matches">Explore my matches →</Link></div>
 </section>;
}
