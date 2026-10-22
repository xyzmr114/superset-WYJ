"use client";
import {useState} from 'react';
import Link from 'next/link';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import type {MatchView} from '@/lib/contracts';
import {api,ApiFailure,fetchMatches,matchQueryKey} from '@/lib/client/api';

function MatchCard({m}:{m:MatchView}){const client=useQueryClient();const [error,setError]=useState('');
const decide=useMutation({mutationFn:(d:'approve'|'decline')=>api.consent(m.id,d),onSuccess:()=>client.invalidateQueries({queryKey:matchQueryKey}),onError:e=>setError(e.message)});
const synthetic=m.candidate.alias.startsWith('Synthetic');const o=m.opportunity;
return <article><span className="badge">{m.score}/100 FIT · A HEURISTIC, NOT A PREDICTION</span>{synthetic&&<> <span className="badge">SYNTHETIC EXAMPLE</span></>}<h2>{m.candidate.alias}</h2><p>{m.candidate.approvedBlurb}</p><p><strong>Offers:</strong> {m.candidate.offers.join(', ')}<br/><strong>Seeks:</strong> {m.candidate.seeks.join(', ')}<br/><strong>Available:</strong> {m.candidate.availability.replace('_',' ')}</p><hr/><h3>{o.title}</h3><p>{o.problemHypothesis}</p>
{m.evidence.length>0?<><p className="muted"><strong>Public evidence (GitHub{m.evidence.some(e=>e.cached)?', cached':''}):</strong></p><ul className="muted">{m.evidence.map(e=><li key={e.id}><a href={e.url} target="_blank" rel="noreferrer">{e.title}</a>{e.excerpt&&` — ${e.excerpt}`}</li>)}</ul><p className="muted">Related projects exist; that is not proof anyone will pay.</p></>:<p className="muted">Template idea · no live public evidence attached.</p>}
<p className="muted"><strong>Unknowns:</strong> {o.unknowns.join(' · ')}<br/><strong>Next:</strong> {o.nextExperiment}</p><hr/>
{m.status==='suggested'&&<div className="actions"><button disabled={decide.isPending} onClick={()=>decide.mutate('approve')}>Request introduction</button><button className="secondary" style={{background:'transparent',color:'inherit'}} disabled={decide.isPending} onClick={()=>decide.mutate('decline')}>Not for me</button></div>}
{m.status==='pending'&&(m.myIntroApproval?<><p><strong>Waiting for the other person.</strong></p><p className="muted">{synthetic?'Synthetic examples never respond. Try a real person in the room.':'Names stay hidden until they approve too.'}</p><button className="secondary" style={{background:'transparent',color:'inherit',padding:0}} onClick={()=>decide.mutate('decline')}>Withdraw</button></>:<><p><strong>They'd like an introduction.</strong></p><div className="actions"><button disabled={decide.isPending} onClick={()=>decide.mutate('approve')}>Approve introduction</button><button className="secondary" style={{background:'transparent',color:'inherit'}} disabled={decide.isPending} onClick={()=>decide.mutate('decline')}>Decline</button></div></>)}
{m.status==='revealed'&&m.revealedContact&&<><span className="badge">YOU BOTH SAID YES</span><h3>{m.revealedContact.displayName}</h3><p>{m.revealedContact.contact}</p><p className="muted">What you've both seen can't be unseen; there's no taking it back from each other.</p><Link className="button" href={`/pitch?matchId=${encodeURIComponent(m.id)}`}>Shape a joint pitch →</Link></>}
{m.status==='declined'&&<p className="muted">Introduction closed. No names were shared.</p>}
{error&&<p className="muted" role="alert">{error}</p>}</article>;}

export default function Matches(){
 // Generate once (idempotent on the server), then poll so the other person's approval shows up.
 const generated=useQuery({queryKey:['matches-generate'],queryFn:api.generateMatches,retry:false,staleTime:Infinity});
 const matches=useQuery({queryKey:matchQueryKey,queryFn:fetchMatches,enabled:generated.isSuccess,refetchInterval:3000});
 const err=generated.error;
 if(err instanceof ApiFailure&&err.status===401)return <section className="narrow"><h1>Join first.</h1><p>Your session isn't active on this device.</p><Link className="button" href="/join">Join the event →</Link></section>;
 if(err instanceof ApiFailure&&err.code==='NO_CARD')return <section className="narrow"><h1>Start with your card.</h1><p>Publish a card to find potential collaborators.</p><Link className="button" href="/onboarding">Create a card →</Link></section>;
 if(err)return <section className="narrow"><h1>Matching hit a snag.</h1><p className="muted">{err.message}</p><button onClick={()=>generated.refetch()}>Try again</button></section>;
 const list=matches.data ?? generated.data?.matches ?? [];
 return <section><p className="eyebrow">STEP 02 / POSSIBLE COUNTERPARTS</p><h1>A different skill set.<br/><em>A shared direction.</em></h1><p className="lead">Everyone here is anonymous. Names appear only when both of you approve an introduction.</p>
 {generated.isPending?<p className="muted">Finding counterparts…</p>:<div className="grid three">{list.map(m=><MatchCard key={m.id} m={m}/>)}</div>}
 {!generated.isPending&&list.length===0&&<article><h2>No counterparts in this area yet.</h2><p>That's a valid result. Check back as more people join.</p><button onClick={()=>generated.refetch()}>Check again</button></article>}
 <div className="actions"><Link className="secondary" href="/onboarding">Back to your card</Link></div></section>}
