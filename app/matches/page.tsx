"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {usePrivateProfile,evaluateJump} from '@/lib/client/private-profile';
import {api,ApiFailure,fetchMatches,matchQueryKey} from '@/lib/client/api';
import type {IntroductionIdentity,MatchView,MatchingCard} from '@/lib/contracts';
import {hasPartnerFit} from '@/lib/matching';
import MatchCard from '@/components/matches/MatchCard';
import styles from '@/components/matches/matches.module.css';
type Filter='all'|'waiting'|'revealed'|'declined';
export default function Matches(){
 const {profile}=usePrivateProfile();const client=useQueryClient();const [filter,setFilter]=useState<Filter>('all');const [published,setPublished]=useState(false);const [selectedIdea,setSelectedIdea]=useState('all');
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const publishedId=params.get('published');const ideaId=publishedId??params.get('idea');setPublished(!!publishedId);if(ideaId)setSelectedIdea(ideaId);},[]);
 const ideas=useQuery({queryKey:['published-ideas-for-matches'],queryFn:async()=>{const r=await fetch('/api/me/ideas',{cache:'no-store'});if(!r.ok)return [] as MatchingCard[];return (await r.json()).ideas as MatchingCard[];}});
 const generated=useQuery({queryKey:['matches-generate'],queryFn:api.generateMatches,retry:false,staleTime:10000,refetchInterval:15000});
 const matches=useQuery({queryKey:matchQueryKey,queryFn:fetchMatches,enabled:generated.isSuccess,refetchInterval:3000,refetchIntervalInBackground:true});
 const decide=useMutation({mutationFn:({id,decision,identity}:{id:string;decision:'approve'|'decline'|'withdraw';identity?:IntroductionIdentity})=>api.consent(id,decision,identity),onSuccess:(updated)=>{client.setQueryData<MatchView[]>(matchQueryKey,old=>(old??[]).map(m=>m.id===updated.id?updated:m));void client.invalidateQueries({queryKey:matchQueryKey});}});
 const err=generated.error;
 if(err instanceof ApiFailure&&(err.status===401||err.code==='NO_CARD'))return <section className="narrow"><p className="eyebrow">YOUR FOUNDER MATCHES</p><h1>{err.status===401?'Create your founder profile.':'Start with your idea.'}</h1><p className="lead">Only your approved brief is used to find people worth meeting.</p><Link className="button" href={'/agent'}>{'Create my profile'} →</Link></section>;
 if(err&&!generated.data)return <section><h1>Couldn’t load your matches.</h1><p role="alert">{err.message}</p><button onClick={()=>void generated.refetch()}>Try again</button></section>;
 const list=(matches.data??generated.data?.matches??[]).filter(m=>!m.candidate.alias.startsWith('Synthetic · ')).filter(m=>m.status!=='suggested'||!m.myBrief||hasPartnerFit(m.myBrief,m.candidate));
 const relevant=list.filter(m=>selectedIdea==='all'||(m.myBrief?.ideaId??m.myBrief?.id)===selectedIdea);
 const shown=relevant.filter(m=>filter==='all'?m.status!=='declined':filter==='waiting'?m.status==='pending':m.status===filter);
 return <section className={styles.matchesPage}><div className={styles.pageHeading}><div><p className="eyebrow">YOUR FOUNDER NETWORK</p><h1>People to build with.</h1><p>Explore a profile. Show interest. Connect when you both say yes.</p></div><Link className={styles.quietLink} href="/ideas">My ideas →</Link></div>
  {published&&<div className={styles.published} role="status"><span>✓</span><div><strong>Your profile is live.</strong><p>We’re looking for founders who share your direction and bring what you need.</p></div><button onClick={()=>setPublished(false)} aria-label="Dismiss publication confirmation">×</button></div>}
  {(ideas.data?.length??0)>0&&<label className={styles.ideaFilter}>Finding people for<select value={selectedIdea} onChange={e=>setSelectedIdea(e.target.value)}><option value="all">All my ideas</option>{ideas.data?.map(idea=><option key={idea.ideaId??idea.id} value={idea.ideaId??idea.id}>{idea.approvedBlurb.slice(0,85)}</option>)}</select></label>}
  <div className={styles.toolbar}><div className={styles.filters}>{([['all','For you'],['waiting','Waiting'],['revealed','Introduced'],['declined','Passed']] as const).map(([value,label])=><button className={filter===value?styles.selected:styles.quiet} key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{label} · {relevant.filter(m=>value==='all'?m.status!=='declined':value==='waiting'?m.status==='pending':m.status===value).length}</button>)}</div><button className={styles.quiet} disabled={generated.isFetching} onClick={()=>{void generated.refetch();void matches.refetch();}}>{generated.isFetching?'Checking…':'Refresh matches'}</button></div>
  {(matches.isError||decide.isError)&&<p role="alert" className={styles.error}>{decide.error?.message??matches.error?.message}</p>}
  {generated.isPending?<p role="status">Finding complementary briefs…</p>:!shown.length?<article><h2>{filter==='all'?'Looking for your first match.':'No profiles here yet.'}</h2><p>We’ll check for new founders automatically. You can explore another idea while we look.</p><Link href="/agent">Add another idea →</Link></article>:<div className={styles.matchGrid}>{shown.map(match=><MatchCard key={match.id} match={match} checklist={evaluateJump(profile,match.opportunity)} busy={decide.isPending&&decide.variables?.id===match.id} onRequestIntro={identity=>decide.mutate({id:match.id,decision:'approve',identity})} onDecline={()=>decide.mutate({id:match.id,decision:'decline'})} onWithdraw={()=>decide.mutate({id:match.id,decision:'withdraw'})} pitchHref={'/pitch?matchId='+encodeURIComponent(match.id)}/>)}</div>}
  <p className="muted">Your name and contact stay hidden until you both approve an introduction.</p>
 </section>;
}
