'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import FounderProfile from '@/components/founders/FounderProfile';
import type {MatchingCard} from '@/lib/contracts';
type SavedIdea=MatchingCard&{publicationStatus:'published'|'unpublished'};
async function load(){
 const [ideas,plan]=await Promise.all([fetch('/api/me/ideas',{cache:'no-store'}),fetch('/api/me/plan',{cache:'no-store'})]);
 if(ideas.status===401||plan.status===401)throw new Error('Create your profile to start finding founders.');
 if(!ideas.ok||!plan.ok)throw new Error('Could not load your ideas.');
 return {ideas:(await ideas.json()).ideas as SavedIdea[],plan:await plan.json() as {plan:'free'|'premium';ideaCount:number;ideaLimit:number|null}};
}
export default function Ideas(){
 const query=useQuery({queryKey:['ideas'],queryFn:load}),client=useQueryClient();
 const [review,setReview]=useState<string|null>(null),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function changePublication(idea:SavedIdea){
  const id=idea.ideaId??'legacy',published=idea.publicationStatus==='unpublished';
  setBusy(id);setError('');setNotice('');
  try{
   const response=await fetch('/api/me/ideas/'+encodeURIComponent(id),{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({published})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error?.message??'Could not update publication.');
   setReview(null);setNotice(published?'Your exact approved brief is published again.':'Idea unpublished. Pending introductions are cancelled.');
   await client.invalidateQueries();
  }catch(e){setError(e instanceof Error?e.message:'Could not update publication.');}finally{setBusy(null);}
 }
 return <section><p className="eyebrow">YOUR APPROVED IDEAS</p><h1 style={{fontSize:44,letterSpacing:-1.4}}>Your ideas.<br/><em>Your next chapter.</em></h1>
 <p className="lead">Control which briefs are available for matching. Unpublished ideas stay here so you can publish them again.</p>
 {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 {query.isPending?<p>Loading ideas…</p>:query.error?<article><p role="alert">{query.error.message}</p><Link href="/agent">Create my profile →</Link><button onClick={()=>void query.refetch()}>Retry</button></article>:query.data&&<>
 <p className="badge">{query.data.plan.plan==='premium'?'Premium preview':`Free · ${query.data.plan.ideaCount}/5 published ideas`} · Unlimited founder matches</p>
 <div className="actions">{(query.data.plan.ideaLimit===null||query.data.plan.ideaCount<query.data.plan.ideaLimit)?<Link className="button" href="/agent?new=1">Add an idea →</Link>:<Link className="button" href="/plans">Five ideas published · Explore Premium →</Link>}<Link href="/matches">View founder matches</Link><Link href="/plans">Compare plans</Link></div>
 <div className="grid">{query.data.ideas.map(idea=>{
  const id=idea.ideaId??'legacy',published=idea.publicationStatus!=='unpublished';
  return <article style={{padding:0,overflow:'hidden'}} key={id}><FounderProfile profile={idea}/><div style={{padding:'18px 22px'}}>
   <p className="badge">{published?'Published · available for matching':'Unpublished · hidden from new matches'}</p>
   {published&&<p><Link href={'/matches?idea='+encodeURIComponent(id)}>Find founders for this idea →</Link></p>}
   {query.data.plan.plan==='premium'&&published&&<p><Link href="/premium">Refine in idea studio →</Link></p>}
   {review===id?<div aria-label={published?'Confirm unpublish':'Confirm republish'}>
    <p>{published?'Stop new matching and cancel pending introductions for this idea? People who already received your contact details keep them. Your brief, consent receipts and shared pitches remain saved.':'Publish this exact saved brief again? It becomes available to other founders for matching. Previously cancelled introductions stay cancelled.'}</p>
    <div className="actions"><button disabled={busy===id} onClick={()=>void changePublication(idea)}>{busy===id?'Saving…':published?'Confirm unpublish':'Publish this exact brief'}</button><button disabled={busy===id} onClick={()=>setReview(null)}>Cancel</button></div>
   </div>:<button onClick={()=>{setReview(id);setError('');setNotice('');}}>{published?'Unpublish idea':'Review & republish'}</button>}
  </div></article>;
 })}</div>
 {!query.data.ideas.length&&<article><h2>Your first idea starts privately.</h2><p>Describe the idea, then choose the exact brief you want other founders to see.</p><Link href="/agent">Start with a private idea →</Link></article>}</>}
 </section>;
}
