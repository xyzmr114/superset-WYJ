"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/client/api';
export default function Join(){const router=useRouter();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
// QR codes point at /join?code=EVENT; read it at click time so the page stays static.
const join=async()=>{setBusy(true);setError('');try{const code=new URLSearchParams(window.location.search).get('code') ?? 'SUPERSET';await api.createSession(code);router.push('/onboarding');}catch(e){setError(e instanceof Error?e.message:'Could not join.');setBusy(false);}};
return <section className="narrow"><p className="eyebrow">FIND YOUR PEOPLE</p><h1>Meet your<br/>next possibility.</h1><p className="lead">Start with what you bring, what you need, and the problems you want to solve.</p><article><h3>Your ambition. Your terms.</h3><p>Joining creates an anonymous session on this device. No account, no name yet. Keep personal conditions to yourself and choose what to share for matching.</p><button onClick={join} disabled={busy}>{busy?'Joining…':'Join the event →'}</button>{error&&<p className="muted" role="alert">{error}</p>}</article></section>;}
