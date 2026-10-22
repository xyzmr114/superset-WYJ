import {Suspense} from 'react';
import PrivateWorkspace from '@/components/private/PrivateWorkspace';
export default function AgentPage(){return <Suspense fallback={<p>Opening your workspace…</p>}><PrivateWorkspace/></Suspense>;}
