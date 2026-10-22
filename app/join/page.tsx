'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/client/api';
import {useQueryClient} from '@tanstack/react-query';
export default function Join(){const router=useRouter(),client=useQueryClient();const [busy,setBusy]=useState(false),[error,setError]=useState('');async function start(){setBusy(true);try{await api.createSession();client.clear();router.push('/agent');}catch(e){setError(e instanceof Error?e.message:'Could not start.');setBusy(false);}}return <section className="narrow"><p className="eyebrow">FIND YOUR COFOUNDER</p><h1>Start with an idea.<br/><em>Find your people.</em></h1><p className="lead">Build a profile, choose what you need in a partner, and connect when you both say yes.</p><button disabled={busy} onClick={()=>void start()}>{busy?'Starting…':'Create my founder profile →'}</button>{error&&<p role="alert">{error}</p>}</section>;}
