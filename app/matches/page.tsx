"use client";
import {useState} from 'react';
import Link from 'next/link';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {usePrivateProfile,evaluateJump} from '@/lib/client/private-profile';
import {api,ApiFailure,fetchMatches,matchQueryKey} from '@/lib/client/api';
import type {IntroductionIdentity,MatchView} from '@/lib/contracts';
import MatchCard from '@/components/matches/MatchCard';
import styles from '@/components/matches/matches.module.css';
type Filter='all'|'waiting'|'revealed'|'declined';
export default function Matches(){
 const {profile}=usePrivateProfile();const client=useQueryClient();const [filter,setFilter]=useState<Filter>('all');
 const generated=useQuery({queryKey:['matches-generate'],queryFn:api.generateMatches,retry:false,staleTime:10000,refetchInterval:15000});
 const matches=useQuery({queryKey:matchQueryKey,queryFn:fetchMatches,enabled:generated.isSuccess,refetchInterval:3000,refetchIntervalInBackground:true});
 const decide=useMutation({mutationFn:({id,decision,identity}:{id:string;decision:'approve'|'decline'|'withdraw';identity?:IntroductionIdentity})=>api.consent(id,decision,identity),onSuccess:(updated)=>{client.setQueryData<MatchView[]>(matchQueryKey,old=>(old??[]).map(m=>m.id===updated.id?updated:m));void client.invalidateQueries({queryKey:matchQueryKey});}});
 const err=generated.error;
 if(err instanceof ApiFailure&&(err.status===401||err.code==='NO_CARD'))return <section className="narrow"><p className="eyebrow">YOUR FOUNDER MATCHES</p><h1>{err.status===401?'Join your room.':'Start with your brief.'}</h1><p className="lead">Only your approved brief is used to find people worth meeting.</p><Link className="button" href={err.status===401?'/join':'/onboarding'}>{err.status===401?'Join the room':'Review my brief'} →</Link></section>;
 if(err&&!generated.data)return <section><h1>Couldn’t load your matches.</h1><p role="alert">{err.message}</p><button onClick={()=>void generated.refetch()}>Try again</button></section>;
 const list=(matches.data??generated.data?.matches??[]).filter(m=>!m.candidate.alias.startsWith('Synthetic · '));
 const shown=list.filter(m=>filter==='all'?m.status!=='declined':filter==='waiting'?m.status==='pending':m.status===filter);
 return <section><p className="eyebrow">PRIVATE FOUNDER MATCHMAKING</p><h1>A shared idea.<br/><em>A separate yes.</em></h1><p className="lead">Your agent found a reason to meet. Explore their approved brief, then decide what you want to share.</p>
  <div className={styles.boundary}><strong>Shared here: approved briefs.</strong><span>Private profile text and personal constraints stay on their owner’s device. Contacts unlock only after two approvals.</span></div>
  <div className={styles.toolbar}><div className={styles.filters}>{([['all','For you'],['waiting','Waiting'],['revealed','Introduced'],['declined','Passed']] as const).map(([value,label])=><button className={filter===value?styles.selected:styles.quiet} key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{label} · {list.filter(m=>value==='all'?m.status!=='declined':value==='waiting'?m.status==='pending':m.status===value).length}</button>)}</div><button className={styles.quiet} disabled={generated.isFetching} onClick={()=>{void generated.refetch();void matches.refetch();}}>{generated.isFetching?'Checking…':'Refresh matches'}</button></div>
  {(matches.isError||decide.isError)&&<p role="alert" className={styles.error}>{decide.error?.message??matches.error?.message}</p>}
  {generated.isPending?<p role="status">Finding complementary briefs…</p>:!shown.length?<article><h2>{filter==='all'?'Your next person may still be joining.':'Nothing here yet.'}</h2><p>Matches update as people publish their briefs. Invite your teammates into the same room.</p><Link href="/onboarding">Review my brief →</Link></article>:<div className={styles.matchGrid}>{shown.map(match=><MatchCard key={match.id} match={match} checklist={evaluateJump(profile,match.opportunity)} busy={decide.isPending&&decide.variables?.id===match.id} onRequestIntro={identity=>decide.mutate({id:match.id,decision:'approve',identity})} onDecline={()=>decide.mutate({id:match.id,decision:'decline'})} onWithdraw={()=>decide.mutate({id:match.id,decision:'withdraw'})} pitchHref={'/pitch?matchId='+encodeURIComponent(match.id)}/>)}</div>}
  <div className="actions"><Link className="secondary" href="/agent">My private workspace →</Link><Link className="secondary" href="/onboarding">My approved brief →</Link></div>
 </section>;
}
